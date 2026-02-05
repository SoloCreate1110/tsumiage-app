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
import { getTodayString, StackItem } from "@/types/stack";
import { useQuoteHistory } from "@/hooks/use-quote-history";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { items, loading, getTodayValue, calculateStreak, reorderItems, reload } = useStackStorage();

  const { ensureTodayQuote, todayQuote } = useQuoteHistory();

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
      ensureTodayQuote();
    }, [reload, ensureTodayQuote])
  );

  useEffect(() => {
    ensureTodayQuote();
  }, [ensureTodayQuote]);

  const handleAddItem = useCallback(() => {
    router.push("/add-item");
  }, []);

  const handleItemPress = useCallback((id: string) => {
    router.push(`/item/${id}`);
  }, []);

  const streak = calculateStreak();
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  const refreshRunning = useCallback(async () => {
    if (items.length === 0) {
      setRunningIds(new Set());
      return;
    }
    const keys = items.map((i) => `timer_state_${i.id}`);
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const next = new Set<string>();
      pairs.forEach(([key, value]) => {
        if (!value) return;
        const id = key.replace("timer_state_", "");
        const parsed = JSON.parse(value) as { startAt?: number };
        if (parsed?.startAt) next.add(id);
      });
      setRunningIds(next);
    } catch (error) {
      console.error("Failed to load running timers:", error);
    }
  }, [items]);

  useEffect(() => {
    refreshRunning();
  }, [refreshRunning]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshRunning();
    });
    return () => sub.remove();
  }, [refreshRunning]);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<StackItem>) => (
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
      />
    ),
    [memoizedGetTodayValue, handleItemPress, runningIds]
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
      {items.length > 0 ? (
        <DraggableFlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => reorderItems(data)}
          dragEnabled
          activationDistance={8}
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
  quoteContainer: {
    marginHorizontal: Spacing.m,
    marginBottom: Spacing.m,
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderLeftWidth: 4,
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
  listContent: {
    paddingHorizontal: Spacing.m,
    paddingBottom: 100,
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

