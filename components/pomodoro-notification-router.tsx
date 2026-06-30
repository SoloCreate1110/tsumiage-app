import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { setPomodoroAppActive } from "@/lib/pomodoro-foreground-state";

export function PomodoroNotificationRouter() {
  const handledNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setPomodoroAppActive(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (nextState) => {
      setPomodoroAppActive(nextState === "active");
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return undefined;

    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      const notificationId = response?.notification.request.identifier;
      if (notificationId) {
        if (handledNotificationIdsRef.current.has(notificationId)) return;
        handledNotificationIdsRef.current.add(notificationId);
      }

      const data = response?.notification.request.content.data as
        | { kind?: unknown; itemId?: unknown }
        | undefined;
      const opensTask = data?.kind === "pomodoro" || data?.kind === "long-session";
      if (!opensTask || typeof data?.itemId !== "string") {
        return;
      }

      router.push(`/item/${data.itemId}`);
    };

    void Notifications.getLastNotificationResponseAsync().then(handleResponse);

    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleResponse
    );

    return () => subscription.remove();
  }, []);

  return null;
}
