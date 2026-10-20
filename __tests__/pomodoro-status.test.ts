import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  module: {
    update: vi.fn(async (_payload: string) => {}), stop: vi.fn(async (_id: string) => {}),
    stopAll: vi.fn(async () => {}), hasExactAlarmPermission: vi.fn(async () => true),
    requestExactAlarmPermission: vi.fn(async () => {}),
  },
  supported: true,
}));
vi.mock("expo", () => ({ requireOptionalNativeModule: () => mocks.supported ? mocks.module : null }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-linking", () => ({ createURL: (path: string) => `tsumiagedev://${path}` }));
const state = { phase: "work" as const, timeLeft: 597, totalTime: 600, isRunning: true,
  phaseStartedAt: 1000000, workDuration: 600, breakDuration: 120, sessionsCompleted: 0 };
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); mocks.supported = true;
  mocks.module.hasExactAlarmPermission.mockResolvedValue(true); });
describe("Android ongoing Pomodoro notifications", () => {
  it("passes the fixed anchor and custom durations rather than a tick-based clock", async () => {
    const api = await import("../lib/pomodoro-status");
    await api.updatePomodoroStatus("one", "読書", state, false);
    expect(JSON.parse(mocks.module.update.mock.calls[0][0])).toMatchObject({ ...state,
      id: "one", name: "読書", autoSwitchBreak: false, itemUrl: "tsumiagedev:///item/one" });
  });
  it("keeps updates and a global cancellation in order", async () => {
    const order: string[] = [];
    mocks.module.update.mockImplementationOnce(async () => { order.push("update"); });
    mocks.module.stopAll.mockImplementationOnce(async () => { order.push("stopAll"); });
    const api = await import("../lib/pomodoro-status");
    await Promise.all([api.updatePomodoroStatus("one", "読書", state, true), api.stopPomodoroStatus()]);
    expect(order).toEqual(["update", "stopAll"]);
  });
  it("removes the status on stop but preserves a paused status with a fixed elapsed time", async () => {
    const api = await import("../lib/pomodoro-status");
    await api.updatePomodoroStatus("one", "読書", { ...state, isRunning: false, phaseStartedAt: null }, true);
    expect(JSON.parse(mocks.module.update.mock.calls[0][0])).toMatchObject({ isRunning: false, timeLeft: 597, phaseStartedAt: null });
    await api.updatePomodoroStatus("one", "読書", { ...state, phase: "idle" }, true);
    expect(mocks.module.stop).toHaveBeenCalledWith("one");
  });
  it("opens alarm permission settings without starting a timer when permission is missing", async () => {
    mocks.module.hasExactAlarmPermission.mockResolvedValue(false);
    const api = await import("../lib/pomodoro-status");
    expect(await api.ensurePomodoroAlarmPermission()).toBe(false);
    expect(mocks.module.requestExactAlarmPermission).toHaveBeenCalledOnce();
    expect(mocks.module.update).not.toHaveBeenCalled();
  });
  it("supports old APKs without a native module", async () => {
    mocks.supported = false;
    const api = await import("../lib/pomodoro-status");
    expect(api.supportsPomodoroStatus).toBe(false);
    await api.updatePomodoroStatus("one", "読書", state, true);
    await api.stopPomodoroStatus();
    expect(await api.ensurePomodoroAlarmPermission()).toBe(true);
    expect(mocks.module.update).not.toHaveBeenCalled();
    expect(mocks.module.stopAll).not.toHaveBeenCalled();
  });
});
