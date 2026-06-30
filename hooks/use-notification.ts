import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { isPomodoroItemScreenActive } from "@/lib/pomodoro-foreground-state";

const isExpoGo =
  Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";
const DAILY_REMINDER_NOTIFICATION_ID = "daily-reminder";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as { kind?: unknown; itemId?: unknown };
    const activeTaskNotificationItemId =
      (data.kind === "pomodoro" || data.kind === "long-session") &&
      typeof data.itemId === "string"
        ? data.itemId
        : null;
    const suppressOnActiveTask =
      activeTaskNotificationItemId !== null &&
      isPomodoroItemScreenActive(activeTaskNotificationItemId);

    return {
      shouldShowAlert: !suppressOnActiveTask,
      shouldPlaySound: !suppressOnActiveTask,
      shouldSetBadge: false,
      shouldShowBanner: !suppressOnActiveTask,
      shouldShowList: !suppressOnActiveTask,
    } as Notifications.NotificationBehavior;
  },
});

export function useNotification() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    if (isExpoGo) {
      setEnabled(false);
      return;
    }
    const settings = await Notifications.getPermissionsAsync();
    setEnabled(
      settings.granted ||
        settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
    );
  };

  const requestPermissions = async () => {
    if (isExpoGo) {
      return false;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    setEnabled(status === "granted");
    return status === "granted";
  };

  const scheduleDailyReminder = async (hour: number, minute: number) => {
    if (isExpoGo) {
      return false;
    }
    if (!enabled) {
      const granted = await requestPermissions();
      if (!granted) return false;
    }

    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_NOTIFICATION_ID).catch(
      () => undefined,
    );

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_NOTIFICATION_ID,
      content: {
        title: "積み上げの時間です！",
        body: "今日の積み上げを少しだけ進めましょう。",
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      } as any,
    });

    return true;
  };

  const cancelNotifications = async () => {
    if (isExpoGo) {
      return;
    }
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_NOTIFICATION_ID).catch(
      () => undefined,
    );
  };

  return {
    enabled,
    requestPermissions,
    scheduleDailyReminder,
    cancelNotifications,
  };
}
