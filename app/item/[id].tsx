/**
 * 鬆・岼隧ｳ邏ｰ逕ｻ髱｢
 * 繧ｿ繧､繝槭・縺ｾ縺溘・繧ｫ繧ｦ繝ｳ繧ｿ繝ｼ讖溯・繧呈署萓・
 */

import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
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
import { usePomodoroTimer } from "@/hooks/use-pomodoro-timer";
import {
  calculateGoalProgress,
  calculateDaysRemaining,
  formatCount,
  formatDate,
  formatTime,
  formatTimeDetailed,
  StackRecord,
} from "@/types/stack";
import { getLevelInfo } from "@/constants/levels";
import { useSound } from "@/hooks/use-sound";

interface GroupedRecord {
  date: string;
  count: number;
  totalValue: number;
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const {
    items,
    records,
    addRecord,
    deleteItem,
    getRecordsByItem,
    getTodayValue,
    loading,
    reload,
  } = useStackStorage();

  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // 險倬鹸繧呈律莉倥＃縺ｨ縺ｫ繧ｰ繝ｫ繝ｼ繝怜喧・域怙譁ｰ10譌･蛻・ｼ・
  const groupedRecords = useMemo(() => {
    if (!id) return [];
    const allRecords = getRecordsByItem(id);
    const grouped: GroupedRecord[] = [];
    const dateMap = new Map<string, { count: number; totalValue: number }>();

    // 縺吶∋縺ｦ縺ｮ險倬鹸繧呈律莉倥＃縺ｨ縺ｫ髮・ｨ・
    allRecords.forEach((record) => {
      if (dateMap.has(record.date)) {
        const existing = dateMap.get(record.date)!;
        existing.count += 1;
        existing.totalValue += record.value;
      } else {
        dateMap.set(record.date, { count: 1, totalValue: record.value });
      }
    });

    // 譌･莉倥〒繧ｽ繝ｼ繝茨ｼ域眠縺励＞鬆・ｼ・
    const sortedDates = Array.from(dateMap.keys()).sort().reverse();

    // 譛譁ｰ縺ｮ10譌･蛻・↓蛻ｶ髯・
    sortedDates.slice(0, 10).forEach((date) => {
      const data = dateMap.get(date)!;
      grouped.push({ date, ...data });
    });

    return grouped;
  }, [id, getRecordsByItem]);

  const todayValue = useMemo(
    () => (id ? getTodayValue(id) : 0),
    [id, getTodayValue]
  );

  const levelInfo = useMemo(() => {
    if (!item) return null;
    return getLevelInfo(item.type, item.totalValue);
  }, [item]);

