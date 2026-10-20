import { beforeEach, describe, expect, it, vi } from "vitest";
const notifications = vi.hoisted(() => ({
  presented: [] as { request: { identifier: string; content: { data?: Record<string, unknown> } } }[],
  dismiss: vi.fn(async (_id: string) => {}),
  cancel: vi.fn(async (_id: string) => {}),
}));
vi.mock("expo-constants", () => ({ default: { executionEnvironment: "standalone" } }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("@/lib/pomodoro-clock", () => ({ WORK_DURATION: 1500, BREAK_DURATION: 300 }));
vi.mock("expo-notifications", () => ({
  getPresentedNotificationsAsync: async () => notifications.presented,
  dismissNotificationAsync: notifications.dismiss,
  cancelScheduledNotificationAsync: notifications.cancel,
}));
import { dismissDeliveredPomodoroNotifications } from "../lib/pomodoro-notifications";
beforeEach(() => { vi.clearAllMocks(); notifications.presented = []; });
describe("dismiss delivered Pomodoro completions on app opening", () => {
  it("removes only completion cards and preserves ongoing timers, reminders and future alarms", async () => {
    notifications.presented = [
      { request: { identifier: "complete", content: { data: { kind: "pomodoro-phase" } } } },
      { request: { identifier: "timer", content: { data: { kind: "pomodoro-native" } } } },
      { request: { identifier: "reminder", content: { data: { kind: "item-reminder" } } } },
      { request: { identifier: "unknown", content: {} } },
    ];
    await dismissDeliveredPomodoroNotifications();
    expect(notifications.dismiss).toHaveBeenCalledTimes(1);
    expect(notifications.dismiss).toHaveBeenCalledWith("complete");
    expect(notifications.cancel).not.toHaveBeenCalled();
  });
  it("handles startup with no delivered notifications", async () => {
    await dismissDeliveredPomodoroNotifications();
    expect(notifications.dismiss).not.toHaveBeenCalled();
  });
});
