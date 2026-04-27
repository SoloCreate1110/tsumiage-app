import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { AppState } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";

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
}

const WORK_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

interface PomodoroOptions {
  onWorkComplete?: () => void | Promise<void>;
  onBreakComplete?: () => void | Promise<void>;
  onStop?: (elapsedSeconds: number) => void | Promise<void>;
  autoSwitchBreak?: boolean;
  storageKey?: string | null;
}

const createIdleState = (): PomodoroState => ({
  phase: "idle",
  timeLeft: WORK_DURATION,
  totalTime: WORK_DURATION,
  isRunning: false,
  sessionsCompleted: 0,
});

const createPersistedIdleState = (): PersistedPomodoroState => ({
  ...createIdleState(),
  phaseStartedAt: null,
});

export function usePomodoroTimer(options?: PomodoroOptions) {
  const [state, setState] = useState<PomodoroState>(createIdleState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseStartedAtRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  const onWorkCompleteRef = useRef(options?.onWorkComplete);
  const onBreakCompleteRef = useRef(options?.onBreakComplete);
  const onStopRef = useRef(options?.onStop);
  const autoSwitchBreakRef = useRef(options?.autoSwitchBreak ?? true);
  const storageKeyRef = useRef(options?.storageKey ?? null);

  useEffect(() => {
    onWorkCompleteRef.current = options?.onWorkComplete;
    onBreakCompleteRef.current = options?.onBreakComplete;
    onStopRef.current = options?.onStop;
    autoSwitchBreakRef.current = options?.autoSwitchBreak ?? true;
    storageKeyRef.current = options?.storageKey ?? null;
  }, [options?.onWorkComplete, options?.onBreakComplete, options?.onStop, options?.autoSwitchBreak, options?.storageKey]);

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
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to persist pomodoro state:", error);
    }
  }, []);

  const applyElapsed = useCallback(
    (input: PersistedPomodoroState): PersistedPomodoroState => {
      if (!input.isRunning || input.phase === "idle" || !input.phaseStartedAt) {
        return input;
      }

      const now = Date.now();
      let elapsed = Math.max(0, Math.floor((now - input.phaseStartedAt) / 1000));
      let next = { ...input };

      while (next.isRunning && elapsed >= next.timeLeft) {
        elapsed -= next.timeLeft;

        if (next.phase === "work") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          void onWorkCompleteRef.current?.();

          const autoSwitchBreak = autoSwitchBreakRef.current ?? true;
          next = {
            ...next,
            phase: "break",
            timeLeft: BREAK_DURATION,
            totalTime: BREAK_DURATION,
            isRunning: autoSwitchBreak,
            phaseStartedAt: autoSwitchBreak ? now - elapsed * 1000 : null,
          };

          if (!autoSwitchBreak) {
            return next;
          }
          continue;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        void onBreakCompleteRef.current?.();
        next = {
          ...next,
          phase: "work",
          timeLeft: WORK_DURATION,
          totalTime: WORK_DURATION,
          isRunning: true,
          sessionsCompleted: next.sessionsCompleted + 1,
          phaseStartedAt: now - elapsed * 1000,
        };
      }

      if (next.isRunning && next.phaseStartedAt) {
        next = {
          ...next,
          timeLeft: Math.max(0, next.totalTime - elapsed),
          phaseStartedAt: now - elapsed * 1000,
        };
      }

      return next;
    },
    []
  );

  const syncFromClock = useCallback(() => {
    setState((prev) => {
      const reconciled = applyElapsed({
        ...prev,
        phaseStartedAt: phaseStartedAtRef.current,
      });
      phaseStartedAtRef.current = reconciled.phaseStartedAt;
      const nextState: PomodoroState = {
        phase: reconciled.phase,
        timeLeft: reconciled.timeLeft,
        totalTime: reconciled.totalTime,
        isRunning: reconciled.isRunning,
        sessionsCompleted: reconciled.sessionsCompleted,
      };
      void persistState(nextState, reconciled.phaseStartedAt);
      return nextState;
    });
  }, [applyElapsed, persistState]);

  useEffect(() => {
    const loadState = async () => {
      const storageKey = storageKeyRef.current;
      if (!storageKey) {
        hydratedRef.current = true;
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!raw) {
          hydratedRef.current = true;
          return;
        }

        const parsed = JSON.parse(raw) as PersistedPomodoroState;
        const reconciled = applyElapsed(parsed);
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
        hydratedRef.current = true;
      }
    };

    void loadState();
  }, [applyElapsed, persistState]);

  useEffect(() => {
    if (!hydratedRef.current || !state.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    syncFromClock();
    intervalRef.current = setInterval(syncFromClock, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, syncFromClock]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        syncFromClock();
      }
    });
    return () => sub.remove();
  }, [syncFromClock]);

  const startPomodoro = useCallback(() => {
    const phaseStartedAt = Date.now();
    phaseStartedAtRef.current = phaseStartedAt;
    const nextState: PomodoroState = {
      phase: "work",
      timeLeft: WORK_DURATION,
      totalTime: WORK_DURATION,
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
      });
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
      });
      if (reconciled.phase === "work" && onStopRef.current) {
        const elapsed = reconciled.totalTime - reconciled.timeLeft;
        if (elapsed > 0) {
          void onStopRef.current(elapsed);
        }
      }
      phaseStartedAtRef.current = null;
      const nextState = createIdleState();
      void persistState(nextState, null);
      return nextState;
    });
  }, [applyElapsed, persistState]);

  const skipPhase = useCallback(() => {
    setState((prev) => {
      let nextState: PomodoroState = prev;
      let phaseStartedAt = phaseStartedAtRef.current;

      if (prev.phase === "work") {
        nextState = {
          ...prev,
          phase: "break",
          timeLeft: BREAK_DURATION,
          totalTime: BREAK_DURATION,
        };
        phaseStartedAt = prev.isRunning ? Date.now() : null;
      } else if (prev.phase === "break") {
        nextState = {
          ...prev,
          phase: "work",
          timeLeft: WORK_DURATION,
          totalTime: WORK_DURATION,
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

  return {
    state,
    startPomodoro,
    pausePomodoro,
    resumePomodoro,
    stopPomodoro,
    skipPhase,
    formatTime,
    progress,
  };
}
