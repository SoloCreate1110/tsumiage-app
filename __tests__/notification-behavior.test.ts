import { describe, expect, it } from "vitest";
import { foregroundNotificationBehavior } from "../lib/notification-behavior";
describe("foreground Pomodoro completion", () => {
  it("plays sound without a popup or completion card", () => {
    expect(foregroundNotificationBehavior({ kind: "pomodoro-phase", phase: "break" })).toEqual({
      shouldShowAlert: false, shouldPlaySound: true, shouldSetBadge: false,
      shouldShowBanner: false, shouldShowList: false,
    });
  });
  it("preserves the presentation of other reminders", () => {
    expect(foregroundNotificationBehavior({ kind: "item-reminder" })).toMatchObject({
      shouldShowAlert: true, shouldPlaySound: true, shouldShowBanner: true, shouldShowList: true,
    });
  });
  it("preserves notifications without Pomodoro metadata", () => {
    expect(foregroundNotificationBehavior(undefined).shouldShowBanner).toBe(true);
  });
});
