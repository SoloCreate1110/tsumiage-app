import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  scheduled: [] as { identifier: string; content: { data: { itemId: string; kind: string }; sound: boolean }; trigger: { date: Date; channelId: string } }[],
  nextId: 0,
}));
vi.mock("expo-constants", () => ({ default: { executionEnvironment: "standalone" } }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("@/lib/pomodoro-clock", () => ({ WORK_DURATION: 1500, BREAK_DURATION: 300 }));
vi.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  getAllScheduledNotificationsAsync: async () => [...native.scheduled],
  cancelScheduledNotificationAsync: async (identifier: string) => {
    native.scheduled = native.scheduled.filter(n => n.identifier !== identifier);
  },
  setNotificationChannelAsync: vi.fn(async () => {}),
  scheduleNotificationAsync: async (request: Omit<(typeof native.scheduled)[number], "identifier">) => {
    const identifier = String(++native.nextId);
    native.scheduled.push({ ...request, identifier });
    return identifier;
  },
}));

import { cancelPomodoroNotifications, schedulePomodoroPhaseNotifications } from "../lib/pomodoro-notifications";

describe("pomodoro OS notifications", () => {
  beforeEach(() => { native.scheduled = []; });
  it("uses absolute deadlines and custom durations for successive audible notifications", async () => {
    const deadline = Date.now() + 600000;
    await schedulePomodoroPhaseNotifications("a", "Study", "work", deadline, true, 600, 120);
    expect(native.scheduled).toHaveLength(48);
    expect(native.scheduled.slice(0, 3).map(n => n.trigger.date.getTime())).toEqual([deadline, deadline + 120000, deadline + 720000]);
    expect(native.scheduled.every(n => n.content.sound && n.trigger.channelId === "pomodoro")).toBe(true);
  });
  it("does not leave stale notifications when pause races with scheduling", async () => {
    await Promise.all([
      schedulePomodoroPhaseNotifications("a", "Study", "work", Date.now() + 600000, true),
      cancelPomodoroNotifications("a"),
    ]);
    expect(native.scheduled).toHaveLength(0);
  });
  it("keeps another item's notifications when cancelling", async () => {
    await schedulePomodoroPhaseNotifications("b", "Read", "work", Date.now() + 600000, false);
    await cancelPomodoroNotifications("a");
    expect(native.scheduled).toHaveLength(1);
    expect(native.scheduled[0].content.data.itemId).toBe("b");
  });
  it("stops at the work boundary when auto break is disabled", async () => {
    await schedulePomodoroPhaseNotifications("a", "Study", "work", Date.now() + 600000, false);
    expect(native.scheduled).toHaveLength(1);
  });
  it("schedules the next work completion after a manually resumed break", async () => {
    const deadline = Date.now() + 120000;
    await schedulePomodoroPhaseNotifications("a", "Study", "break", deadline, false, 600, 120);
    expect(native.scheduled.map(n => n.trigger.date.getTime())).toEqual([deadline, deadline + 600000]);
  });
});
