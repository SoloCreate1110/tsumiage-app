import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { NativeModules, Platform } from "react-native";

type PomodoroPhase = "idle" | "work" | "break";

const POMODORO_NOTIFICATION_PREFIX = "pomodoro";
const POMODORO_NOTIFICATION_CHANNEL_ID = "pomodoro-timer-v3";
const POMODORO_RUNNING_NOTIFICATION_CHANNEL_ID = "pomodoro-running-v1";
const OLD_POMODORO_NOTIFICATION_CHANNEL_IDS = ["pomodoro", "pomodoro-timer-v2"];
const DEFAULT_WORK_DURATION_SECONDS = 25 * 60;
const DEFAULT_BREAK_DURATION_SECONDS = 5 * 60;
const MAX_ALTERNATING_NOTIFICATIONS = 96;

type NativePomodoroNotificationModule = {
  schedulePomodoroAlarm?: (options: {
    itemId: string;
    itemName: string;
    phase: Exclude<PomodoroPhase, "idle">;
    phaseStartedAt: number;
    phaseEndsAt: number;
    autoSwitchBreak: boolean;
    workDurationSeconds: number;
    breakDurationSeconds: number;
    sessionsCompleted: number;
    deepLinkUrl: string;
  }) => Promise<boolean>;
  cancelPomodoroAlarm?: (itemId: string) => Promise<boolean>;
  getPomodoroSnapshot?: (itemId: string) => Promise<string | null>;
};

export type NativePomodoroSnapshot = {
  itemId: string;
  phase: Exclude<PomodoroPhase, "idle">;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  sessionsCompleted: number;
  phaseStartedAt: number | null;
  workDurationSeconds: number;
  breakDurationSeconds: number;
  phaseEndsAt?: number;
  completedByNativeNotification?: boolean;
  updatedAt?: number;
};

function notificationsAreUnsupported(): boolean {
  return Platform.OS === "web" || Constants.executionEnvironment === "storeClient";
}

function nativePomodoroNotifications(): NativePomodoroNotificationModule | null {
  if (Platform.OS !== "android") return null;
  const module = NativeModules.TsumiagePomodoroNotifications as
    | NativePomodoroNotificationModule
    | undefined;
  return module?.schedulePomodoroAlarm ? module : null;
}

function notificationPrefix(itemId: string): string {
  return `${POMODORO_NOTIFICATION_PREFIX}:${itemId}:`;
}

function notificationId(itemId: string, kind: string): string {
  return `${notificationPrefix(itemId)}${kind}`;
}

function runningNotificationTag(itemId: string): string {
  return notificationId(itemId, "running");
}

function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function phaseLabel(phase: PomodoroPhase): string {
  return phase === "break" ? "休憩中" : "作業中";
}

