import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { ReminderSlot, StackItem } from "@/types/stack";

const ITEM_REMINDER_PREFIX = "item-reminder";

export function notificationsAreUnsupported(): boolean {
  return Platform.OS === "web" || Constants.executionEnvironment === "storeClient";
}

function notificationId(itemId: string, slotId: string): string {
  return `${ITEM_REMINDER_PREFIX}:${itemId}:${slotId}`;
}

export async function cancelItemReminders(itemId: string): Promise<void> {
  if (notificationsAreUnsupported()) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.identifier.startsWith(`${ITEM_REMINDER_PREFIX}:${itemId}:`))
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
  );
}

export async function scheduleItemReminders(
  itemId: string,
  itemName: string,
  reminderSlots: ReminderSlot[]
): Promise<void> {
  if (notificationsAreUnsupported()) return;

  await cancelItemReminders(itemId);

  const enabledSlots = reminderSlots.filter((slot) => slot.enabled);
  await Promise.all(
    enabledSlots.map((slot) => {
      const [hour, minute] = slot.time.split(":").map((value) => parseInt(value, 10));
      if (Number.isNaN(hour) || Number.isNaN(minute)) return Promise.resolve();

      return Notifications.scheduleNotificationAsync({
        identifier: notificationId(itemId, slot.id),
        content: {
          title: itemName,
          body: "今日の積み上げを記録しましょう。",
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
}

export async function syncAllItemReminders(items: StackItem[]): Promise<void> {
  if (notificationsAreUnsupported()) return;

  await Promise.all(
    items.map(async (item) => {
      const visibleCount = Math.min(5, Math.max(1, item.reminderSlotCount ?? 1));
      const visibleSlots = (item.reminderSlots ?? []).slice(0, visibleCount);

      if (visibleSlots.some((slot) => slot.enabled)) {
        await scheduleItemReminders(item.id, item.name, visibleSlots);
      } else {
        await cancelItemReminders(item.id);
      }
    })
  );
}
