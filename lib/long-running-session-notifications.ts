import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const LONG_SESSION_NOTIFICATION_PREFIX = "long-session";
const LONG_SESSION_NOTIFICATION_CHANNEL_ID = "active-stack-session-v1";

function notificationsAreUnsupported(): boolean {
  return Platform.OS === "web" || Constants.executionEnvironment === "storeClient";
}

function notificationId(itemId: string): string {
  return `${LONG_SESSION_NOTIFICATION_PREFIX}:${itemId}`;
}

function formatElapsed(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

async function ensureLongSessionNotificationChannel() {
  if (notificationsAreUnsupported()) return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(LONG_SESSION_NOTIFICATION_CHANNEL_ID, {
      name: "積み上げ中",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: [],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  return current.status === "granted";
}

export async function cancelLongSessionReminder(itemId: string): Promise<void> {
  if (notificationsAreUnsupported()) return;
  const id = notificationId(itemId);

  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
    Notifications.dismissNotificationAsync(id).catch(() => undefined),
  ]);
}

export async function scheduleLongSessionReminder(
  itemId: string,
  itemName: string,
  startedAt: number = Date.now()
): Promise<boolean> {
  if (notificationsAreUnsupported()) return false;
  const ready = await ensureLongSessionNotificationChannel();
  if (!ready) return false;

  await cancelLongSessionReminder(itemId);

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));

  await Notifications.scheduleNotificationAsync({
    identifier: notificationId(itemId),
    content: {
      title: `${itemName} 積み上げ中`,
      body: `経過 ${formatElapsed(elapsedSeconds)} ・タップして戻る`,
      sound: false,
      sticky: true,
      autoDismiss: false,
      data: {
        kind: "long-session",
        itemId,
        startedAt,
        androidChronometerMode: "countUp",
        androidNotificationTag: notificationId(itemId),
      },
    },
    trigger: {
      channelId: LONG_SESSION_NOTIFICATION_CHANNEL_ID,
    },
  });
  return true;
}
