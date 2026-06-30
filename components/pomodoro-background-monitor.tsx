import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useNotificationSettings } from "@/hooks/use-notification-settings";
import { usePomodoroSettings } from "@/hooks/use-pomodoro-settings";
import { useStackStorage } from "@/hooks/use-stack-storage";
import {
  cancelPomodoroRunningNotification,
  cancelPomodoroNotifications,
  schedulePomodoroPhaseNotifications,
  schedulePomodoroRunningNotification,
} from "@/lib/pomodoro-notifications";
import {
  cancelLongSessionReminder,
  scheduleLongSessionReminder,
} from "@/lib/long-running-session-notifications";

type PersistedPomodoroState = {
  phase: "work" | "break" | "idle";
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  sessionsCompleted: number;
  phaseStartedAt: number | null;
  workDurationSeconds?: number;
  breakDurationSeconds?: number;
};

export function PomodoroBackgroundMonitor() {
  const pathname = usePathname();
  const { items } = useStackStorage();
  const { settings: notificationSettings } = useNotificationSettings();
  const { settings, loading: pomodoroSettingsLoading } = usePomodoroSettings();
  const scheduledRef = useRef<Set<string>>(new Set());
  const appStateRef = useRef(AppState.currentState);

  const checkPomodoros = useCallback(async () => {
    if (items.length === 0 || !notificationSettings.enabled || pomodoroSettingsLoading) return;

    const entries = await AsyncStorage.multiGet(
      items.map((item) => `pomodoro_state_${item.id}`)
    );
    const now = Date.now();
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const appIsActive = appStateRef.current === "active";

    for (const [key, raw] of entries) {
      const itemId = key.replace("pomodoro_state_", "");
      const shouldShowRunningNotification = !appIsActive || pathname !== `/item/${itemId}`;
      if (!raw) {
        await cancelPomodoroNotifications(itemId);
        scheduledRef.current.forEach((keyValue) => {
          if (keyValue.startsWith(`${itemId}:`)) scheduledRef.current.delete(keyValue);
        });
        continue;
      }

      const item = itemMap.get(itemId);
      if (!item) {
        await cancelPomodoroNotifications(itemId);
        scheduledRef.current.forEach((keyValue) => {
          if (keyValue.startsWith(`${itemId}:`)) scheduledRef.current.delete(keyValue);
        });
        continue;
      }

      let state: PersistedPomodoroState;
      try {
        state = JSON.parse(raw) as PersistedPomodoroState;
      } catch {
        await cancelPomodoroNotifications(itemId);
        continue;
      }

      if (!state.isRunning || state.phase === "idle" || !state.phaseStartedAt) {
        await cancelPomodoroNotifications(itemId);
        scheduledRef.current.forEach((keyValue) => {
          if (keyValue.startsWith(`${itemId}:`)) scheduledRef.current.delete(keyValue);
        });
        continue;
      }

      const elapsedSeconds = Math.max(0, Math.floor((now - state.phaseStartedAt) / 1000));
      const workSeconds = state.workDurationSeconds ?? settings.workMinutes * 60;
      const breakSeconds = state.breakDurationSeconds ?? settings.breakMinutes * 60;
      const autoSwitchBreak = item.pomodoroAutoSwitchBreak ?? true;
      const phaseEndsAt = state.phaseStartedAt + state.totalTime * 1000;
      const phaseStartedAtSeconds = Math.floor(state.phaseStartedAt / 1000);
      const scheduleKey = `${itemId}:${state.phase}:${phaseStartedAtSeconds}:${state.totalTime}:${workSeconds}:${breakSeconds}:${autoSwitchBreak}`;
      if (!scheduledRef.current.has(scheduleKey)) {
        const scheduled = await schedulePomodoroPhaseNotifications(
          itemId,
          item.name,
          state.phase,
          phaseEndsAt,
          autoSwitchBreak,
          breakSeconds,
          workSeconds
        ).catch((error) => {
          console.log("Failed to schedule pomodoro notification:", error);
          return false;
        });
        if (scheduled) {
          scheduledRef.current.add(scheduleKey);
        }
      }

      if (shouldShowRunningNotification) {
        const remainingSeconds = Math.max(0, Math.ceil((phaseEndsAt - now) / 1000));
        if (remainingSeconds <= 0) {
          await cancelPomodoroRunningNotification(itemId);
          scheduledRef.current.forEach((keyValue) => {
            if (keyValue.startsWith(`${itemId}:running:`)) scheduledRef.current.delete(keyValue);
          });
          continue;
        }
        const remainingMinute = Math.floor(remainingSeconds / 60);
        const runningKey = `${itemId}:running:${state.phase}:${remainingMinute}`;
        if (!scheduledRef.current.has(runningKey)) {
          const scheduled = await schedulePomodoroRunningNotification(
            itemId,
            item.name,
            state.phase,
            phaseEndsAt,
            {
              autoSwitchBreak,
              breakDurationSeconds: breakSeconds,
              workDurationSeconds: workSeconds,
              sessionsCompleted: state.sessionsCompleted,
            }
          ).catch((error) => {
            console.log("Failed to show pomodoro running notification:", error);
            return false;
          });
          if (scheduled) {
            scheduledRef.current.add(runningKey);
          }
        }
      } else {
        await cancelPomodoroRunningNotification(itemId);
        scheduledRef.current.forEach((keyValue) => {
          if (keyValue.startsWith(`${itemId}:running:`)) scheduledRef.current.delete(keyValue);
        });
      }
    }
  }, [
    items,
    notificationSettings.enabled,
    pathname,
    pomodoroSettingsLoading,
    settings.breakMinutes,
    settings.workMinutes,
  ]);

  const checkRunningTimers = useCallback(async () => {
    if (items.length === 0 || !notificationSettings.enabled) return;

    const entries = await AsyncStorage.multiGet(items.map((item) => `timer_state_${item.id}`));
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const appIsActive = appStateRef.current === "active";

    for (const [key, raw] of entries) {
      const itemId = key.replace("timer_state_", "");
      const shouldShowRunningNotification = !appIsActive || pathname !== `/item/${itemId}`;

      if (!raw) {
        await cancelLongSessionReminder(itemId);
        scheduledRef.current.forEach((keyValue) => {
          if (keyValue.startsWith(`${itemId}:timer:`)) scheduledRef.current.delete(keyValue);
        });
        continue;
      }

      const item = itemMap.get(itemId);
      if (!item) {
        await cancelLongSessionReminder(itemId);
        continue;
      }

      let state: { startAt?: number };
      try {
        state = JSON.parse(raw) as { startAt?: number };
      } catch {
        await cancelLongSessionReminder(itemId);
        continue;
      }

      if (!state.startAt || !shouldShowRunningNotification) {
        await cancelLongSessionReminder(itemId);
        scheduledRef.current.forEach((keyValue) => {
          if (keyValue.startsWith(`${itemId}:timer:`)) scheduledRef.current.delete(keyValue);
        });
        continue;
      }

      const elapsedMinute = Math.floor(Math.max(0, Date.now() - state.startAt) / 60000);
      const scheduleKey = `${itemId}:timer:${elapsedMinute}`;
      if (!scheduledRef.current.has(scheduleKey)) {
        const scheduled = await scheduleLongSessionReminder(itemId, item.name, state.startAt).catch((error) => {
          console.log("Failed to show timer running notification:", error);
          return false;
        });
        if (scheduled) {
          scheduledRef.current.add(scheduleKey);
        }
      }
    }
  }, [items, notificationSettings.enabled, pathname]);

  const checkNotifications = useCallback(async () => {
    await checkPomodoros();
    await checkRunningTimers();
  }, [checkPomodoros, checkRunningTimers]);

  useEffect(() => {
    if (notificationSettings.enabled) return;
    scheduledRef.current.clear();
    items.forEach((item) => {
      void cancelPomodoroNotifications(item.id);
      void cancelLongSessionReminder(item.id);
    });
  }, [items, notificationSettings.enabled]);

  useEffect(() => {
    void checkNotifications();
  }, [checkNotifications]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      void checkNotifications();
    });

    return () => subscription.remove();
  }, [checkNotifications]);

  useEffect(() => {
    if (!notificationSettings.enabled) return undefined;
    const intervalId = setInterval(() => {
      void checkNotifications();
    }, 60_000);

    return () => clearInterval(intervalId);
  }, [checkNotifications, notificationSettings.enabled]);

  return null;
}
