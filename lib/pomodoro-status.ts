import { requireOptionalNativeModule } from "expo";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import type { PersistedPomodoroState } from "@/lib/pomodoro-clock";

interface StatusModule {
  update(payload: string): Promise<void>;
  stop(itemId: string): Promise<void>;
  stopAll(): Promise<void>;
  hasExactAlarmPermission(): Promise<boolean>;
  requestExactAlarmPermission(): Promise<void>;
}
const native = Platform.OS === "android"
  ? requireOptionalNativeModule<StatusModule>("PomodoroStatus") : null;
export const supportsPomodoroStatus = native !== null;
// A single queue also orders a global disable against pending item updates.
let queue = Promise.resolve();
function enqueue(operation: () => Promise<void>) {
  const next = queue.catch(() => {}).then(operation);
  queue = next;
  return next;
}
export function stopPomodoroStatus(itemId?: string) {
  return enqueue(async () => {
    if (itemId) await native?.stop(itemId);
    else await native?.stopAll();
  });
}
export function updatePomodoroStatus(itemId: string, name: string,
  state: PersistedPomodoroState, autoSwitchBreak: boolean) {
  return enqueue(async () => {
    if (!native) return;
    if (state.phase === "idle") { await native.stop(itemId); return; }
    await native.update(JSON.stringify({ ...state, id: itemId, name,
      itemUrl: Linking.createURL(`/item/${encodeURIComponent(itemId)}`),
      workDuration: state.workDuration ?? 1500, breakDuration: state.breakDuration ?? 300,
      autoSwitchBreak }));
  });
}
export async function ensurePomodoroAlarmPermission() {
  if (!native || await native.hasExactAlarmPermission()) return true;
  await native.requestExactAlarmPermission();
  return false;
}
