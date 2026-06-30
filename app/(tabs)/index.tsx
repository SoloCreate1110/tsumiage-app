/**
 * 繝帙・繝逕ｻ髱｢ - 遨阪∩荳翫￡鬆・岼荳隕ｧ
 */

import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCallback, useMemo, useState, useEffect } from "react";
import { AppState, Pressable, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StackItemCard } from "@/components/stack-item-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useStackStorage } from "@/hooks/use-stack-storage";
import { formatTimeDetailed, getTodayDate, getTodayString, StackItem } from "@/types/stack";
import { useQuoteHistory } from "@/hooks/use-quote-history";
import { useSound } from "@/hooks/use-sound";
import { usePomodoroSettings } from "@/hooks/use-pomodoro-settings";

type RunningSnapshot =
  | {
      type: "timer";
      itemId: string;
      startAt: number;
    }
  | {
      type: "pomodoro";
      itemId: string;
      phase: "work" | "break";
      phaseStartedAt: number;
      totalTime: number;
      timeLeft: number;
      workDurationSeconds: number;
      breakDurationSeconds: number;
      autoSwitchBreak: boolean;
    };

type RunningCardState = {
  label: string;
  timeText: string;
};

function derivePomodoroCardState(snapshot: Extract<RunningSnapshot, { type: "pomodoro" }>, now: number): RunningCardState | null {
  let phase = snapshot.phase;
  let totalTime = Math.max(1, snapshot.totalTime);
  let elapsed = Math.max(0, Math.floor((now - snapshot.phaseStartedAt) / 1000));

  if (!snapshot.autoSwitchBreak && elapsed >= totalTime) {
    return null;
  }

  while (snapshot.autoSwitchBreak && elapsed >= totalTime) {
    elapsed -= totalTime;
    if (phase === "work") {
      phase = "break";
      totalTime = Math.max(1, snapshot.breakDurationSeconds);
    } else {
      phase = "work";
      totalTime = Math.max(1, snapshot.workDurationSeconds);
    }
  }

  return {
    label: phase === "work" ? "作業中" : "休憩中",
    timeText: formatTimeDetailed(Math.max(0, totalTime - elapsed)),
  };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { items, loading, getTodayValue, calculateStreak, reorderItems, reload } = useStackStorage();
  const { playClick } = useSound();
  const { settings: pomodoroSettings } = usePomodoroSettings();
  const pomodoroWorkSeconds = pomodoroSettings.workMinutes * 60;
  const pomodoroBreakSeconds = pomodoroSettings.breakMinutes * 60;

  const { ensureTodayQuote, todayQuote, initialized } = useQuoteHistory();
  const [remainingUnit, setRemainingUnit] = useState<"weeks" | "days">("weeks");

  // getTodayValue縺ｮ繝｡繝｢蛹也沿繧剃ｽ懈・・医ヱ繝輔か繝ｼ繝槭Φ繧ｹ譛驕ｩ蛹厄ｼ・
  const memoizedGetTodayValue = useCallback(
    (itemId: string) => getTodayValue(itemId),
    [getTodayValue]
  );

  // 繝｢繝ｼ繝繝ｫ縺九ｉ謌ｻ縺｣縺滓凾縺ｫ繝・・繧ｿ繧偵Μ繝ｭ繝ｼ繝会ｼ・錐險譖ｴ譁ｰ
  useFocusEffect(
    useCallback(() => {
      console.log('[HomeScreen] Screen focused, reloading data');
      reload();
      if (initialized) {
        ensureTodayQuote();
      }
    }, [reload, ensureTodayQuote, initialized])
  );

  useEffect(() => {
    if (initialized) {
      ensureTodayQuote();
    }
  }, [ensureTodayQuote, initialized]);

  const handleAddItem = useCallback(() => {
    playClick();
    router.push("/add-item");
  }, [playClick]);

  const handleItemPress = useCallback((id: string) => {
    router.push(`/item/${id}`);
  }, []);

  const streak = calculateStreak();
  const yearRemaining = useMemo(() => {
    const today = getTodayDate();
    const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
    const diffDays = Math.max(
      0,
      Math.ceil((endOfYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );
    return {
      days: diffDays,
      weeks: Math.max(0, Math.ceil(diffDays / 7)),
    };
  }, []);
  const [runningSnapshots, setRunningSnapshots] = useState<Record<string, RunningSnapshot>>({});
  const [nowMs, setNowMs] = useState(Date.now());

  const refreshRunning = useCallback(async () => {
    if (items.length === 0) {
      setRunningSnapshots({});
      return;
    }
    const timerKeys = items.map((i) => `timer_state_${i.id}`);
    const pomodoroKeys = items.map((i) => `pomodoro_state_${i.id}`);
    try {
      const pairs = await AsyncStorage.multiGet([...timerKeys, ...pomodoroKeys]);
      const next: Record<string, RunningSnapshot> = {};
      pairs.forEach(([key, value]) => {
        if (!value) return;
        const isPomodoro = key.startsWith("pomodoro_state_");
        const id = key.replace(isPomodoro ? "pomodoro_state_" : "timer_state_", "");
        const parsed = JSON.parse(value) as {
          startAt?: number;
          phaseStartedAt?: number | null;
          isRunning?: boolean;
          phase?: "work" | "break" | "idle";
          timeLeft?: number;
          totalTime?: number;
          workDurationSeconds?: number;
          breakDurationSeconds?: number;
        };
        if (parsed?.isRunning === false) return;
        if (isPomodoro) {
          const item = items.find((entry) => entry.id === id);
          if (
            parsed.phase !== "work" &&
            parsed.phase !== "break"
          ) {
            return;
          }
          if (!parsed.phaseStartedAt || !parsed.totalTime) return;
          next[id] = {
            type: "pomodoro",
            itemId: id,
            phase: parsed.phase,
            phaseStartedAt: parsed.phaseStartedAt,
            totalTime:
              parsed.phase === "work"
                ? pomodoroWorkSeconds
                : pomodoroBreakSeconds,
            timeLeft: parsed.timeLeft ?? parsed.totalTime,
            workDurationSeconds: pomodoroWorkSeconds,
            breakDurationSeconds: pomodoroBreakSeconds,
            autoSwitchBreak: item?.pomodoroAutoSwitchBreak ?? true,
          };
          return;
        }

        if (parsed.startAt) {
          next[id] = {
            type: "timer",
            itemId: id,
            startAt: parsed.startAt,
          };
        }
      });
      setRunningSnapshots(next);
    } catch (error) {
      console.error("Failed to load running timers:", error);
    }
  }, [items, pomodoroBreakSeconds, pomodoroWorkSeconds]);

  useEffect(() => {
    refreshRunning();
  }, [refreshRunning]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshRunning();
    });
    return () => sub.remove();
  }, [refreshRunning]);

  useEffect(() => {
    const sync = () => {
      setNowMs(Date.now());
    };

    sync();
    const intervalId = setInterval(sync, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const runningCardStates = useMemo(() => {
    const next: Record<string, RunningCardState> = {};
    Object.values(runningSnapshots).forEach((snapshot) => {
      if (snapshot.type === "timer") {
        next[snapshot.itemId] = {
          label: "作業中",
          timeText: formatTimeDetailed(
            Math.max(0, Math.floor((nowMs - snapshot.startAt) / 1000))
          ),
        };
        return;
      }

      const cardState = derivePomodoroCardState(snapshot, nowMs);
      if (cardState) {
        next[snapshot.itemId] = cardState;
      }
    });
    return next;
  }, [nowMs, runningSnapshots]);

  const runningIds = useMemo(() => new Set(Object.keys(runningCardStates)), [runningCardStates]);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<StackItem>) => {
      const runningState = runningCardStates[item.id];
      return (
        <StackItemCard
          item={item}
          todayValue={memoizedGetTodayValue(item.id)}
          onPress={() => handleItemPress(item.id)}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            drag();
          }}
          isActive={isActive}
          isRunning={runningIds.has(item.id)}
          runningLabel={runningState?.label}
          runningTimeText={runningState?.timeText}
        />
      );
    },
    [memoizedGetTodayValue, handleItemPress, runningCardStates, runningIds]
  );

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText>読み込み中...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20),
        },
      ]}
    >
      {/* 繝倥ャ繝繝ｼ */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.dateLabel}>
            {new Date(`${getTodayString()}T00:00:00`).toLocaleDateString("ja-JP", {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </ThemedText>
          <ThemedText type="title" style={styles.greeting}>
            こんにちは
          </ThemedText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.s }}>
          <Pressable
            onPress={() =>
              setRemainingUnit((unit) => (unit === "weeks" ? "days" : "weeks"))
            }
            style={[styles.remainingBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ThemedText style={{ color: colors.textSecondary, fontSize: 10, marginBottom: -3 }}>
              今年あと
            </ThemedText>
            <ThemedText style={{ color: colors.text, fontSize: 20, lineHeight: 24, fontWeight: "800" }}>
              {remainingUnit === "weeks" ? yearRemaining.weeks : yearRemaining.days}
            </ThemedText>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 10, marginTop: -4 }}>
              {remainingUnit === "weeks" ? "週" : "日"}
            </ThemedText>
          </Pressable>
          <View style={[styles.streakBadge, { backgroundColor: colors.tint + "15" }]}>
            <IconSymbol name="flame.fill" size={16} color={colors.tint} />
            <ThemedText style={{ fontWeight: "bold", color: colors.tint, fontSize: 16 }}>
              {streak}
            </ThemedText>
            <ThemedText style={{ fontSize: 10, color: colors.tint, marginTop: -2 }}>
              連続日数
            </ThemedText>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            style={{
              padding: Spacing.s,
              backgroundColor: colors.card,
              borderRadius: BorderRadius.button,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <IconSymbol name="gearshape.fill" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* 名言 */}
      <Pressable onPress={() => router.push("/quotes")}>
        <View style={[styles.quoteContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.quoteHeader}>
            <IconSymbol name="quote.bubble" size={20} color={colors.textSecondary} />
            <ThemedText style={styles.quoteNo}>
              NO.{todayQuote.no.toString().padStart(3, "0")}
            </ThemedText>
            <View style={{ flex: 1 }} />
            <ThemedText style={styles.quoteHint}>タップで収集済み名言リストへ</ThemedText>
            <IconSymbol name="chevron.right" size={16} color={colors.textDisabled} />
          </View>
          <ThemedText style={[styles.quoteText, { color: colors.text }]}>
            {todayQuote.text}
          </ThemedText>
          <ThemedText style={[styles.quoteAuthor, { color: colors.textSecondary }]}>
            ・{todayQuote.author}
          </ThemedText>
        </View>
      </Pressable>

      {/* 鬆・岼荳隕ｧ */}
      <View style={styles.listWrapper}>
        {items.length > 0 ? (
          <DraggableFlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onDragEnd={({ data }) => reorderItems(data)}
            activationDistance={8}
            style={styles.list}
            containerStyle={styles.listContainer}
            scrollEnabled
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 220 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.tint + "20" },
              ]}
            >
              <IconSymbol name="chart.bar.fill" size={48} color={colors.tint} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              まだ項目がありません
            </ThemedText>
            <ThemedText
              style={[styles.emptyText, { color: colors.textSecondary }]}
            >
              下のボタンから積み上げたい項目を{"\n"}
              追加してみましょう
            </ThemedText>
          </View>
        )}
      </View>

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={handleAddItem}
      >
        <IconSymbol name="plus" size={28} color="#fff" />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.m,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 4,
    fontWeight: "600",
  },
  greeting: {
    fontSize: 28,
  },
  streakBadge: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  remainingBadge: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
  },
  quoteContainer: {
    marginHorizontal: Spacing.m,
    marginBottom: Spacing.m,
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  liveBanner: {
    marginHorizontal: Spacing.m,
    marginBottom: Spacing.m,
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
    marginBottom: 4,
  },
  quoteNo: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
  },
  quoteHint: {
    fontSize: 10,
    color: "#999",
  },
  quoteText: {
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 8,
    lineHeight: 20,
  },
  quoteAuthor: {
    fontSize: 12,
    textAlign: "right",
  },
  listWrapper: {
    flex: 1,
    minHeight: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.m,
    paddingBottom: 100,
  },
  list: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.l,
  },
  emptyTitle: {
    marginBottom: Spacing.s,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 22,
  },
  fab: {
    position: "absolute",
    right: Spacing.m,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

