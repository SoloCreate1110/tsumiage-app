/**
 * 通知設定を管理するフック
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";

const NOTIFICATION_SETTINGS_KEY = "notification_settings";

export interface NotificationSettings {
  enabled: boolean;
  time: string; // HH:MM形式
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  time: "20:00",
};

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

  // 設定を読み込み
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
        JSON.stringify(newSettings)
      );
      setSettings(newSettings);
    } catch (error) {
      console.error("Failed to save notification settings:", error);
    }
  };

  // 通知権限をチェック
  const checkPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };

  // 通知権限をリクエスト
  const requestPermission = async (): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);
    return status === "granted";
  };

  // 通知をスケジュール
  const scheduleNotification = useCallback(
    async (time: string) => {
      try {
        // 既存の通知をキャンセル
        await Notifications.cancelAllScheduledNotificationsAsync();

        if (!settings.enabled) {
          return;
        }

        // 時刻をパース
        const [hours, minutes] = time.split(":").map(Number);

        // 毎日指定時刻に通知
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "積み上げの時間です！",
            body: "今日も目標に向かって一歩前進しましょう 💪",
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
    [settings.enabled]
  );

  // 通知を有効化
  const enableNotification = async (time: string) => {
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

  // 通知を無効化
  const disableNotification = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await saveSettings({
      ...settings,
      enabled: false,
    });
  };

  // 通知時刻を変更
  const updateNotificationTime = async (time: string) => {
    const newSettings: NotificationSettings = {
      ...settings,
      time,
    };

    await saveSettings(newSettings);

    if (settings.enabled) {
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
