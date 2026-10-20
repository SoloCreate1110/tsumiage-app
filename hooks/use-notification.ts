import type { NotificationBehavior } from "expo-notifications";
import { loadNotifications } from "@/lib/notifications-runtime";
import Constants from "expo-constants";
import { useEffect, useState } from "react";

import { Platform } from "react-native";

const isExpoGo =
  Platform.OS === "web" || Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

if (!isExpoGo) void loadNotifications().then(Notifications => Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  } as NotificationBehavior),
})).catch(error => console.error("Failed to initialize notifications:", error));

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
    const Notifications = await loadNotifications();
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
    const Notifications = await loadNotifications();
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

    const Notifications = await loadNotifications();
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
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
    const Notifications = await loadNotifications();
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  return {
    enabled,
    requestPermissions,
    scheduleDailyReminder,
    cancelNotifications,
  };
}
