import { describe, expect, it } from "vitest";
import { createIdleState, reconcilePomodoro, isPomodoroState, WORK_DURATION } from "../lib/pomodoro-clock";
const start = 1000000;
const running = () => ({ ...createIdleState(), phase: "work" as const, isRunning: true, phaseStartedAt: start });

describe("pomodoro wall clock", () => {
  it("does not double subtract elapsed time across consecutive ticks", () => {
    let state = running();
    for (let seconds = 1; seconds < 1500; seconds++) {
      const result = reconcilePomodoro(state, start + seconds * 1000, true);
      expect(result.workCompleted).toBe(0);
      expect(result.state.timeLeft).toBe(1500 - seconds);
      expect(result.state.phaseStartedAt).toBe(start);
      state = result.state as ReturnType<typeof running>;
    }
  });
  it("preserves subsecond precision", () => {
    const first = reconcilePomodoro(running(), start + 1999, true);
    expect(reconcilePomodoro(first.state, start + 2000, true).state.timeLeft).toBe(1498);
  });
  it("reconciles sleep across multiple cycles and reports each work session once", () => {
    const result = reconcilePomodoro(running(), start + 65 * 60000, true);
    expect(result.workCompleted).toBe(2);
    expect(result.breaksCompleted).toBe(2);
    expect(result.state).toMatchObject({ phase: "work", timeLeft: 1200, sessionsCompleted: 2 });
    expect(reconcilePomodoro(result.state, start + 65 * 60000, true).workCompleted).toBe(0);
  });
  it("restores a persisted timer at the exact phase boundary", () => {
    const stored = JSON.parse(JSON.stringify(reconcilePomodoro(running(), start + 700000, true).state));
    const result = reconcilePomodoro(stored, start + 1500000, true);
    expect(result.workCompleted).toBe(1);
    expect(result.state).toMatchObject({ phase: "break", timeLeft: 300, sessionsCompleted: 1 });
  });
  it("waits for manual break resume when auto switch is disabled", () => {
    const result = reconcilePomodoro(running(), start + 4 * 3600000, false);
    expect(result.workCompleted).toBe(1);
    expect(result.state).toMatchObject({ phase: "break", timeLeft: 300, isRunning: false, phaseStartedAt: null });
    expect(reconcilePomodoro(result.state, start + 5 * 3600000, false).workCompleted).toBe(0);
  });
  it("keeps paused time unchanged and resumes from remaining time", () => {
    const paused = { ...reconcilePomodoro(running(), start + 600000, true).state, isRunning: false, phaseStartedAt: null };
    expect(reconcilePomodoro(paused, start + 3600000, true).state.timeLeft).toBe(900);
    const resumed = { ...paused, isRunning: true, phaseStartedAt: start + 3600000 - 600000 };
    expect(reconcilePomodoro(resumed, start + 3601000, true).state.timeLeft).toBe(899);
  });
  it("handles a clock moving backwards without increasing the duration", () => {
    expect(reconcilePomodoro(running(), start - 1000, true).state.timeLeft).toBe(WORK_DURATION);
  });
  it("rejects corrupt persisted states", () => {
    expect(isPomodoroState(running())).toBe(true);
    expect(isPomodoroState({ ...running(), totalTime: 0 })).toBe(false);
    expect(isPomodoroState({ ...running(), phaseStartedAt: null })).toBe(false);
    expect(isPomodoroState(null)).toBe(false);
  });
});

it("uses custom durations for repeated cycles and the recorded work time", () => {
  const custom = { ...running(), totalTime: 600, timeLeft: 600, workDuration: 600, breakDuration: 120 };
  const result = reconcilePomodoro(custom, start + 26 * 60000, true);
  expect(result.workCompleted).toBe(2);
  expect(result.workSeconds).toBe(1200);
  expect(result.state).toMatchObject({ phase: "work", timeLeft: 480, sessionsCompleted: 2 });
  expect(isPomodoroState(result.state)).toBe(true);
});
