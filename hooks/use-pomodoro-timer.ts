import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { AppState } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";

import { readNativePomodoroSnapshot } from "@/lib/pomodoro-notifications";

export type PomodoroPhase = "work" | "break" | "idle";

export interface PomodoroState {
  phase: PomodoroPhase;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  sessionsCompleted: number;
}

interface PersistedPomodoroState extends PomodoroState {
  phaseStartedAt: number | null;
  workDurationSeconds?: number;
  breakDurationSeconds?: number;
}

const DEFAULT_WORK_DURATION = 25 * 60;
const DEFAULT_BREAK_DURATION = 5 * 60;
const TIMER_SYNC_INTERVAL_MS = 250;

interface PomodoroOptions {
  onWorkComplete?: (completedSeconds: number, shouldPlayEffects: boolean) => void | Promise<void>;
  onBreakComplete?: (shouldPlayEffects: boolean) => void | Promise<void>;
  onStop?: (elapsedSeconds: number) => void | Promise<void>;
  autoSwitchBreak?: boolean;
  storageKey?: string | null;
  workDurationSeconds?: number;
  breakDurationSeconds?: number;
  enableInAppEffects?: boolean;
  ready?: boolean;
  allowSubMinuteDurations?: boolean;
}

const createIdleState = (workDurationSeconds: number = DEFAULT_WORK_DURATION): PomodoroState => ({
  phase: "idle",
  timeLeft: workDurationSeconds,
  totalTime: workDurationSeconds,
  isRunning: false,
  sessionsCompleted: 0,
});

