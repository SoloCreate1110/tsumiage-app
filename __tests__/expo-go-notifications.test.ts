import { expect, it, vi } from "vitest";

const nativeImport = vi.hoisted(() => vi.fn(() => {
  throw new Error("Cannot find native module 'ExpoTopicSubscriptionModule'");
}));
vi.mock("expo-constants", () => ({ default: { executionEnvironment: "storeClient" } }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-notifications", nativeImport);
vi.mock("@/lib/pomodoro-clock", () => ({ WORK_DURATION: 1500, BREAK_DURATION: 300 }));

it("loads timer and reminder code in Expo Go without evaluating native notifications", async () => {
  const timer = await import("../lib/pomodoro-notifications");
  const reminders = await import("../lib/item-reminders");
  await timer.dismissDeliveredPomodoroNotifications();
  await timer.preparePomodoroNotificationChannel();
  await timer.cancelPomodoroNotifications("test");
  await timer.schedulePomodoroPhaseNotifications("test", "Test", "work", Date.now(), false);
  await reminders.cancelItemReminders("test");
  await reminders.syncAllItemReminders([]);
  expect(await reminders.scheduleItemReminders("test", "Test", [])).toBe(false);
  expect(nativeImport).not.toHaveBeenCalled();
});
