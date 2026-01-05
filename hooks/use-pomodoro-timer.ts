/**
 * ポモドーロテクニック用のタイマーフック
 * 25分作業 + 5分休憩を自動で切り替え
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";

export type PomodoroPhase = "work" | "break" | "idle";

export interface PomodoroState {
  phase: PomodoroPhase;
  timeLeft: number; // 秒単位
  totalTime: number; // 秒単位
  isRunning: boolean;
  sessionsCompleted: number;
}

const WORK_DURATION = 25 * 60; // 25分
const BREAK_DURATION = 5 * 60; // 5分

export function usePomodoroTimer() {
  const [state, setState] = useState<PomodoroState>({
    phase: "idle",
    timeLeft: WORK_DURATION,
    totalTime: WORK_DURATION,
    isRunning: false,
    sessionsCompleted: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // タイマーの更新
  useEffect(() => {
    if (!state.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        const newTimeLeft = prev.timeLeft - 1;

        // タイマー終了
        if (newTimeLeft <= 0) {
          // フェーズ切り替え
          if (prev.phase === "work") {
            // 作業終了 → 休憩開始
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return {
              ...prev,
              phase: "break",
              timeLeft: BREAK_DURATION,
              totalTime: BREAK_DURATION,
            };
          } else if (prev.phase === "break") {
            // 休憩終了 → 次の作業セッション開始
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return {
              ...prev,
              phase: "work",
              timeLeft: WORK_DURATION,
              totalTime: WORK_DURATION,
              sessionsCompleted: prev.sessionsCompleted + 1,
            };
          }
        }

        return {
          ...prev,
          timeLeft: newTimeLeft,
        };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning]);

  const startPomodoro = useCallback(() => {
    setState({
      phase: "work",
      timeLeft: WORK_DURATION,
      totalTime: WORK_DURATION,
      isRunning: true,
      sessionsCompleted: 0,
    });
  }, []);

  const pausePomodoro = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
    }));
  }, []);

  const resumePomodoro = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
    }));
  }, []);

  const stopPomodoro = useCallback(() => {
    setState({
      phase: "idle",
      timeLeft: WORK_DURATION,
      totalTime: WORK_DURATION,
      isRunning: false,
      sessionsCompleted: 0,
    });
  }, []);

  const skipPhase = useCallback(() => {
    setState((prev) => {
      if (prev.phase === "work") {
        return {
          ...prev,
          phase: "break",
          timeLeft: BREAK_DURATION,
          totalTime: BREAK_DURATION,
        };
      } else if (prev.phase === "break") {
        return {
          ...prev,
          phase: "work",
          timeLeft: WORK_DURATION,
          totalTime: WORK_DURATION,
          sessionsCompleted: prev.sessionsCompleted + 1,
        };
      }
      return prev;
    });
  }, []);

  // 時間をMM:SS形式にフォーマット
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // プログレス（0-1）を計算
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
