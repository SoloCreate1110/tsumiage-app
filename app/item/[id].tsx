/**
 * 項目詳細画面
 * タイマーまたはカウンター機能を提供
 */

import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useStackStorage } from "@/hooks/use-stack-storage";
import {
  formatCount,
  formatDate,
  formatTime,
  formatTimeDetailed,
  StackRecord,
} from "@/types/stack";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const {
    items,
    addRecord,
    deleteItem,
    getRecordsByItem,
    getTodayValue,
    loading,
  } = useStackStorage();

  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);
  const itemRecords = useMemo(
    () => (id ? getRecordsByItem(id).slice(-20).reverse() : []),
    [id, getRecordsByItem]
  );
  const todayValue = useMemo(
    () => (id ? getTodayValue(id) : 0),
    [id, getTodayValue]
  );

  // タイマー状態
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // カウンター状態
  const [countValue, setCountValue] = useState(1);

  // アニメーション
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // タイマー処理
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  const handleStartTimer = () => {
    setIsRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(1.05, {}, () => {
      scale.value = withSpring(1);
    });
  };

  const handleStopTimer = async () => {
    setIsRunning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (elapsedSeconds > 0 && id) {
      await addRecord(id, elapsedSeconds);
      setElapsedSeconds(0);
    }
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddCount = async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(1.1, {}, () => {
      scale.value = withSpring(1);
    });
    await addRecord(id, countValue);
  };

  const handleDelete = () => {
    Alert.alert(
      "項目を削除",
      `「${item?.name}」を削除しますか？\nすべての記録も削除されます。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            if (id) {
              await deleteItem(id);
              router.back();
            }
          },
        },
      ]
    );
  };

  if (loading || !item) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText>読み込み中...</ThemedText>
      </ThemedView>
    );
  }

  const renderRecord = ({ item: record }: { item: StackRecord }) => (
    <View
      style={[styles.recordItem, { backgroundColor: colors.card }]}
    >
      <ThemedText style={{ color: colors.textSecondary }}>
        {formatDate(record.date)}
      </ThemedText>
      <ThemedText type="defaultSemiBold">
        {item.type === "time"
          ? formatTime(record.value)
          : formatCount(record.value)}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="arrow.left" size={24} color={colors.tint} />
        </Pressable>
        <ThemedText type="subtitle" numberOfLines={1} style={styles.headerTitle}>
          {item.name}
        </ThemedText>
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <IconSymbol name="trash.fill" size={24} color={colors.error} />
        </Pressable>
      </View>

      {/* メインコンテンツ */}
      <View style={styles.mainContent}>
        {/* 累計表示 */}
        <View style={styles.totalSection}>
          <ThemedText style={{ color: colors.textSecondary }}>累計</ThemedText>
          <ThemedText type="title" style={[styles.totalValue, { color: item.color }]}>
            {item.type === "time"
              ? formatTime(item.totalValue)
              : formatCount(item.totalValue)}
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary }}>
            今日: {item.type === "time" ? formatTime(todayValue) : formatCount(todayValue)}
          </ThemedText>
        </View>

        {/* タイマー/カウンター */}
        {item.type === "time" ? (
          <View style={styles.timerSection}>
            <Animated.View style={animatedStyle}>
              <View
                style={[
                  styles.timerCircle,
                  {
                    borderColor: isRunning ? item.color : colors.border,
                    backgroundColor: isRunning ? item.color + "10" : "transparent",
                  },
                ]}
              >
                <ThemedText style={styles.timerText}>
                  {formatTimeDetailed(elapsedSeconds)}
                </ThemedText>
              </View>
            </Animated.View>

            <View style={styles.timerButtons}>
              {!isRunning ? (
                <Pressable
                  style={[styles.mainButton, { backgroundColor: item.color }]}
                  onPress={handleStartTimer}
                >
                  <IconSymbol name="play.fill" size={32} color="#fff" />
                  <ThemedText style={styles.buttonText}>開始</ThemedText>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.mainButton, { backgroundColor: colors.error }]}
                  onPress={handleStopTimer}
                >
                  <IconSymbol name="stop.fill" size={32} color="#fff" />
                  <ThemedText style={styles.buttonText}>停止</ThemedText>
                </Pressable>
              )}

              {elapsedSeconds > 0 && !isRunning && (
                <Pressable
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                  onPress={handleResetTimer}
                >
                  <ThemedText style={{ color: colors.textSecondary }}>
                    リセット
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.counterSection}>
            <Animated.View style={animatedStyle}>
              <Pressable
                style={[styles.counterButton, { backgroundColor: item.color }]}
                onPress={handleAddCount}
              >
                <IconSymbol name="plus" size={48} color="#fff" />
                <ThemedText style={styles.counterButtonText}>
                  +{countValue}
                </ThemedText>
              </Pressable>
            </Animated.View>

            <View style={styles.countAdjust}>
              <Pressable
                style={[styles.adjustButton, { borderColor: colors.border }]}
                onPress={() => setCountValue(Math.max(1, countValue - 1))}
              >
                <IconSymbol name="minus.circle.fill" size={24} color={colors.text} />
              </Pressable>
              <ThemedText type="defaultSemiBold" style={styles.countValueText}>
                {countValue}
              </ThemedText>
              <Pressable
                style={[styles.adjustButton, { borderColor: colors.border }]}
                onPress={() => setCountValue(countValue + 1)}
              >
                <IconSymbol name="plus.circle.fill" size={24} color={colors.text} />
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* 履歴 */}
      <View style={styles.historySection}>
        <ThemedText type="subtitle" style={styles.historyTitle}>
          最近の記録
        </ThemedText>
        {itemRecords.length > 0 ? (
          <FlatList
            data={itemRecords}
            keyExtractor={(record) => record.id}
            renderItem={renderRecord}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ThemedText style={{ color: colors.textSecondary, textAlign: "center" }}>
            まだ記録がありません
          </ThemedText>
        )}
      </View>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  backButton: {
    padding: Spacing.s,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: Spacing.s,
  },
  deleteButton: {
    padding: Spacing.s,
  },
  mainContent: {
    padding: Spacing.m,
  },
  totalSection: {
    alignItems: "center",
    marginBottom: Spacing.l,
  },
  totalValue: {
    fontSize: 36,
    lineHeight: 44,
    marginVertical: Spacing.xs,
  },
  timerSection: {
    alignItems: "center",
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.l,
  },
  timerText: {
    fontSize: 36,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
  },
  timerButtons: {
    flexDirection: "row",
    gap: Spacing.m,
    alignItems: "center",
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.button,
    gap: Spacing.s,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
  },
  counterSection: {
    alignItems: "center",
  },
  counterButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.l,
  },
  counterButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: Spacing.xs,
  },
  countAdjust: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.m,
  },
  adjustButton: {
    padding: Spacing.s,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
  },
  countValueText: {
    fontSize: 24,
    minWidth: 40,
    textAlign: "center",
  },
  historySection: {
    flex: 1,
    paddingHorizontal: Spacing.m,
  },
  historyTitle: {
    marginBottom: Spacing.s,
  },
  recordItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.m,
    borderRadius: BorderRadius.button,
    marginBottom: Spacing.xs,
  },
});
