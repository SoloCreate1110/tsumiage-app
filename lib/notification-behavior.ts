// Expo invokes this handler for notifications received while the app is open.
// Native Android Pomodoro alarms use the same sound-only rule independently.
export function foregroundNotificationBehavior(data: Record<string, unknown> | undefined) {
  const show = data?.kind !== "pomodoro-phase";
  return {
    shouldShowAlert: show,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: show,
    shouldShowList: show,
  };
}