  // 繧ｿ繧､繝槭・迥ｶ諷・
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showPomodoroMode, setShowPomodoroMode] = useState(false);

  const { playSuccess } = useSound(); // Moved here

  // 繝昴Δ繝峨・繝ｭ繧ｿ繧､繝槭・終了凾縺ｫ譎る俣繧貞刈邂・
  const WORK_DURATION = 25 * 60; // 25蛻・

  const handlePomodoroComplete = useCallback(async () => {
    if (id) {
      // 25蛻・・菴懈･ｭ縺悟ｮ御ｺ・＠縺溘ｉ縲・5蛻・ｒ險倬鹸縺ｫ霑ｽ蜉
      await addRecord(id, WORK_DURATION);
      await playSuccess();
    }
  }, [id, addRecord, playSuccess]);

  const handlePomodoroStop = useCallback(async (elapsedSeconds: number) => {
    if (id && elapsedSeconds > 0) {
      // 騾比ｸｭ終了〒繧よ凾髢薙ｒ蜉邂・
      await addRecord(id, elapsedSeconds);
      await playSuccess();
    }
  }, [id, addRecord, playSuccess]);

  const pomodoroTimer = usePomodoroTimer({
    onWorkComplete: handlePomodoroComplete,
    onStop: handlePomodoroStop
  });

  // 繧ｫ繧ｦ繝ｳ繧ｿ繝ｼ迥ｶ諷・
  const [countValue, setCountValue] = useState(1);

  // 繧｢繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // 繧ｿ繧､繝槭・蜃ｦ逅・
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  const handleStartTimer = () => {
    setIsRunning(true);
  };

  const handleStopTimer = async () => {
    setIsRunning(false);
    if (elapsedSeconds > 0 && id) {
      await addRecord(id, elapsedSeconds);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setElapsedSeconds(0);
    }
  };

  const handleResetTimer = () => {
    setElapsedSeconds(0);
  };

  const handleAddCount = async () => {
    if (id) {
      await addRecord(id, countValue);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      scale.value = withSpring(1.2, {}, () => {
        scale.value = withSpring(1);
      });
    }
  };



  const handleSetGoal = () => {
    router.push({
      pathname: "/set-goal/[id]",
      params: { id },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "項目を削除",
      `${item?.name}を削除しますか？\nこの操作は元に戻せません。`,
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

  const goalTarget = item.goal?.target;
  const goalDeadline = item.goal?.deadline;
  const goalStartTotal = item.goal?.startTotal ?? 0;
  const goalProgressValue = Math.max(0, item.totalValue - goalStartTotal);
  const goalRemaining = goalTarget ? Math.max(0, goalTarget - goalProgressValue) : 0;
  const goalDaysRemaining = goalDeadline
    ? calculateDaysRemaining(goalDeadline)
    : null;
  const goalTodayTarget =
    goalTarget && goalDaysRemaining !== null
      ? Math.ceil(goalRemaining / Math.max(goalDaysRemaining, 1))
      : null;

  const formatGoalValue = (value: number) =>
    item.type === "time" ? formatTime(value) : formatCount(value);

  const renderGroupedRecord = ({ item: record }: { item: GroupedRecord }) => {
    const dateLabel = formatDate(record.date);
    const valueLabel = item.type === "time" ? formatTime(record.totalValue) : formatCount(record.totalValue);
    const countLabel = record.count === 1 ? "1回" : `${record.count}回`;

    return (
      <View style={[styles.recordItem, { backgroundColor: colors.card }]}>
        <View style={styles.recordDateSection}>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 14 }}>
            {dateLabel}
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
            {countLabel}
          </ThemedText>
        </View>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
          {valueLabel}
        </ThemedText>
      </View>
    );
  };

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
      {/* 繝倥ャ繝繝ｼ */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="arrow.left" size={24} color={colors.tint} />
        </Pressable>
        <ThemedText type="subtitle" numberOfLines={1} style={styles.headerTitle}>
          {item.name}
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: Spacing.s }}>
          <Pressable onPress={handleSetGoal} style={styles.iconButton}>
            <IconSymbol name="gearshape.fill" size={20} color={colors.tint} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.iconButton}>
            <IconSymbol name="trash.fill" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>

      {/* 繝｡繧､繝ｳ繧ｳ繝ｳ繝・Φ繝・*/}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>


        {/* 繧ｿ繧､繝槭・/繧ｫ繧ｦ繝ｳ繧ｿ繝ｼ */}
        {item.type === "time" ? (
          <View style={styles.timerSection}>
            {!showPomodoroMode ? (
              <>
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
                      <IconSymbol name="play.fill" size={28} color="#fff" />
                      <ThemedText style={styles.buttonText}>開始</ThemedText>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.mainButton, { backgroundColor: colors.error }]}
                      onPress={handleStopTimer}
                    >
                      <IconSymbol name="stop.fill" size={28} color="#fff" />
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

                  {!isRunning && (
                    <Pressable
                      style={[styles.secondaryButton, { borderColor: colors.tint, borderWidth: 2 }]}
                      onPress={() => setShowPomodoroMode(true)}
                    >
                      <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>
                        ポモドーロ
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={[styles.pomodoroDisplay, { backgroundColor: colors.card }]}>
                  <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                    {pomodoroTimer.state.phase === "work" ? "作業中" : "休憩中"}
                  </ThemedText>
                  <ThemedText style={styles.pomodoroTime}>
                    {pomodoroTimer.formatTime(pomodoroTimer.state.timeLeft)}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                    セッション: {pomodoroTimer.state.sessionsCompleted}
                  </ThemedText>
                </View>

                <View style={styles.timerButtons}>
                  {!pomodoroTimer.state.isRunning ? (
                    <Pressable
                      style={[styles.mainButton, { backgroundColor: item.color }]}
                      onPress={pomodoroTimer.startPomodoro}
                    >
                      <IconSymbol name="play.fill" size={28} color="#fff" />
                      <ThemedText style={styles.buttonText}>開始</ThemedText>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.mainButton, { backgroundColor: colors.error }]}
                      onPress={pomodoroTimer.pausePomodoro}
                    >
                      <IconSymbol name="pause.fill" size={28} color="#fff" />
                      <ThemedText style={styles.buttonText}>一時停止</ThemedText>
                    </Pressable>
                  )}

                  <Pressable
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                    onPress={() => {
                      pomodoroTimer.stopPomodoro();
                      setShowPomodoroMode(false);
                    }}
                  >
                    <ThemedText style={{ color: colors.textSecondary }}>
                      終了
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            )}
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

        {/* 邏ｯ險郁｡ｨ遉ｺ */}
        <View style={styles.totalSection}>
          <ThemedText style={{ color: colors.textSecondary }}>合計</ThemedText>
          <ThemedText type="title" style={[styles.totalValue, { color: item.color }]}>
            {item.type === "time"
              ? formatTime(item.totalValue)
              : formatCount(item.totalValue)}
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary, marginBottom: Spacing.m }}>
            今日: {item.type === "time" ? formatTime(todayValue) : formatCount(todayValue)}
          </ThemedText>

          {/* 繝ｬ繝吶Ν進捗:*/}
          {levelInfo && (
            <View style={styles.levelSection}>
              <View style={styles.levelHeader}>
                <ThemedText style={{ fontWeight: 'bold', color: item.color }}>
                  {levelInfo.current.title}
                </ThemedText>
                {levelInfo.next && (
                  <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                    次のランクまで {item.type === 'time'
                      ? formatTime(levelInfo.next.threshold - item.totalValue)
                      : formatCount(levelInfo.next.threshold - item.totalValue)}
                  </ThemedText>
                )}
              </View>
              <View style={styles.levelProgressBar}>
                <View
                  style={[
                    styles.levelProgressFill,
                    {
                      width: `${levelInfo.progress}%`,
                      backgroundColor: item.color
                    }
                  ]}
                />
              </View>
              {levelInfo.next && (
                <View style={styles.levelFooter}>
                  <ThemedText style={{ fontSize: 10, color: colors.textSecondary }}>
                    {Math.floor(levelInfo.progress)}%
                  </ThemedText>
                  <ThemedText style={{ fontSize: 10, color: colors.textSecondary }}>
                    {levelInfo.next.title}
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {goalTarget && goalDeadline && (
            <View style={styles.goalSection}>
              <View style={styles.goalItem}>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                  目標: {formatGoalValue(goalTarget)}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                  残り: {formatGoalValue(goalRemaining)}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                  期限: {goalDeadline}
                </ThemedText>
                {goalDaysRemaining !== null && (
                  <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                    残り日数: {goalDaysRemaining}日
                  </ThemedText>
                )}
              </View>

              <View style={styles.goalItem}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${calculateGoalProgress(
                          goalProgressValue,
                          goalTarget
                        )}%`,
                        backgroundColor: item.color,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                  進捗: {calculateGoalProgress(goalProgressValue, goalTarget)}%
                </ThemedText>
              </View>

              {goalTodayTarget !== null && (
                <View style={styles.goalItem}>
                  <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                    今日の目安: {formatGoalValue(goalTodayTarget)}
                  </ThemedText>
                  {goalRemaining === 0 && (
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                      目標達成済み
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* 險倬鹸荳隕ｧ */}
        <View style={styles.recordsSection}>
          <ThemedText type="subtitle" style={{ marginBottom: Spacing.m }}>
            最近の記録
          </ThemedText>
          {groupedRecords.length > 0 ? (
            <FlatList
              data={groupedRecords}
              renderItem={renderGroupedRecord}
              keyExtractor={(item) => item.date}
              scrollEnabled={false}
            />
          ) : (
            <ThemedText style={{ color: colors.textSecondary, textAlign: "center", paddingVertical: Spacing.m }}>
              記録がありません
            </ThemedText>
          )}
        </View>
      </ScrollView>
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
    paddingBottom: Spacing.m,
    gap: Spacing.s,
  },
  backButton: {
    padding: Spacing.s,
  },
  headerTitle: {
    flex: 1,
  },
  iconButton: {
    padding: Spacing.s,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: Spacing.m,
  },
  totalSection: {
    marginBottom: Spacing.xl,
  },
  totalValue: {
    marginVertical: Spacing.s,
  },
  goalSection: {
    marginTop: Spacing.m,
    gap: Spacing.m,
  },
  goalItem: {
    gap: Spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  timerSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.l,
  },
  timerText: {
    fontSize: 40,
    fontWeight: "bold",
    lineHeight: 44,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    fontVariant: ["tabular-nums"],
  },
  timerButtons: {
    width: "100%",
    gap: Spacing.m,
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.button,
    gap: Spacing.s,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    alignItems: "center",
  },
  pomodoroDisplay: {
    width: "100%",
    paddingVertical: Spacing.l,
    borderRadius: BorderRadius.card,
    alignItems: "center",
    marginBottom: Spacing.l,
  },
  pomodoroTime: {
    fontSize: 48,
    fontWeight: "bold",
    marginVertical: 16,
    lineHeight: 56,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    fontVariant: ["tabular-nums"],
  },
  counterSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
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
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.s,
  },
  countAdjust: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.m,
  },
  adjustButton: {
    padding: Spacing.s,
    borderWidth: 1,
    borderRadius: BorderRadius.button,
  },
  countValueText: {
    fontSize: 20,
    minWidth: 40,
    textAlign: "center",
  },
  recordsSection: {
    marginTop: Spacing.l,
    marginBottom: Spacing.l,
  },
  recordItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.s,
  },
  recordDateSection: {
    flex: 1,
  },
  levelSection: {
    marginTop: Spacing.s,
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
  },
  levelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.s,
  },
  levelProgressBar: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  levelProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  levelFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
});













