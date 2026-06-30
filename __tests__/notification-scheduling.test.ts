import { beforeEach, describe, expect, it, vi } from "vitest";

const notificationMocks = vi.hoisted(() => ({
  cancelScheduledNotificationAsync: vi.fn(),
  deleteNotificationChannelAsync: vi.fn(),
  dismissNotificationAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  getPresentedNotificationsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
}));

vi.mock("expo-constants", () => ({
  default: {
    executionEnvironment: "standalone",
  },
}));

vi.mock("react-native", () => ({
  NativeModules: {},
  Platform: {
    OS: "android",
    select: (options: Record<string, unknown>) => options.android ?? options.default,
  },
}));

vi.mock("expo-linking", () => ({
  createURL: (path: string) => `test-scheme://${path.replace(/^\//, "")}`,
}));

vi.mock("expo-notifications", () => ({
  ...notificationMocks,
  AndroidImportance: {
    DEFAULT: "default",
    HIGH: "high",
  },
  AndroidNotificationVisibility: {
    PUBLIC: "public",
  },
  SchedulableTriggerInputTypes: {
    DATE: "date",
  },
}));

describe("notification scheduling", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"));
    Object.values(notificationMocks).forEach((mock) => mock.mockReset());
    notificationMocks.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
    notificationMocks.deleteNotificationChannelAsync.mockResolvedValue(undefined);
    notificationMocks.dismissNotificationAsync.mockResolvedValue(undefined);
    notificationMocks.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    notificationMocks.getPresentedNotificationsAsync.mockResolvedValue([]);
    notificationMocks.getAllScheduledNotificationsAsync.mockResolvedValue([]);
    notificationMocks.scheduleNotificationAsync.mockResolvedValue("scheduled");

    const reactNative = await import("react-native");
    delete (reactNative.NativeModules as Record<string, unknown>).TsumiagePomodoroNotifications;
    vi.resetModules();
  });

  it("keeps future Pomodoro running updates when only the visible running notification is cleared", async () => {
    const { cancelPomodoroRunningNotification } = await import("../lib/pomodoro-notifications");

    notificationMocks.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: "pomodoro:item-1:running" },
      { identifier: "pomodoro:item-1:running-break-0" },
      { identifier: "pomodoro:item-1:work-0" },
    ]);

    await cancelPomodoroRunningNotification("item-1");

    expect(notificationMocks.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(notificationMocks.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "pomodoro:item-1:running"
    );
  });

  it("replaces the running notification with a sticky time-up notification when auto-switch is off", async () => {
    const { schedulePomodoroPhaseNotifications } = await import("../lib/pomodoro-notifications");

    await schedulePomodoroPhaseNotifications(
      "item-1",
      "Task",
      "work",
      Date.now() + 25 * 60 * 1000,
      false,
      5 * 60,
      25 * 60
    );

    expect(notificationMocks.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(notificationMocks.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "pomodoro:item-1:current",
        content: expect.objectContaining({
          sound: true,
          sticky: true,
          autoDismiss: false,
          data: expect.objectContaining({
            androidNotificationTag: "pomodoro:item-1:running",
            isCompletionAlert: true,
          }),
        }),
      })
    );
  });

  it("schedules silent countdown updates on the running notification tag when auto-switch is on", async () => {
    const { schedulePomodoroPhaseNotifications } = await import("../lib/pomodoro-notifications");

    await schedulePomodoroPhaseNotifications(
      "item-1",
      "Task",
      "work",
      Date.now() + 25 * 60 * 1000,
      true,
      5 * 60,
      25 * 60
    );

    expect(notificationMocks.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "pomodoro:item-1:running-break-0",
        content: expect.objectContaining({
          sound: false,
          sticky: true,
          autoDismiss: false,
          data: expect.objectContaining({
            androidChronometerMode: "countDown",
            androidNotificationTag: "pomodoro:item-1:running",
            isRunningIndicator: true,
            phase: "break",
          }),
        }),
      })
    );
    expect(notificationMocks.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "pomodoro:item-1:work-0",
        content: expect.objectContaining({
          sound: true,
          data: expect.objectContaining({
            androidNotificationTag: "pomodoro:item-1:running",
            isCompletionAlert: true,
          }),
        }),
      })
    );
  });

  it("shows the current Pomodoro phase as a sticky silent countdown notification", async () => {
    const { schedulePomodoroRunningNotification } = await import("../lib/pomodoro-notifications");

    await schedulePomodoroRunningNotification(
      "item-1",
      "Task",
      "work",
      Date.now() + 25 * 60 * 1000
    );

    expect(notificationMocks.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "pomodoro:item-1:running",
        content: expect.objectContaining({
          sound: false,
          sticky: true,
          autoDismiss: false,
          data: expect.objectContaining({
            kind: "pomodoro",
            itemId: "item-1",
            phase: "work",
            androidChronometerMode: "countDown",
            androidNotificationTag: "pomodoro:item-1:running",
            isRunningIndicator: true,
          }),
        }),
        trigger: {
          channelId: "pomodoro-running-v1",
        },
      })
    );
  });

  it("uses the Android native Pomodoro alarm module when it is available", async () => {
    const reactNative = await import("react-native");
    const nativeModule = {
      cancelPomodoroAlarm: vi.fn().mockResolvedValue(true),
      schedulePomodoroAlarm: vi.fn().mockResolvedValue(true),
    };
    (reactNative.NativeModules as Record<string, unknown>).TsumiagePomodoroNotifications =
      nativeModule;

    vi.resetModules();
    const { schedulePomodoroRunningNotification } = await import("../lib/pomodoro-notifications");

    await schedulePomodoroRunningNotification("item-1", "Task", "work", Date.now() + 25 * 60 * 1000, {
      autoSwitchBreak: true,
      breakDurationSeconds: 5 * 60,
      workDurationSeconds: 25 * 60,
      sessionsCompleted: 3,
    });

    expect(nativeModule.cancelPomodoroAlarm).toHaveBeenCalledWith("item-1");
    expect(nativeModule.schedulePomodoroAlarm).toHaveBeenCalledWith({
      itemId: "item-1",
      itemName: "Task",
      phase: "work",
      phaseStartedAt: Date.now(),
      phaseEndsAt: Date.now() + 25 * 60 * 1000,
      autoSwitchBreak: true,
      workDurationSeconds: 25 * 60,
      breakDurationSeconds: 5 * 60,
      sessionsCompleted: 3,
      deepLinkUrl: "test-scheme://item/item-1",
    });
    expect(notificationMocks.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("reports Pomodoro running notification scheduling failure when permission is not granted", async () => {
    const { schedulePomodoroRunningNotification } = await import("../lib/pomodoro-notifications");
    notificationMocks.getPermissionsAsync.mockResolvedValue({ status: "denied" });
    notificationMocks.requestPermissionsAsync.mockResolvedValue({ status: "denied" });

    const scheduled = await schedulePomodoroRunningNotification(
      "item-1",
      "Task",
      "work",
      Date.now() + 25 * 60 * 1000
    );

    expect(scheduled).toBe(false);
    expect(notificationMocks.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("shows a sticky normal stacking notification with a count-up chronometer", async () => {
    const { scheduleLongSessionReminder } = await import(
      "../lib/long-running-session-notifications"
    );
    const startedAt = Date.now() - 90_000;

    await scheduleLongSessionReminder("item-1", "Reading", startedAt);

    expect(notificationMocks.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "long-session:item-1",
        content: expect.objectContaining({
          sound: false,
          sticky: true,
          autoDismiss: false,
          data: expect.objectContaining({
            kind: "long-session",
            itemId: "item-1",
            startedAt,
            androidChronometerMode: "countUp",
            androidNotificationTag: "long-session:item-1",
          }),
        }),
        trigger: {
          channelId: "active-stack-session-v1",
        },
      })
    );
  });

  it("reports normal stacking notification scheduling failure when permission is not granted", async () => {
    const { scheduleLongSessionReminder } = await import(
      "../lib/long-running-session-notifications"
    );
    notificationMocks.getPermissionsAsync.mockResolvedValue({ status: "denied" });

    const scheduled = await scheduleLongSessionReminder("item-1", "Reading", Date.now());

    expect(scheduled).toBe(false);
    expect(notificationMocks.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
