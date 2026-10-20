export const WORK_DURATION = 25 * 60;
export const BREAK_DURATION = 5 * 60;
export type PomodoroPhase = "work" | "break" | "idle";
export interface PomodoroState {
  phase: PomodoroPhase;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  sessionsCompleted: number;
}
export interface PersistedPomodoroState extends PomodoroState {
  phaseStartedAt: number | null;
  workDuration?: number;
  breakDuration?: number;
}
export const createIdleState = (): PersistedPomodoroState => ({
  phase: "idle", timeLeft: WORK_DURATION, totalTime: WORK_DURATION,
  isRunning: false, sessionsCompleted: 0, phaseStartedAt: null,
});

export const normalizeDuration = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isInteger(value) && value >= 60 && value <= 24 * 3600 ? value : fallback;

export function isPomodoroState(value: unknown): value is PersistedPomodoroState {
  if (!value || typeof value !== "object") return false;
  const s = value as PersistedPomodoroState;
  return ["idle", "work", "break"].includes(s.phase) &&
    s.totalTime === (s.phase === "break" ? normalizeDuration(s.breakDuration, BREAK_DURATION) : normalizeDuration(s.workDuration, WORK_DURATION)) &&
    Number.isInteger(s.timeLeft) && s.timeLeft >= 0 && s.timeLeft <= s.totalTime &&
    Number.isInteger(s.sessionsCompleted) && s.sessionsCompleted >= 0 &&
    typeof s.isRunning === "boolean" &&
    (s.phaseStartedAt === null || Number.isFinite(s.phaseStartedAt)) &&
    (!s.isRunning || (s.phase !== "idle" && s.phaseStartedAt !== null));
}

// The phase start is a fixed wall-clock anchor, never a last-tick timestamp.
export function reconcilePomodoro(input: PersistedPomodoroState, now: number, autoSwitchBreak: boolean) {
  let state = { ...input };
  let workCompleted = 0;
  let breaksCompleted = 0;
  let workSeconds = 0;
  const workDuration = normalizeDuration(input.workDuration, WORK_DURATION);
  const breakDuration = normalizeDuration(input.breakDuration, BREAK_DURATION);
  if (!state.isRunning || state.phase === "idle" || state.phaseStartedAt === null) {
    return { state, workCompleted, breaksCompleted, workSeconds };
  }
  let elapsed = Math.max(0, Math.floor((now - state.phaseStartedAt) / 1000));
  while (elapsed >= state.totalTime) {
    elapsed -= state.totalTime;
    const nextStart = state.phaseStartedAt! + state.totalTime * 1000;
    if (state.phase === "work") {
      workCompleted += 1;
      workSeconds += state.totalTime;
      state = { ...state, phase: "break", timeLeft: breakDuration,
        totalTime: breakDuration, sessionsCompleted: state.sessionsCompleted + 1,
        isRunning: autoSwitchBreak, phaseStartedAt: autoSwitchBreak ? nextStart : null };
      if (!autoSwitchBreak) return { state, workCompleted, breaksCompleted, workSeconds };
    } else {
      breaksCompleted += 1;
      state = { ...state, phase: "work", timeLeft: workDuration,
        totalTime: workDuration, phaseStartedAt: nextStart };
    }
  }
  state.timeLeft = state.totalTime - elapsed;
  return { state, workCompleted, breaksCompleted, workSeconds };
}
