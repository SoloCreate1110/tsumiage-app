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
  Switch,
  TextInput,
  View,
} from "react-native";
import { Platform } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
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
import { TimeInput } from "@/components/ui/time-input";
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
  getTodayString,
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
    updateItem,
    getRecordsByItem,
    getTodayValue,
    getDailyNote,
    setDailyNote,
    loading,
    reload,
  } = useStackStorage();

  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);
  const isExpoGo =
    Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

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

  const recentNotes = useMemo(() => {
    if (!id) return [];
    return records
      .filter((r) => r.itemId === id && r.note && r.note.trim().length > 0)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3);
  }, [records, id]);

  const todayDate = getTodayString();
  const [sessionNote, setSessionNote] = useState("");
  const [dailyNoteText, setDailyNoteText] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [adjustSeconds, setAdjustSeconds] = useState(0);
  const [adjustCount, setAdjustCount] = useState(1);
  const [adjustDate, setAdjustDate] = useState<string | null>(null);

  useEffect(() => {
    if (!item || !id) return;
    setReminderEnabled(item.reminder?.enabled ?? false);
    setReminderTime(item.reminder?.time ?? "20:00");
    setDailyNoteText(getDailyNote(id, todayDate));
  }, [item, id, getDailyNote, todayDate]);

  const levelInfo = useMemo(() => {
    if (!item) return null;
    return getLevelInfo(item.type, item.totalValue);
  }, [item]);

  // 繧ｿ繧､繝槭・迥ｶ諷・
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showPomodoroMode, setShowPomodoroMode] = useState(false);
  const [autoSwitchBreak, setAutoSwitchBreak] = useState(true);
  const timerStartRef = useRef<number | null>(null);
  const TIMER_STATE_KEY = id ? `timer_state_${id}` : null;

  const { playSuccess } = useSound(); // Moved here

  const cancelItemReminder = useCallback(
    async (itemId: string) => {
      if (isExpoGo) return;
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((n) => n.content.data && (n.content.data as any).itemId === itemId)
          .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
      );
    },
    [isExpoGo]
  );

  const scheduleItemReminder = useCallback(
    async (itemId: string, name: string, time: string) => {
      if (isExpoGo) return false;
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return false;

      await cancelItemReminder(itemId);
      const [hour, minute] = time.split(":").map(Number);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${name}の時間です`,
          body: "今日の積み上げを少し進めましょう。",
          data: { itemId },
          sound: true,
        },
        trigger: { hour, minute, repeats: true },
      });
      return true;
    },
    [cancelItemReminder, isExpoGo]
  );

  const handleToggleReminder = useCallback(
    async (value: boolean) => {
      if (!item || !id) return;
      if (value) {
        const ok = await scheduleItemReminder(item.id, item.name, reminderTime);
        if (!ok) {
          Alert.alert(
            "通知が許可されていません",
            "通知を受け取るには、端末の設定で通知を許可してください。"
          );
          return;
        }
      } else {
        await cancelItemReminder(item.id);
      }

      setReminderEnabled(value);
      await updateItem(item.id, {
        reminder: { enabled: value, time: reminderTime },
      });
    },
    [item, id, reminderTime, scheduleItemReminder, cancelItemReminder, updateItem]
  );

  const handleTimeChange = useCallback(
    async (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === "dismissed") {
        setShowTimePicker(false);
        return;
      }
      if (Platform.OS === "android") {
        setShowTimePicker(false);
      }
      if (!selectedDate || !item) return;

      const hours = `${selectedDate.getHours()}`.padStart(2, "0");
      const minutes = `${selectedDate.getMinutes()}`.padStart(2, "0");
      const nextTime = `${hours}:${minutes}`;
      setReminderTime(nextTime);
      await updateItem(item.id, {
        reminder: { enabled: reminderEnabled, time: nextTime },
      });
      if (reminderEnabled) {
        await scheduleItemReminder(item.id, item.name, nextTime);
      }
    },
    [item, reminderEnabled, scheduleItemReminder, updateItem]
  );

  // 繝昴Δ繝峨・繝ｭ繧ｿ繧､繝槭・終了凾縺ｫ譎る俣繧貞刈邂・
  const WORK_DURATION = 25 * 60; // 25蛻・

  const handlePomodoroComplete = useCallback(async () => {
    if (id) {
      // 25蛻・・菴懈･ｭ縺悟ｮ御ｺ・＠縺溘ｉ縲・5蛻・ｒ險倬鹸縺ｫ霑ｽ蜉
      const note = sessionNote.trim() ? sessionNote.trim() : undefined;
      await addRecord(id, WORK_DURATION, note);
      if (note) setSessionNote("");
      await playSuccess();
    }
  }, [id, addRecord, playSuccess, sessionNote]);

  const handlePomodoroStop = useCallback(async (elapsedSeconds: number) => {
    if (id && elapsedSeconds > 0) {
      // 騾比ｸｭ終了〒繧よ凾髢薙ｒ蜉邂・
      const note = sessionNote.trim() ? sessionNote.trim() : undefined;
      await addRecord(id, elapsedSeconds, note);
      if (note) setSessionNote("");
      await playSuccess();
    }
  }, [id, addRecord, playSuccess, sessionNote]);

  const pomodoroTimer = usePomodoroTimer({
    onWorkComplete: handlePomodoroComplete,
    onStop: handlePomodoroStop,
    autoSwitchBreak
  });

  // 繧ｫ繧ｦ繝ｳ繧ｿ繝ｼ迥ｶ諷・
  const [countValue, setCountValue] = useState(1);

  // 繧｢繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // 繧ｿ繧､繝槭・蜃ｦ逅・
  const syncElapsed = useCallback(() => {
    if (!timerStartRef.current) return;
    const diff = Math.max(0, Math.floor((Date.now() - timerStartRef.current) / 1000));
    setElapsedSeconds(diff);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    syncElapsed();
    timerRef.current = setInterval(() => {
      syncElapsed();
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, syncElapsed]);

  useEffect(() => {
    if (!TIMER_STATE_KEY || !id) return;
    const loadTimerState = async () => {
      try {
        const raw = await AsyncStorage.getItem(TIMER_STATE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { startAt: number };
        if (parsed?.startAt) {
          timerStartRef.current = parsed.startAt;
          setIsRunning(true);
          syncElapsed();
        }
      } catch (error) {
        console.error("Failed to load timer state:", error);
      }
    };
    loadTimerState();
  }, [TIMER_STATE_KEY, id, syncElapsed]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && isRunning) {
        syncElapsed();
      }
    });
    return () => sub.remove();
  }, [isRunning, syncElapsed]);

  const handleStartTimer = async () => {
    const now = Date.now();
    timerStartRef.current = now;
    setIsRunning(true);
    if (TIMER_STATE_KEY) {
      await AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify({ startAt: now }));
    }
  };

  const handleStopTimer = async () => {
    setIsRunning(false);
    if (id) {
      const now = Date.now();
      const startedAt = timerStartRef.current;
      const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : elapsedSeconds;
      const note = sessionNote.trim() ? sessionNote.trim() : undefined;
      if (elapsed > 0) {
        await addRecord(id, elapsed, note);
      }
      timerStartRef.current = null;
      setElapsedSeconds(0);
      if (TIMER_STATE_KEY) {
        await AsyncStorage.removeItem(TIMER_STATE_KEY);
      }
      if (note) setSessionNote("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleResetTimer = async () => {
    setElapsedSeconds(0);
    timerStartRef.current = null;
    if (TIMER_STATE_KEY) {
      await AsyncStorage.removeItem(TIMER_STATE_KEY);
    }
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

  const handleAdjust = async (direction: "plus" | "minus") => {
    if (!id || !item || !adjustDate) return;
    const isTime = item.type === "time";
    const baseValue = isTime ? adjustSeconds : adjustCount;
    if (!baseValue || baseValue <= 0) return;
    let delta = direction === "minus" ? -baseValue : baseValue;
    const dayTotal = groupedRecords.find((g) => g.date === adjustDate)?.totalValue ?? 0;
    if (dayTotal + delta < 0) {
      delta = -dayTotal;
    }
    if (delta === 0) return;
    const noteLabel = isTime
      ? `調整 ${delta > 0 ? "+" : "-"}${formatTime(Math.abs(delta))}`
      : `調整 ${delta > 0 ? "+" : "-"}${formatCount(Math.abs(delta))}`;
    await addRecord(id, delta, noteLabel, adjustDate);
    setAdjustSeconds(0);
    setAdjustCount(1);
    setAdjustDate(null);
  };



  const handleSetGoal = () => {
    router.push({
      pathname: "/set-goal/[id]",
      params: { id },
    });
  };

  const scrollRef = useRef<ScrollView | null>(null);
  const adjustRef = useRef<View | null>(null);

  const scrollToAdjust = useCallback(() => {
    if (!scrollRef.current || !adjustRef.current) return;
    adjustRef.current.measureLayout(
      // @ts-ignore
      scrollRef.current,
      (_x, y) => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
      },
      () => {}
    );
  }, []);

  useEffect(() => {
    if (adjustDate) {
      setTimeout(() => {
        scrollToAdjust();
      }, 50);
    }
  }, [adjustDate, scrollToAdjust]);

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
      <Pressable
        style={({ pressed }) => [
          styles.recordItem,
          {
            backgroundColor:
              adjustDate === record.date ? item.color + "1A" : colors.card,
            borderColor:
              adjustDate === record.date ? item.color : "transparent",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => setAdjustDate(record.date)}
      >
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
      </Pressable>
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
        </View>
      </View>

      {/* 繝｡繧､繝ｳ繧ｳ繝ｳ繝・Φ繝・*/}
      <ScrollView ref={scrollRef} style={styles.mainContent} showsVerticalScrollIndicator={false}>


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

                <View style={[styles.pomodoroOptions, { backgroundColor: colors.card }]}>
                  <ThemedText style={{ color: colors.textSecondary }}>
                    休憩自動切替
                  </ThemedText>
                  <Switch
                    value={autoSwitchBreak}
                    onValueChange={setAutoSwitchBreak}
                    trackColor={{ false: colors.border, true: colors.tint + "80" }}
                    thumbColor={autoSwitchBreak ? colors.tint : "#f4f3f4"}
                  />
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

        {/* 作業ログメモ */}
        {item.type === "time" && (
          <View style={styles.memoSection}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.s }}>
              作業ログメモ
            </ThemedText>
            <TextInput
              style={[styles.memoInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="今回の作業内容をメモ（記録時に保存）"
              placeholderTextColor={colors.textDisabled}
              value={sessionNote}
              onChangeText={setSessionNote}
              multiline
            />
            <ThemedText style={styles.memoHint}>
              ※ タイマーを「停止」またはポモドーロ完了時に記録へ保存されます
            </ThemedText>
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

        {/* リマインダー */}
        <View style={styles.reminderSection}>
          <ThemedText type="subtitle" style={{ marginBottom: Spacing.s }}>
            リマインダー
          </ThemedText>
          <View style={[styles.reminderRow, { backgroundColor: colors.card }]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">このタスクを通知</ThemedText>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                {isExpoGo ? "Expo Goでは通知が使えません" : `${reminderTime}に通知`}
              </ThemedText>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={handleToggleReminder}
              disabled={isExpoGo}
              trackColor={{ false: colors.border, true: colors.tint + "80" }}
              thumbColor={reminderEnabled ? colors.tint : "#f4f3f4"}
            />
          </View>

          <View style={{ marginTop: Spacing.s }}>
            {Platform.OS === "web" ? (
              <View
                style={[
                  styles.reminderTimeInput,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={{ flex: 1, color: colors.text, fontSize: 16 }}
                  value={reminderTime}
                  onChangeText={(value) => {
                    setReminderTime(value);
                    if (item) {
                      updateItem(item.id, {
                        reminder: { enabled: reminderEnabled, time: value },
                      });
                    }
                  }}
                  // @ts-ignore
                  type="time"
                />
                <IconSymbol name="clock.fill" size={18} color={colors.textSecondary} />
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => setShowTimePicker(true)}
                  style={[
                    styles.reminderTimeInput,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <ThemedText style={{ color: colors.text }}>
                    {reminderTime}
                  </ThemedText>
                  <IconSymbol name="clock.fill" size={18} color={colors.textSecondary} />
                </Pressable>
                {showTimePicker && (
                  <DateTimePicker
                    value={new Date(`1970-01-01T${reminderTime}:00`)}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </>
            )}
          </View>
        </View>

        {/* 今日のメモ */}
        <View style={styles.memoSection}>
          <ThemedText type="subtitle" style={{ marginBottom: Spacing.s }}>
            今日の気づき・反省
          </ThemedText>
          <TextInput
            style={[styles.memoInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="今日の気づきや反省をメモ"
            placeholderTextColor={colors.textDisabled}
            value={dailyNoteText}
            onChangeText={setDailyNoteText}
            multiline
          />
          <Pressable
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => {
              if (!id) return;
              setDailyNote(id, todayDate, dailyNoteText);
            }}
          >
            <ThemedText style={{ color: colors.textSecondary }}>保存</ThemedText>
          </Pressable>
        </View>

        {/* 作業ログ */}
        <View style={styles.notesSection}>
          <ThemedText type="subtitle" style={{ marginBottom: Spacing.s }}>
            作業ログ
          </ThemedText>
          {recentNotes.length > 0 ? (
            recentNotes.map((note) => (
              <View key={note.id} style={[styles.noteCard, { backgroundColor: colors.card }]}>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {formatDate(note.date)}
                </ThemedText>
                <ThemedText style={{ marginTop: 4 }}>{note.note}</ThemedText>
              </View>
            ))
          ) : (
            <ThemedText style={{ color: colors.textSecondary }}>
              まだメモがありません
            </ThemedText>
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

          {adjustDate && (
            <View ref={adjustRef} style={[styles.adjustPanel, { backgroundColor: colors.card }]}>
              <View style={styles.adjustHeader}>
                <ThemedText type="defaultSemiBold">
                  {formatDate(adjustDate)} の調整
                </ThemedText>
                <Pressable onPress={() => setAdjustDate(null)}>
                  <IconSymbol name="xmark" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
              {item.type === "time" ? (
                <TimeInput value={adjustSeconds} onChange={setAdjustSeconds} />
              ) : (
                <View style={styles.adjustCountRow}>
                  <TextInput
                    style={[
                      styles.adjustCountInput,
                      { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                    ]}
                    value={adjustCount.toString()}
                    onChangeText={(text) => setAdjustCount(Math.max(1, parseInt(text || "0", 10)))}
                    keyboardType="numeric"
                  />
                  <ThemedText style={{ color: colors.textSecondary }}>回</ThemedText>
                </View>
              )}
              <View style={styles.adjustButtons}>
                <Pressable
                  style={[styles.adjustActionButton, { backgroundColor: colors.tint }]}
                  onPress={() => handleAdjust("plus")}
                >
                  <ThemedText style={{ color: "#fff", fontWeight: "600" }}>増やす</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.adjustActionButton, { backgroundColor: colors.error }]}
                  onPress={() => handleAdjust("minus")}
                >
                  <ThemedText style={{ color: "#fff", fontWeight: "600" }}>減らす</ThemedText>
                </Pressable>
              </View>
              <ThemedText style={styles.adjustHint}>
                ※ この日の合計として調整されます
              </ThemedText>
            </View>
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
  memoSection: {
    marginBottom: Spacing.l,
  },
  memoInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.card,
    padding: Spacing.m,
    minHeight: 90,
    fontSize: 14,
  },
  memoHint: {
    marginTop: Spacing.xs,
    color: "#888",
    fontSize: 11,
  },
  reminderSection: {
    marginBottom: Spacing.l,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
  },
  reminderTimeInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: BorderRadius.card,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  adjustPanel: {
    marginTop: Spacing.m,
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  adjustHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.s,
  },
  adjustButtons: {
    flexDirection: "row",
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  adjustActionButton: {
    flex: 1,
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.button,
    alignItems: "center",
  },
  adjustHint: {
    marginTop: Spacing.xs,
    color: "#888",
    fontSize: 11,
  },
  adjustCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
  },
  adjustCountInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.card,
    padding: Spacing.m,
    minWidth: 80,
    textAlign: "center",
    fontSize: 16,
  },
  notesSection: {
    marginBottom: Spacing.l,
  },
  noteCard: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.s,
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
  pomodoroOptions: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.m,
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
    borderWidth: 1,
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













