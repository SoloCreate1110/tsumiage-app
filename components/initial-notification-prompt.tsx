import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { useEffect, useRef } from "react";

import { useNotificationSettings } from "@/hooks/use-notification-settings";
import { useStackStorage } from "@/hooks/use-stack-storage";
import { notificationsAreUnsupported, syncAllItemReminders } from "@/lib/item-reminders";

const INITIAL_NOTIFICATION_PROMPT_KEY = "initial_notification_prompt_seen";

export function InitialNotificationPrompt() {
  const shownRef = useRef(false);
  const { items } = useStackStorage();
  const { loading, enableNotification, disableNotification } = useNotificationSettings();

  useEffect(() => {
    if (loading || shownRef.current || notificationsAreUnsupported()) return;

    const showPrompt = async () => {
      const seen = await AsyncStorage.getItem(INITIAL_NOTIFICATION_PROMPT_KEY);
      if (seen) return;

      shownRef.current = true;
      Alert.alert(
        "通知をオンにしますか？",
        "ポモドーロの終了やリマインダーを通知と音でお知らせします。",
        [
          {
            text: "あとで",
            style: "cancel",
            onPress: () => {
              void AsyncStorage.setItem(INITIAL_NOTIFICATION_PROMPT_KEY, "1");
              void disableNotification();
            },
          },
          {
            text: "オンにする",
            onPress: async () => {
              await AsyncStorage.setItem(INITIAL_NOTIFICATION_PROMPT_KEY, "1");
              const enabled = await enableNotification();
              if (enabled) {
                await syncAllItemReminders(items);
              }
            },
          },
        ],
      );
    };

    void showPrompt();
  }, [disableNotification, enableNotification, items, loading]);

  return null;
}