export async function readNativePomodoroSnapshot(
  itemId: string
): Promise<NativePomodoroSnapshot | null> {
  const nativeModule = nativePomodoroNotifications();
  if (!nativeModule?.getPomodoroSnapshot) return null;

  const raw = await nativeModule.getPomodoroSnapshot(itemId).catch(() => null);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as NativePomodoroSnapshot;
    if (parsed.itemId !== itemId || (parsed.phase !== "work" && parsed.phase !== "break")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function ensurePomodoroNotificationsReady(): Promise<boolean> {
  if (notificationsAreUnsupported()) return false;

  if (Platform.OS === "android") {
    await Promise.all(
      OLD_POMODORO_NOTIFICATION_CHANNEL_IDS.map((channelId) =>
        Notifications.deleteNotificationChannelAsync(channelId).catch(() => undefined)
      )
    );
    await Notifications.setNotificationChannelAsync(POMODORO_NOTIFICATION_CHANNEL_ID, {
      name: "ポモドーロ終了",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF6B35",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(POMODORO_RUNNING_NOTIFICATION_CHANNEL_ID, {
      name: "ポモドーロ進行中",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: [],
      lightColor: "#FF6B35",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function cancelPomodoroNotifications(itemId: string): Promise<void> {
  if (notificationsAreUnsupported()) return;
  await nativePomodoroNotifications()?.cancelPomodoroAlarm?.(itemId).catch(() => undefined);

  const prefix = notificationPrefix(itemId);
  const [scheduled, presented] = await Promise.all([
    Notifications.getAllScheduledNotificationsAsync(),
    Notifications.getPresentedNotificationsAsync().catch(() => []),
  ]);

  await Promise.all([
    ...scheduled
      .filter((notification) => notification.identifier.startsWith(prefix))
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => undefined)
      ),
    ...presented
      .filter((notification) => notification.request.identifier.startsWith(prefix))
      .map((notification) =>
        Notifications.dismissNotificationAsync(notification.request.identifier).catch(() => undefined)
      ),
  ]);
}

export async function cancelPomodoroRunningNotification(itemId: string): Promise<void> {
  if (notificationsAreUnsupported()) return;
  await nativePomodoroNotifications()?.cancelPomodoroAlarm?.(itemId).catch(() => undefined);
  const id = notificationId(itemId, "running");
  const prefix = notificationPrefix(itemId);
  const [scheduled, presented] = await Promise.all([
    Notifications.getAllScheduledNotificationsAsync(),
    Notifications.getPresentedNotificationsAsync().catch(() => []),
  ]);

  const shouldCancelScheduled = (notification: Notifications.NotificationRequest) =>
    notification.identifier === id;

  const shouldDismissPresented = (notification: Notifications.Notification) => {
    const data = notification.request.content.data as
      | { androidNotificationTag?: unknown }
      | undefined;
    return (
      notification.request.identifier === id ||
      notification.request.identifier.startsWith(`${prefix}running-`) ||
      data?.androidNotificationTag === id
    );
  };

  await Promise.all([
    ...scheduled
      .filter(shouldCancelScheduled)
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => undefined)
      ),
    ...presented
      .filter(shouldDismissPresented)
      .map((notification) =>
        Notifications.dismissNotificationAsync(notification.request.identifier).catch(() => undefined)
      ),
    Notifications.dismissNotificationAsync(id).catch(() => undefined),
  ]);
}

export async function schedulePomodoroRunningNotification(
  itemId: string,
  itemName: string,
  phase: Exclude<PomodoroPhase, "idle">,
  phaseEndsAt: number,
  options?: {
    autoSwitchBreak?: boolean;
    breakDurationSeconds?: number;
    workDurationSeconds?: number;
    sessionsCompleted?: number;
  }
): Promise<boolean> {
  if (notificationsAreUnsupported() || phaseEndsAt <= Date.now()) return false;

  const ready = await ensurePomodoroNotificationsReady();
  if (!ready) return false;

  await cancelPomodoroRunningNotification(itemId);

  const remainingSeconds = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
  const workDurationSeconds = Math.max(
    1,
    Math.ceil(options?.workDurationSeconds ?? DEFAULT_WORK_DURATION_SECONDS)
  );
  const breakDurationSeconds = Math.max(
    1,
    Math.ceil(options?.breakDurationSeconds ?? DEFAULT_BREAK_DURATION_SECONDS)
  );
  const phaseDurationSeconds = phase === "break" ? breakDurationSeconds : workDurationSeconds;
  const phaseStartedAt = phaseEndsAt - phaseDurationSeconds * 1000;
  const nativeModule = nativePomodoroNotifications();

  if (nativeModule?.schedulePomodoroAlarm) {
    await nativeModule.schedulePomodoroAlarm({
      itemId,
      itemName,
      phase,
      phaseStartedAt,
      phaseEndsAt,
      autoSwitchBreak: options?.autoSwitchBreak ?? true,
      workDurationSeconds,
      breakDurationSeconds,
      sessionsCompleted: options?.sessionsCompleted ?? 0,
      deepLinkUrl: Linking.createURL(`/item/${itemId}`),
    });
    return true;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: notificationId(itemId, "running"),
    content: {
      title: `${itemName} ポモドーロ${phaseLabel(phase)}`,
      body: `残り ${formatCountdown(remainingSeconds)} ・タップして戻る`,
      sound: false,
      sticky: true,
      autoDismiss: false,
      data: {
        kind: "pomodoro",
        itemId,
        phase,
        phaseEndsAt,
        androidChronometerMode: "countDown",
        androidNotificationTag: runningNotificationTag(itemId),
        isRunningIndicator: true,
      },
    },
    trigger: {
      channelId: POMODORO_RUNNING_NOTIFICATION_CHANNEL_ID,
    },
  });
  return true;
}

async function schedulePomodoroNotification(
  itemId: string,
  identifierKind: string,
  title: string,
  body: string,
  targetAt: number,
  sticky: boolean,
  androidNotificationTag?: string
): Promise<boolean> {
  await Notifications.scheduleNotificationAsync({
    identifier: notificationId(itemId, identifierKind),
    content: {
      title,
      body,
      sound: true,
      sticky,
      autoDismiss: !sticky,
      data: {
        kind: "pomodoro",
        itemId,
        targetAt,
        androidNotificationTag,
        isCompletionAlert: true,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(targetAt),
      channelId: POMODORO_NOTIFICATION_CHANNEL_ID,
    },
  });
  return true;
}

async function schedulePomodoroRunningUpdateNotification(
  itemId: string,
  itemName: string,
  identifierKind: string,
  phase: Exclude<PomodoroPhase, "idle">,
  phaseStartsAt: number,
  phaseEndsAt: number
): Promise<boolean> {
  if (phaseEndsAt <= phaseStartsAt || phaseStartsAt <= Date.now()) return false;

  const remainingSeconds = Math.max(0, Math.ceil((phaseEndsAt - phaseStartsAt) / 1000));

  await Notifications.scheduleNotificationAsync({
    identifier: notificationId(itemId, identifierKind),
    content: {
      title: `${itemName} ポモドーロ${phaseLabel(phase)}`,
      body: `残り ${formatCountdown(remainingSeconds)} ・タップして戻る`,
      sound: false,
      sticky: true,
      autoDismiss: false,
      data: {
        kind: "pomodoro",
        itemId,
        phase,
        phaseEndsAt,
        androidChronometerMode: "countDown",
        androidNotificationTag: runningNotificationTag(itemId),
        isRunningIndicator: true,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(phaseStartsAt),
      channelId: POMODORO_RUNNING_NOTIFICATION_CHANNEL_ID,
    },
  });
  return true;
}

export async function schedulePomodoroPhaseNotifications(
  itemId: string,
  itemName: string,
  phase: PomodoroPhase,
  phaseEndsAt: number,
  autoSwitchBreak: boolean,
  breakDurationSeconds: number = DEFAULT_BREAK_DURATION_SECONDS,
  workDurationSeconds: number = DEFAULT_WORK_DURATION_SECONDS
): Promise<boolean> {
  if (notificationsAreUnsupported() || phase === "idle" || phaseEndsAt <= Date.now()) return false;

  const normalizedWorkSeconds = Math.max(1, Math.ceil(workDurationSeconds));
  const normalizedBreakSeconds = Math.max(1, Math.ceil(breakDurationSeconds));

  const ready = await ensurePomodoroNotificationsReady();
  if (!ready) return false;

  const prefix = notificationPrefix(itemId);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.identifier.startsWith(prefix))
      .filter((notification) => !notification.identifier.endsWith(":running"))
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => undefined)
      )
  );

  const workCompleteTitle = `${itemName}の作業時間が終わりました`;
  const breakCompleteTitle = "休憩時間が終わりました";
  if (nativePomodoroNotifications()) {
    return true;
  }

  const workCompleteBody = autoSwitchBreak
    ? "休憩に入りました。"
    : "時間になりました。タップして次へ進んでください。";
  const breakCompleteBody = autoSwitchBreak
    ? "作業時間に戻りました。"
    : "時間になりました。タップして次へ進んでください。";

  if (!autoSwitchBreak) {
    await schedulePomodoroNotification(
      itemId,
      "current",
      phase === "work" ? workCompleteTitle : breakCompleteTitle,
      phase === "work" ? workCompleteBody : breakCompleteBody,
      phaseEndsAt,
      true,
      runningNotificationTag(itemId)
    );
    return true;
  }

  let currentPhase = phase;
  let targetAt = phaseEndsAt;

  for (let index = 0; index < MAX_ALTERNATING_NOTIFICATIONS; index += 1) {
    const isWork = currentPhase === "work";
    await schedulePomodoroNotification(
      itemId,
      `${currentPhase}-${index}`,
      isWork ? workCompleteTitle : breakCompleteTitle,
      isWork ? workCompleteBody : breakCompleteBody,
      targetAt,
      false,
      runningNotificationTag(itemId)
    );

    if (currentPhase === "work") {
      await schedulePomodoroRunningUpdateNotification(
        itemId,
        itemName,
        `running-break-${index}`,
        "break",
        targetAt + 1000,
        targetAt + normalizedBreakSeconds * 1000
      );
      targetAt += normalizedBreakSeconds * 1000;
      currentPhase = "break";
    } else {
      await schedulePomodoroRunningUpdateNotification(
        itemId,
        itemName,
        `running-work-${index}`,
        "work",
        targetAt + 1000,
        targetAt + normalizedWorkSeconds * 1000
      );
      targetAt += normalizedWorkSeconds * 1000;
      currentPhase = "work";
    }
  }
  return true;
}