export function usePomodoroTimer(options?: PomodoroOptions) {
  const [state, setState] = useState<PomodoroState>(createIdleState);
  const [hydrated, setHydrated] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseStartedAtRef = useRef<number | null>(null);

  const onWorkCompleteRef = useRef(options?.onWorkComplete);
  const onBreakCompleteRef = useRef(options?.onBreakComplete);
  const onStopRef = useRef(options?.onStop);
  const autoSwitchBreakRef = useRef(options?.autoSwitchBreak ?? true);
  const storageKeyRef = useRef(options?.storageKey ?? null);
  const workDurationRef = useRef(options?.workDurationSeconds ?? DEFAULT_WORK_DURATION);
  const breakDurationRef = useRef(options?.breakDurationSeconds ?? DEFAULT_BREAK_DURATION);
  const activeWorkDurationRef = useRef(options?.workDurationSeconds ?? DEFAULT_WORK_DURATION);
  const activeBreakDurationRef = useRef(options?.breakDurationSeconds ?? DEFAULT_BREAK_DURATION);
  const enableInAppEffectsRef = useRef(options?.enableInAppEffects ?? true);
  const ready = options?.ready ?? true;
  const allowSubMinuteDurations = options?.allowSubMinuteDurations ?? false;

  useEffect(() => {
    onWorkCompleteRef.current = options?.onWorkComplete;
    onBreakCompleteRef.current = options?.onBreakComplete;
    onStopRef.current = options?.onStop;
    autoSwitchBreakRef.current = options?.autoSwitchBreak ?? true;
    storageKeyRef.current = options?.storageKey ?? null;
    workDurationRef.current = options?.workDurationSeconds ?? DEFAULT_WORK_DURATION;
    breakDurationRef.current = options?.breakDurationSeconds ?? DEFAULT_BREAK_DURATION;
    enableInAppEffectsRef.current = options?.enableInAppEffects ?? true;
  }, [
    options?.onWorkComplete,
    options?.onBreakComplete,
    options?.onStop,
    options?.autoSwitchBreak,
    options?.storageKey,
    options?.workDurationSeconds,
    options?.breakDurationSeconds,
    options?.enableInAppEffects,
  ]);

  const sanitizeDuration = useCallback((duration: number | undefined, fallback: number) => {
    if (!Number.isFinite(duration)) return fallback;
    const normalized = Math.max(1, Math.ceil(duration ?? fallback));
    if (!allowSubMinuteDurations && normalized < 60) return fallback;
    return normalized;
  }, [allowSubMinuteDurations]);

  const persistState = useCallback(async (nextState: PomodoroState, phaseStartedAt: number | null) => {
    const storageKey = storageKeyRef.current;
    if (!storageKey) return;

    try {
      if (nextState.phase === "idle" && !nextState.isRunning) {
        await AsyncStorage.removeItem(storageKey);
        return;
      }

      const payload: PersistedPomodoroState = {
        ...nextState,
        phaseStartedAt,
        workDurationSeconds: activeWorkDurationRef.current,
        breakDurationSeconds: activeBreakDurationRef.current,
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to persist pomodoro state:", error);
    }
  }, []);

  useEffect(() => {
    setState((prev) => {
      if (prev.phase !== "idle" || prev.isRunning) return prev;
      const nextState = createIdleState(workDurationRef.current);
      return nextState;
    });
  }, [options?.workDurationSeconds]);

  const applyElapsed = useCallback(
    (input: PersistedPomodoroState, shouldPlayEffects = false): PersistedPomodoroState => {
      if (!input.isRunning || input.phase === "idle" || !input.phaseStartedAt) {
        return input;
      }

      const now = Date.now();
      let elapsed = Math.max(0, Math.floor((now - input.phaseStartedAt) / 1000));
      let next = { ...input };
      let completedWorkSeconds = 0;
      let completedBreaks = 0;

      while (next.isRunning && elapsed >= next.totalTime) {
        elapsed -= next.totalTime;

        if (next.phase === "work") {
          completedWorkSeconds += next.totalTime;

          const autoSwitchBreak = autoSwitchBreakRef.current ?? true;
          const breakDuration =
            next.breakDurationSeconds ?? activeBreakDurationRef.current ?? breakDurationRef.current;
          next = {
            ...next,
            phase: "break",
            timeLeft: breakDuration,
            totalTime: breakDuration,
            isRunning: autoSwitchBreak,
            phaseStartedAt: autoSwitchBreak ? now - elapsed * 1000 : null,
            workDurationSeconds:
              next.workDurationSeconds ?? activeWorkDurationRef.current ?? workDurationRef.current,
            breakDurationSeconds: breakDuration,
          };

          if (!autoSwitchBreak) {
            break;
          }
          continue;
        }

        completedBreaks += 1;
        const autoSwitchBreak = autoSwitchBreakRef.current ?? true;
        const workDuration =
          next.workDurationSeconds ?? activeWorkDurationRef.current ?? workDurationRef.current;
        next = {
          ...next,
          phase: "work",
          timeLeft: workDuration,
          totalTime: workDuration,
          isRunning: autoSwitchBreak,
          sessionsCompleted: next.sessionsCompleted + 1,
          phaseStartedAt: autoSwitchBreak ? now - elapsed * 1000 : null,
          workDurationSeconds: workDuration,
          breakDurationSeconds:
            next.breakDurationSeconds ?? activeBreakDurationRef.current ?? breakDurationRef.current,
        };

        if (!autoSwitchBreak) {
          break;
        }
      }

      if (next.isRunning && next.phaseStartedAt) {
        next = {
          ...next,
          timeLeft: Math.max(0, next.totalTime - elapsed),
        };
      }

      if (completedWorkSeconds > 0) {
        const emitEffects =
          shouldPlayEffects &&
          enableInAppEffectsRef.current &&
          AppState.currentState === "active";
        if (emitEffects) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        void onWorkCompleteRef.current?.(completedWorkSeconds, emitEffects);
      }

      if (completedBreaks > 0) {
        const emitEffects =
          shouldPlayEffects &&
          enableInAppEffectsRef.current &&
          AppState.currentState === "active" &&
          completedWorkSeconds === 0;
        if (emitEffects) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        void onBreakCompleteRef.current?.(emitEffects);
      }

      return next;
    },
    []
  );

  const syncFromClock = useCallback((shouldPlayEffects = false) => {
    setState((prev) => {
      const previousPhaseStartedAt = phaseStartedAtRef.current;
      const reconciled = applyElapsed({
        ...prev,
        phaseStartedAt: previousPhaseStartedAt,
      }, shouldPlayEffects);
      phaseStartedAtRef.current = reconciled.phaseStartedAt;
      const nextState: PomodoroState = {
        phase: reconciled.phase,
        timeLeft: reconciled.timeLeft,
        totalTime: reconciled.totalTime,
        isRunning: reconciled.isRunning,
        sessionsCompleted: reconciled.sessionsCompleted,
      };
      const stateChanged =
        prev.phase !== nextState.phase ||
        prev.timeLeft !== nextState.timeLeft ||
        prev.totalTime !== nextState.totalTime ||
        prev.isRunning !== nextState.isRunning ||
        prev.sessionsCompleted !== nextState.sessionsCompleted;
      const shouldPersist =
        prev.phase !== nextState.phase ||
        prev.totalTime !== nextState.totalTime ||
        prev.isRunning !== nextState.isRunning ||
        prev.sessionsCompleted !== nextState.sessionsCompleted ||
        previousPhaseStartedAt !== reconciled.phaseStartedAt;

      if (shouldPersist) {
        void persistState(nextState, reconciled.phaseStartedAt);
      }

      return stateChanged ? nextState : prev;
    });
  }, [applyElapsed, persistState]);

  const syncFromNativeNotification = useCallback(async (): Promise<boolean> => {
    const storageKey = storageKeyRef.current;
    const itemId = storageKey?.startsWith("pomodoro_state_")
      ? storageKey.replace("pomodoro_state_", "")
      : null;
    if (!itemId) return false;

    const snapshot = await readNativePomodoroSnapshot(itemId);
    if (!snapshot) return false;

    const workDuration = sanitizeDuration(snapshot.workDurationSeconds, workDurationRef.current);
    const breakDuration = sanitizeDuration(snapshot.breakDurationSeconds, breakDurationRef.current);
    const totalTime = snapshot.phase === "work" ? workDuration : breakDuration;
    const phaseStartedAt =
      snapshot.isRunning && snapshot.phaseStartedAt
        ? snapshot.phaseStartedAt
        : null;
    const phaseEndsAt =
      snapshot.phaseEndsAt ??
      (phaseStartedAt ? phaseStartedAt + totalTime * 1000 : null);
    const timeLeft =
      snapshot.isRunning && phaseEndsAt
        ? Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000))
        : Math.max(0, Math.floor(snapshot.timeLeft ?? 0));

    activeWorkDurationRef.current = workDuration;
    activeBreakDurationRef.current = breakDuration;
    phaseStartedAtRef.current = phaseStartedAt;

    const nextState: PomodoroState = {
      phase: snapshot.phase,
      timeLeft,
      totalTime,
      isRunning: snapshot.isRunning && timeLeft > 0,
      sessionsCompleted: snapshot.sessionsCompleted,
    };

    setState(nextState);
    await persistState(nextState, nextState.isRunning ? phaseStartedAt : null);
    return true;
  }, [persistState, sanitizeDuration]);

  useEffect(() => {
    const loadState = async () => {
      const storageKey = storageKeyRef.current;
      if (!storageKey) {
        setHydrated(true);
        return;
      }

      try {
        if (await syncFromNativeNotification()) {
          setHydrated(true);
          return;
        }

        const raw = await AsyncStorage.getItem(storageKey);
        if (!raw) {
          setHydrated(true);
          return;
        }

        const parsed = JSON.parse(raw) as PersistedPomodoroState;
        const workDuration = sanitizeDuration(parsed.workDurationSeconds, workDurationRef.current);
        const breakDuration = sanitizeDuration(parsed.breakDurationSeconds, breakDurationRef.current);
        activeWorkDurationRef.current = workDuration;
        activeBreakDurationRef.current = breakDuration;

        const parsedWithSafeDurations: PersistedPomodoroState = {
          ...parsed,
          workDurationSeconds: workDuration,
          breakDurationSeconds: breakDuration,
          totalTime:
            parsed.phase === "work"
              ? workDuration
              : parsed.phase === "break"
                ? breakDuration
                : parsed.totalTime,
          timeLeft:
            parsed.phase === "work"
              ? Math.min(parsed.timeLeft, workDuration)
              : parsed.phase === "break"
                ? Math.min(parsed.timeLeft, breakDuration)
                : parsed.timeLeft,
        };

        const reconciled = applyElapsed(parsedWithSafeDurations, false);
        phaseStartedAtRef.current = reconciled.phaseStartedAt;
        setState({
          phase: reconciled.phase,
          timeLeft: reconciled.timeLeft,
          totalTime: reconciled.totalTime,
          isRunning: reconciled.isRunning,
          sessionsCompleted: reconciled.sessionsCompleted,
        });
        await persistState(
          {
            phase: reconciled.phase,
            timeLeft: reconciled.timeLeft,
            totalTime: reconciled.totalTime,
            isRunning: reconciled.isRunning,
            sessionsCompleted: reconciled.sessionsCompleted,
          },
          reconciled.phaseStartedAt
        );
      } catch (error) {
        console.error("Failed to load pomodoro state:", error);
      } finally {
        setHydrated(true);
      }
    };

    if (!ready) {
      setHydrated(false);
      return;
    }

    setHydrated(false);
    void loadState();
  }, [applyElapsed, persistState, ready, sanitizeDuration, syncFromNativeNotification]);

  useEffect(() => {
    if (!ready || !hydrated || !state.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    syncFromClock(enableInAppEffectsRef.current);
    intervalRef.current = setInterval(() => {
      syncFromClock(enableInAppEffectsRef.current);
    }, TIMER_SYNC_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hydrated, ready, state.isRunning, syncFromClock]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void syncFromNativeNotification().then((didSync) => {
          if (!didSync) {
            syncFromClock(false);
          }
        });
      }
    });
    return () => sub.remove();
  }, [syncFromClock, syncFromNativeNotification]);

  const startPomodoro = useCallback(() => {
    const phaseStartedAt = Date.now();
    activeWorkDurationRef.current = workDurationRef.current;
    activeBreakDurationRef.current = breakDurationRef.current;
    phaseStartedAtRef.current = phaseStartedAt;
    const nextState: PomodoroState = {
      phase: "work",
      timeLeft: workDurationRef.current,
      totalTime: workDurationRef.current,
      isRunning: true,
      sessionsCompleted: 0,
    };
    setState(nextState);
    void persistState(nextState, phaseStartedAt);
  }, [persistState]);

  const pausePomodoro = useCallback(() => {
    setState((prev) => {
      const reconciled = applyElapsed({
        ...prev,
        phaseStartedAt: phaseStartedAtRef.current,
      }, enableInAppEffectsRef.current);
      phaseStartedAtRef.current = null;
      const nextState: PomodoroState = {
        phase: reconciled.phase,
        timeLeft: reconciled.timeLeft,
        totalTime: reconciled.totalTime,
        isRunning: false,
        sessionsCompleted: reconciled.sessionsCompleted,
      };
      void persistState(nextState, null);
      return nextState;
    });
  }, [applyElapsed, persistState]);

  const resumePomodoro = useCallback(() => {
    setState((prev) => {
      if (prev.phase === "idle") {
        return prev;
      }
      activeWorkDurationRef.current = prev.totalTime === workDurationRef.current
        ? workDurationRef.current
        : activeWorkDurationRef.current;
      const elapsedInPhase = prev.totalTime - prev.timeLeft;
      const phaseStartedAt = Date.now() - elapsedInPhase * 1000;
      phaseStartedAtRef.current = phaseStartedAt;
      const nextState: PomodoroState = {
        ...prev,
        isRunning: true,
      };
      void persistState(nextState, phaseStartedAt);
      return nextState;
    });
  }, [persistState]);

  const stopPomodoro = useCallback(() => {
    setState((prev) => {
      const reconciled = applyElapsed({
        ...prev,
        phaseStartedAt: phaseStartedAtRef.current,
      }, false);
      if (reconciled.phase === "work" && onStopRef.current) {
        const elapsed = reconciled.totalTime - reconciled.timeLeft;
        if (elapsed > 0) {
          void onStopRef.current(elapsed);
        }
      }
      phaseStartedAtRef.current = null;
      activeWorkDurationRef.current = workDurationRef.current;
      activeBreakDurationRef.current = breakDurationRef.current;
      const nextState = createIdleState(workDurationRef.current);
      void persistState(nextState, null);
      return nextState;
    });
  }, [applyElapsed, persistState]);

  const skipPhase = useCallback(() => {
    setState((prev) => {
      let nextState: PomodoroState = prev;
      let phaseStartedAt = phaseStartedAtRef.current;

      if (prev.phase === "work") {
        const breakDuration = activeBreakDurationRef.current;
        nextState = {
          ...prev,
          phase: "break",
          timeLeft: breakDuration,
          totalTime: breakDuration,
        };
        phaseStartedAt = prev.isRunning ? Date.now() : null;
      } else if (prev.phase === "break") {
        const workDuration = activeWorkDurationRef.current;
        nextState = {
          ...prev,
          phase: "work",
          timeLeft: workDuration,
          totalTime: workDuration,
          sessionsCompleted: prev.sessionsCompleted + 1,
        };
        phaseStartedAt = prev.isRunning ? Date.now() : null;
      }

      phaseStartedAtRef.current = phaseStartedAt;
      void persistState(nextState, phaseStartedAt);
      return nextState;
    });
  }, [persistState]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const progress = state.totalTime > 0 ? state.timeLeft / state.totalTime : 0;
  const phaseEndsAt =
    state.isRunning && phaseStartedAtRef.current
      ? phaseStartedAtRef.current + state.totalTime * 1000
      : null;

  return {
    state,
    phaseEndsAt,
    startPomodoro,
    pausePomodoro,
    resumePomodoro,
    stopPomodoro,
    skipPhase,
    formatTime,
    progress,
  };
}
