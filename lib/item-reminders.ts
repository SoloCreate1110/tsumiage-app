import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { ReminderSlot, StackItem } from "@/types/stack";

const isExpoGo = Constants.executionEnvironment === "storeClient";
const notificationsUnsupported = isExpoGo || Platform.OS === "web";

export function notificationsAreUnsupported() {
  return notificationsUnsupported;
}

export async function cancelItemReminders(itemId: string) {
  if (notificationsUnsupported) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => {
        const data = notification.content.data as { itemId?: string } | undefined;
        return data?.itemId === itemId;
      })
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
  );
}

export async function scheduleItemReminders(
  itemId: string,
  name: string,
  slots: ReminderSlot[]
) {
  if (notificationsUnsupported) return false;

  await cancelItemReminders(itemId);
  const enabledSlots = slots.filter((slot) => slot.enabled);

  await Promise.all(
    enabledSlots.map(async (slot) => {
      const [hour, minute] = slot.time.split(":").map(Number);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${name}の時間です`,
          body: "今日の積み上げを少し進めましょう。",
          data: { itemId, slotId: slot.id },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    })
  );

  return true;
}

export async function syncAllItemReminders(items: StackItem[]) {
  if (notificationsUnsupported) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const item of items) {
    const visibleCount = Math.min(5, Math.max(1, item.reminderSlotCount ?? 1));
    const visibleSlots = (item.reminderSlots ?? []).slice(0, visibleCount);
    const enabledSlots = visibleSlots.filter((slot) => slot.enabled);
    if (enabledSlots.length === 0) continue;
    await scheduleItemReminders(item.id, item.name, enabledSlots);
  }
}
