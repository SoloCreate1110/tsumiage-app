import Constants from "expo-constants";
import { loadNotifications } from "./notifications-runtime";
import { Platform } from "react-native";
import { WORK_DURATION, BREAK_DURATION } from "@/lib/pomodoro-clock";

const notificationsUnsupported = Constants.executionEnvironment === "storeClient" || Platform.OS === "web";
// Limit OS reservations; opening the timer renews the next 24 cycles.
const MAX_PHASE_NOTIFICATIONS = 48;
const CHANNEL_ID = "pomodoro";
const queues = new Map<string, Promise<void>>();

function enqueue(itemId: string, operation: () => Promise<void>) {
  const next = (queues.get(itemId) ?? Promise.resolve()).catch(() => {}).then(operation);
  queues.set(itemId, next);
  void next.finally(() => {
    if (queues.get(itemId) === next) queues.delete(itemId);
  }).catch(() => {});
  return next;
}

async function cancelScheduled(itemId: string) {
  const Notifications = await loadNotifications();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter(notification => {
    const data = notification.content.data;
    return data?.itemId === itemId && data.kind === "pomodoro-phase";
  }).map(notification => Notifications.cancelScheduledNotificationAsync(notification.identifier)));
}

export async function preparePomodoroNotificationChannel() {
  if (notificationsUnsupported || Platform.OS !== "android") return;
  const Notifications = await loadNotifications();
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "ポモドーロタイマー", importance: Notifications.AndroidImportance.HIGH,
    sound: "default", vibrationPattern: [0, 250, 250, 250],
  });
}

export async function cancelPomodoroNotifications(itemId: string) {
  if (notificationsUnsupported) return;
  return enqueue(itemId, () => cancelScheduled(itemId));
}

export async function schedulePomodoroPhaseNotifications(
  itemId: string,
  name: string,
  currentPhase: "work" | "break",
  phaseEndsAt: number,
  autoSwitchBreak: boolean,
  workDuration = WORK_DURATION,
  breakDuration = BREAK_DURATION
) {
  if (notificationsUnsupported) return;
  return enqueue(itemId, async () => {
    const Notifications = await loadNotifications();
    await cancelScheduled(itemId);
    await preparePomodoroNotificationChannel();
    let deadline = phaseEndsAt;
    let endingPhase = currentPhase;
    for (let index = 0; index < MAX_PHASE_NOTIFICATIONS; index += 1) {
      const nextPhase = endingPhase === "work" ? "break" : "work";
      if (deadline > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: nextPhase === "break" ? `${name} の休憩開始` : `${name} の作業開始`,
            body: nextPhase === "break"
              ? "作業時間が終わりました。少し休憩しましょう。"
              : "休憩が終わりました。次の作業を始めましょう。",
            sound: true,
            data: { itemId, kind: "pomodoro-phase", phase: nextPhase, order: index },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(deadline), channelId: CHANNEL_ID },
        });
      }
      if (!autoSwitchBreak && endingPhase === "work") break;
      deadline += (nextPhase === "break" ? breakDuration : workDuration) * 1000;
      endingPhase = nextPhase;
    }
  });
}

// Remove delivered completion cards, preserving scheduled alarms and ongoing timers.
export async function dismissDeliveredPomodoroNotifications() {
  if (notificationsUnsupported) return;
  const Notifications = await loadNotifications();
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(presented.filter(notification =>
    notification.request.content.data?.kind === "pomodoro-phase"
  ).map(notification => Notifications.dismissNotificationAsync(notification.request.identifier)));
}
