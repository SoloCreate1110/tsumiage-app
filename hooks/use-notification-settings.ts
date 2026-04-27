import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useEffect, useState } from "react";

const NOTIFICATION_SETTINGS_KEY = "notification_settings";

export interface NotificationSettings {
  enabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
};

const isExpoGo = Constants.executionEnvironment === "storeClient";
const notificationsUnsupported = isExpoGo || Platform.OS === "web";

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
    void loadSettings();
    void checkPermission();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data) as Partial<NotificationSettings>;
        setSettings({
          enabled: parsed.enabled ?? false,
        });
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (nextSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(nextSettings));
      setSettings(nextSettings);
    } catch (error) {
      console.error("Failed to save notification settings:", error);
    }
  };

  const checkPermission = async () => {
    if (notificationsUnsupported) {
      setPermissionStatus("unsupported");
      return;
    }
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };

  const requestPermission = async (): Promise<boolean> => {
    if (notificationsUnsupported) return false;
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);
    return status === "granted";
  };

  const enableNotification = async () => {
    if (notificationsUnsupported) return false;
    const hasPermission = await requestPermission();
    if (!hasPermission) return false;

    await saveSettings({ enabled: true });
    return true;
  };

  const disableNotification = async () => {
    if (!notificationsUnsupported) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    await saveSettings({ enabled: false });
  };

  return {
    settings,
    loading,
    permissionStatus,
    enableNotification,
    disableNotification,
    requestPermission,
  };
}
