import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";

const NOTIFICATION_SETTINGS_KEY = "notification_settings";

export interface NotificationSettings {
  enabled: boolean;
  time: string; // HH:MM
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  time: "20:00",
};

const isExpoGo =
  Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

// 通知の表示方法を設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string>("undetermined");

  useEffect(() => {
    loadSettings();
    checkPermission();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (data) {
        setSettings(JSON.parse(data));
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(
        NOTIFICATION_SETTINGS_KEY,
        JSON.stringify(newSettings),
      );
      setSettings(newSettings);
    } catch (error) {
      console.error("Failed to save notification settings:", error);
    }
  };

  const checkPermission = async () => {
    if (isExpoGo) {
      setPermissionStatus("unsupported");
      return;
    }
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };

  const requestPermission = async (): Promise<boolean> => {
    if (isExpoGo) {
      return false;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);
    return status === "granted";
  };

  const scheduleNotification = useCallback(
    async (time: string) => {
      if (isExpoGo) {
        return;
      }
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();

        if (!settings.enabled) {
          return;
        }

        const [hours, minutes] = time.split(":").map(Number);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "積み上げの時間です！",
            body: "今日の目標に向けて少しだけ進めてみましょう。",
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hours,
            minute: minutes,
          },
        });

        console.log(`[Notification] Scheduled for ${time}`);
      } catch (error) {
        console.error("Failed to schedule notification:", error);
      }
    },
    [settings.enabled],
  );

  const enableNotification = async (time: string) => {
    if (isExpoGo) {
      return false;
    }
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      return false;
    }

    const newSettings: NotificationSettings = {
      enabled: true,
      time,
    };

    await saveSettings(newSettings);
    await scheduleNotification(time);
    return true;
  };

  const disableNotification = async () => {
    if (!isExpoGo) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    await saveSettings({
      ...settings,
      enabled: false,
    });
  };

  const updateNotificationTime = async (time: string) => {
    const newSettings: NotificationSettings = {
      ...settings,
      time,
    };

    await saveSettings(newSettings);

    if (settings.enabled && !isExpoGo) {
      await scheduleNotification(time);
    }
  };

  return {
    settings,
    loading,
    permissionStatus,
    enableNotification,
    disableNotification,
    updateNotificationTime,
    requestPermission,
  };
}
