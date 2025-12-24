/**
 * カレンダービュー - 月間カレンダーで継続状況を可視化
 */

import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useStackStorage } from "@/hooks/use-stack-storage";

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { records, loading } = useStackStorage();

  const [currentDate, setCurrentDate] = useState(new Date());

  // 月の情報を計算
  const monthInfo = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 月の最初の日と最後の日
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 月の最初の日の曜日（0=日曜日）
    const firstDayOfWeek = firstDay.getDay();

    // 月の日数
    const daysInMonth = lastDay.getDate();

    // カレンダーに表示する日付の配列
    const days: (number | null)[] = [];

    // 最初の週の空白を埋める
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // 日付を追加
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return {
      year,
      month,
      days,
      monthName: `${year}年${month + 1}月`,
    };
  }, [currentDate]);

  // 各日に記録があるかチェック
  const hasRecordOnDate = useMemo(() => {
    const recordDates = new Set(records.map((r) => r.date));
    const result: Record<string, boolean> = {};

    monthInfo.days.forEach((day) => {
      if (day) {
        const dateStr = `${monthInfo.year}-${String(monthInfo.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        result[day] = recordDates.has(dateStr);
      }
    });

    return result;
  }, [records, monthInfo]);

  // 今日の日付
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === monthInfo.year &&
    today.getMonth() === monthInfo.month;
  const todayDate = isCurrentMonth ? today.getDate() : null;

  // 前月へ
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // 次月へ
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 今月へ
  const handleToday = () => {
    setCurrentDate(new Date());
  };

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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <ThemedText type="title">カレンダー</ThemedText>
          <ThemedText style={{ color: colors.textSecondary }}>
            継続状況を確認しましょう
          </ThemedText>
        </View>

        {/* 月の切り替え */}
        <View style={styles.monthSelector}>
          <Pressable onPress={handlePrevMonth} style={styles.monthButton}>
            <IconSymbol name="arrow.left" size={20} color={colors.tint} />
          </Pressable>

          <ThemedText type="subtitle">{monthInfo.monthName}</ThemedText>

          <Pressable onPress={handleNextMonth} style={styles.monthButton}>
            <IconSymbol name="chevron.right" size={20} color={colors.tint} />
          </Pressable>
        </View>

        <Pressable onPress={handleToday} style={styles.todayButton}>
          <ThemedText style={{ color: colors.tint, fontSize: 14 }}>
            今月へ
          </ThemedText>
        </Pressable>

        {/* カレンダー */}
        <View style={[styles.calendar, { backgroundColor: colors.card }]}>
          {/* 曜日ヘッダー */}
          <View style={styles.weekHeader}>
            {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
              <View key={day} style={styles.dayHeader}>
                <ThemedText
                  style={[
                    styles.dayHeaderText,
                    {
                      color:
                        index === 0
                          ? "#FF5252"
                          : index === 6
                          ? "#2196F3"
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {day}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* 日付グリッド */}
          <View style={styles.daysGrid}>
            {monthInfo.days.map((day, index) => {
              const isToday = day === todayDate;
              const hasRecord = day ? hasRecordOnDate[day] : false;

              return (
                <View key={index} style={styles.dayCell}>
                  {day ? (
                    <View
                      style={[
                        styles.dayContent,
                        isToday && {
                          backgroundColor: colors.tint + "20",
                          borderColor: colors.tint,
                          borderWidth: 2,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.dayNumber,
                          isToday && { color: colors.tint, fontWeight: "bold" },
                        ]}
                      >
                        {day}
                      </ThemedText>
                      {hasRecord && (
                        <View
                          style={[
                            styles.recordDot,
                            { backgroundColor: colors.success },
                          ]}
                        />
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyDay} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* 凡例 */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.success }]}
            />
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
              記録あり
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendBox,
                {
                  backgroundColor: colors.tint + "20",
                  borderColor: colors.tint,
                },
              ]}
            />
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
              今日
            </ThemedText>
          </View>
        </View>

        <View style={{ height: 100 }} />
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
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.m,
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.m,
    marginBottom: Spacing.s,
  },
  monthButton: {
    padding: Spacing.s,
  },
  todayButton: {
    alignSelf: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.m,
    marginBottom: Spacing.m,
  },
  calendar: {
    marginHorizontal: Spacing.m,
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weekHeader: {
    flexDirection: "row",
    marginBottom: Spacing.s,
  },
  dayHeader: {
    flex: 1,
    alignItems: "center",
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: "600",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%", // 7日分
    aspectRatio: 1,
    padding: 2,
  },
  dayContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    position: "relative",
  },
  emptyDay: {
    flex: 1,
  },
  dayNumber: {
    fontSize: 14,
  },
  recordDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: "absolute",
    bottom: 4,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.l,
    marginTop: Spacing.l,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
  },
});
