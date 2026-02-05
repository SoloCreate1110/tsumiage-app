import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useEffect, useState } from "react";

const isExpoGo =
  Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  } as Notifications.NotificationBehavior),
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
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  return {
    enabled,
    requestPermissions,
    scheduleDailyReminder,
    cancelNotifications,
  };
}
