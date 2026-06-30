import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Alert, Platform } from "react-native";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/manus-runtime";
import { StackStorageProvider } from "@/hooks/use-stack-storage";
import { useAnnouncements } from "@/hooks/use-announcements";
import { useFirstLaunch } from "@/hooks/use-first-launch";
import { useFounderTitle } from "@/hooks/use-founder-title";
import { AppUpdateChecker } from "@/components/app-update-checker";
import { InitialNotificationPrompt } from "@/components/initial-notification-prompt";
import { PomodoroBackgroundMonitor } from "@/components/pomodoro-background-monitor";
import { PomodoroNotificationRouter } from "@/components/pomodoro-notification-router";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };
// Web iframe previewer cannot infer safe-area; default to zero until container sends metrics.

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);
  const { latestUnseen, loading: announcementsLoading, markAllAsSeen } = useAnnouncements();
  const {
    loading: firstLaunchLoading,
    isFirstLaunch,
    markFirstLaunchSeen,
  } = useFirstLaunch();
  const {
    loading: founderTitleLoading,
    shouldShowFounderPrompt,
    markFounderPromptSeen,
  } = useFounderTitle();

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  useEffect(() => {
    if (firstLaunchLoading || !isFirstLaunch) return;

    Alert.alert(
      "購入ありがとうございます！",
      "今後アプデもしていくのでお楽しみください。",
      [
        {
          text: "OK",
          onPress: () => {
            void markFirstLaunchSeen();
            markAllAsSeen();
          },
        },
      ],
    );
  }, [firstLaunchLoading, isFirstLaunch, markAllAsSeen, markFirstLaunchSeen]);

  useEffect(() => {
    if (firstLaunchLoading || isFirstLaunch || announcementsLoading || !latestUnseen) return;

    Alert.alert(latestUnseen.title, latestUnseen.message, [
      {
        text: "OK",
        onPress: () => {
          markAllAsSeen();
        },
      },
    ]);
  }, [announcementsLoading, firstLaunchLoading, isFirstLaunch, latestUnseen, markAllAsSeen]);

  useEffect(() => {
    if (firstLaunchLoading || isFirstLaunch || founderTitleLoading || !shouldShowFounderPrompt) {
      return;
    }

    Alert.alert(
      "初期サポーター称号を付与しました",
      "早期の購入ありがとうございます！\n\nあなたに、初期サポーターの称号を付与しました。\n\n今後もしかしたら何か特典があるかもしれないので、お楽しみに！",
      [
        {
          text: "OK",
          onPress: () => {
            void markFounderPromptSeen();
          },
        },
      ],
    );
  }, [
    firstLaunchLoading,
    founderTitleLoading,
    isFirstLaunch,
    markFounderPromptSeen,
    shouldShowFounderPrompt,
  ]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(
    () => initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame },
    [initialFrame, initialInsets],
  );
  const canCheckForAppUpdate =
    !firstLaunchLoading &&
    !isFirstLaunch &&
    !announcementsLoading &&
    !latestUnseen &&
    !founderTitleLoading &&
    !shouldShowFounderPrompt;

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <StackStorageProvider>
              <InitialNotificationPrompt />
              <AppUpdateChecker enabled={canCheckForAppUpdate} />
              <PomodoroBackgroundMonitor />
              <PomodoroNotificationRouter />
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
              <Stack.Screen name="add-item" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="edit-item/[id]" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="item/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="set-goal/[id]" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="announcements" options={{ headerShown: false }} />
              <Stack.Screen name="quotes" options={{ headerShown: false }} />
              <Stack.Screen name="oauth/callback" options={{ headerShown: false }} />
              </Stack>
            </StackStorageProvider>
            <StatusBar style="auto" />
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>
        <SafeAreaFrameContext.Provider value={frame}>
          <SafeAreaInsetsContext.Provider value={insets}>{content}</SafeAreaInsetsContext.Provider>
        </SafeAreaFrameContext.Provider>
      </SafeAreaProvider>
    );
  }

  return <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>;
}
