import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useEffect } from "react";
import { Alert, Linking, Platform } from "react-native";

import { APP_UPDATE_CONFIG_URL } from "@/constants/app-links";

const LAST_UPDATE_CHECK_DATE_KEY = "last_update_check_date";
const LAST_UPDATE_PROMPT_KEY = "last_update_prompt";

type UpdateConfig = {
  latestVersion?: string;
  minimumVersion?: string;
  message?: string;
  storeUrl?: string;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function parseVersion(version: string) {
  return version
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

function compareVersions(a: string, b: string) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
}

async function fetchUpdateConfig(): Promise<UpdateConfig | null> {
  const response = await fetch(APP_UPDATE_CONFIG_URL, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;
  return (await response.json()) as UpdateConfig;
}

export function AppUpdateChecker({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;

    let cancelled = false;

    const checkForUpdate = async () => {
      const currentVersion = Constants.expoConfig?.version;
      if (!currentVersion) return;

      try {
        const today = todayKey();
        const lastCheckDate = await AsyncStorage.getItem(LAST_UPDATE_CHECK_DATE_KEY);
        if (lastCheckDate === today) return;

        const config = await fetchUpdateConfig();
        if (cancelled || !config?.latestVersion) return;

        await AsyncStorage.setItem(LAST_UPDATE_CHECK_DATE_KEY, today);

        if (compareVersions(currentVersion, config.latestVersion) >= 0) return;

        const lastPrompt = await AsyncStorage.getItem(LAST_UPDATE_PROMPT_KEY);
        const promptKey = `${config.latestVersion}:${today}`;
        if (lastPrompt === promptKey) return;

        const storeUrl = config.storeUrl;
        const message =
          config.message ?? "新しいバージョンがあります。アップデートしてください。";

        Alert.alert("新しいバージョンがあります", message, [
          {
            text: "あとで",
            style: "cancel",
            onPress: () => {
              void AsyncStorage.setItem(LAST_UPDATE_PROMPT_KEY, promptKey);
            },
          },
          {
            text: "更新する",
            onPress: () => {
              void AsyncStorage.setItem(LAST_UPDATE_PROMPT_KEY, promptKey);
              if (storeUrl) {
                void Linking.openURL(storeUrl);
              }
            },
          },
        ]);
      } catch {
        // Offline or temporary fetch failures should not interrupt app startup.
      }
    };

    const timeoutId = setTimeout(() => {
      void checkForUpdate();
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [enabled]);

  return null;
}
