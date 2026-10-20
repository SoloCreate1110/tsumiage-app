import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { AppState } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { BREAK_DURATION, WORK_DURATION, createIdleState, normalizeDuration, isPomodoroState, reconcilePomodoro,
  type PersistedPomodoroState } from "@/lib/pomodoro-clock";
export type { PomodoroPhase, PomodoroState } from "@/lib/pomodoro-clock";

interface PomodoroOptions {
  onWorkComplete?: (elapsedSeconds: number) => void | Promise<void>;
  onBreakComplete?: () => void | Promise<void>;
  onStop?: (elapsedSeconds: number) => void | Promise<void>;
  autoSwitchBreak?: boolean;
  storageKey?: string | null;
  ready?: boolean;
  workDuration?: number;
  breakDuration?: number;
}

export function usePomodoroTimer(options?: PomodoroOptions) {
  const [state, setState] = useState(createIdleState);
  const [isHydrated, setIsHydrated] = useState(false);
  const stateRef = useRef(state);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const hydratedRef = useRef(false);
  const writesRef = useRef(Promise.resolve());

  const commit = useCallback((next: PersistedPomodoroState) => {
    stateRef.current = next;
    setState(next);
    const key = optionsRef.current?.storageKey;
    if (key) {
      // Keep rapid pause/resume/stop writes in order.
      writesRef.current = writesRef.current.then(async () => {
        if (next.phase === "idle") await AsyncStorage.removeItem(key);
        else await AsyncStorage.setItem(key, JSON.stringify(next));
      }).catch(error => console.error("Failed to persist pomodoro state:", error));
    }
  }, []);

  const reconcile = useCallback(() => {
    const result = reconcilePomodoro(stateRef.current, Date.now(), optionsRef.current?.autoSwitchBreak ?? true);
    // Update the authoritative state before invoking any external callbacks.
    commit(result.state);
    if (result.workCompleted) {
      void Promise.resolve(optionsRef.current?.onWorkComplete?.(result.workSeconds))
        .catch(error => console.error("Failed to record pomodoro:", error));
    }
    if (result.breaksCompleted) {
      void Promise.resolve(optionsRef.current?.onBreakComplete?.())
        .catch(error => console.error("Failed to complete pomodoro break:", error));
    }
    if (result.workCompleted || result.breaksCompleted) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    return result.state;
  }, [commit]);

  const storageKey = options?.storageKey;
  const ready = options?.ready ?? true;
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    hydratedRef.current = false;
    setIsHydrated(false);
    void (async () => {
      await writesRef.current;
      const workDuration = normalizeDuration(optionsRef.current?.workDuration, WORK_DURATION);
      const breakDuration = normalizeDuration(optionsRef.current?.breakDuration, BREAK_DURATION);
      let loaded = { ...createIdleState(), workDuration, breakDuration, timeLeft: workDuration, totalTime: workDuration };
      try {
        const raw = storageKey ? await AsyncStorage.getItem(storageKey) : null;
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (isPomodoroState(parsed)) loaded = { ...parsed, workDuration: parsed.workDuration ?? WORK_DURATION, breakDuration: parsed.breakDuration ?? BREAK_DURATION };
      } catch (error) {
        console.error("Failed to load pomodoro state:", error);
      }
      if (cancelled) return;
      stateRef.current = loaded;
      reconcile();
      hydratedRef.current = true;
      setIsHydrated(true);
    })();
    return () => { cancelled = true; hydratedRef.current = false; };
  }, [storageKey, ready, reconcile]);

  useEffect(() => {
    if (!isHydrated || !state.isRunning) return;
    const interval = setInterval(reconcile, 1000);
    return () => clearInterval(interval);
  }, [isHydrated, state.isRunning, reconcile]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", () => {
      if (hydratedRef.current) reconcile();
    });
    return () => sub.remove();
  }, [reconcile]);

  const startPomodoro = useCallback(() => {
    if (!hydratedRef.current) return;
    const workDuration = normalizeDuration(optionsRef.current?.workDuration, WORK_DURATION);
    const breakDuration = normalizeDuration(optionsRef.current?.breakDuration, BREAK_DURATION);
    commit({ ...createIdleState(), workDuration, breakDuration, totalTime: workDuration, timeLeft: workDuration, phase: "work", isRunning: true, phaseStartedAt: Date.now() });
  }, [commit]);
  const pausePomodoro = useCallback(() => {
    if (!hydratedRef.current) return;
    commit({ ...reconcile(), isRunning: false, phaseStartedAt: null });
  }, [commit, reconcile]);
  const resumePomodoro = useCallback(() => {
    if (!hydratedRef.current) return;
    const prev = stateRef.current;
    if (prev.phase === "idle" || prev.isRunning) return;
    commit({ ...prev, isRunning: true, phaseStartedAt: Date.now() - (prev.totalTime - prev.timeLeft) * 1000 });
  }, [commit]);
  const stopPomodoro = useCallback(() => {
    if (!hydratedRef.current) return;
    const result = reconcilePomodoro(stateRef.current, Date.now(), optionsRef.current?.autoSwitchBreak ?? true);
    const elapsed = result.workSeconds + (result.state.phase === "work"
      ? result.state.totalTime - result.state.timeLeft : 0);
    commit(createIdleState());
    if (elapsed > 0) {
      void Promise.resolve(optionsRef.current?.onStop?.(elapsed))
        .catch(error => console.error("Failed to record stopped pomodoro:", error));
    }
  }, [commit]);
  const skipPhase = useCallback(() => {
    if (!hydratedRef.current) return;
    const prev = reconcile();
    if (prev.phase === "idle") return;
    const phase = prev.phase === "work" ? "break" : "work";
    const duration = phase === "work" ? prev.workDuration ?? WORK_DURATION : prev.breakDuration ?? BREAK_DURATION;
    commit({ ...prev, phase, timeLeft: duration, totalTime: duration,
      phaseStartedAt: prev.isRunning ? Date.now() : null });
  }, [commit, reconcile]);
  const formatTime = useCallback((seconds: number) =>
    `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`, []);

  useEffect(() => {
    if (!isHydrated || stateRef.current.phase !== "idle") return;
    const workDuration = normalizeDuration(options?.workDuration, WORK_DURATION);
    const breakDuration = normalizeDuration(options?.breakDuration, BREAK_DURATION);
    commit({ ...createIdleState(), workDuration, breakDuration, totalTime: workDuration, timeLeft: workDuration });
  }, [isHydrated, options?.workDuration, options?.breakDuration, state.phase, commit]);

  const phaseEndsAt = state.isRunning && state.phaseStartedAt !== null
    ? state.phaseStartedAt + state.totalTime * 1000 : null;
  return { state, isHydrated, phaseEndsAt, startPomodoro, pausePomodoro, resumePomodoro,
    stopPomodoro, skipPhase, formatTime, progress: state.totalTime > 0 ? state.timeLeft / state.totalTime : 0 };
}
