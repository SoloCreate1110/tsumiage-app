/**
 * 統計画面 - 成長の可視化
 */

import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useStackStorage } from "@/hooks/use-stack-storage";
import { formatCount, formatDate, formatTime } from "@/types/stack";

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { items, records, loading, getDailyTotals } = useStackStorage();

  // 全体の統計を計算
  const stats = useMemo(() => {
    const totalTimeItems = items.filter((i) => i.type === "time");
    const totalCountItems = items.filter((i) => i.type === "count");

    const totalTime = totalTimeItems.reduce((sum, i) => sum + i.totalValue, 0);
    const totalCount = totalCountItems.reduce((sum, i) => sum + i.totalValue, 0);

    // 連続日数を計算
    const uniqueDates = [...new Set(records.map((r) => r.date))].sort();
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      if (uniqueDates.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      totalTime,
      totalCount,
      totalItems: items.length,
      totalRecords: records.length,
      streak,
    };
  }, [items, records]);

  // 過去7日間のグラフデータ（全項目合計）
  const chartData = useMemo(() => {
    const days = 7;
    const result: { date: string; timeValue: number; countValue: number }[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      let timeValue = 0;
      let countValue = 0;

      items.forEach((item) => {
        const dailyTotals = getDailyTotals(item.id, days);
        const dayData = dailyTotals.find((d) => d.date === dateStr);
        if (dayData) {
          if (item.type === "time") {
            timeValue += dayData.value;
          } else {
            countValue += dayData.value;
          }
        }
      });

      result.push({ date: dateStr, timeValue, countValue });
    }

    return result;
  }, [items, getDailyTotals]);

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText>読み込み中...</ThemedText>
      </ThemedView>
    );
  }

  // グラフの最大値を計算
  const maxTimeValue = Math.max(...chartData.map((d) => d.timeValue), 1);
  const maxCountValue = Math.max(...chartData.map((d) => d.countValue), 1);

  const chartWidth = 320;
  const chartHeight = 120;
  const barWidth = 32;
  const barGap = 12;

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
          <ThemedText type="title">統計</ThemedText>
          <ThemedText style={{ color: colors.textSecondary }}>
            あなたの成長を確認しましょう
          </ThemedText>
        </View>

        {/* サマリーカード */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.tint + "20" }]}>
              <IconSymbol name="clock.fill" size={24} color={colors.tint} />
            </View>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
              累計時間
            </ThemedText>
            <ThemedText type="subtitle" style={{ color: colors.tint }}>
              {formatTime(stats.totalTime)}
            </ThemedText>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.success + "20" }]}>
              <IconSymbol name="number" size={24} color={colors.success} />
            </View>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
              累計回数
            </ThemedText>
            <ThemedText type="subtitle" style={{ color: colors.success }}>
              {formatCount(stats.totalCount)}
            </ThemedText>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIcon, { backgroundColor: "#9C27B0" + "20" }]}>
              <IconSymbol name="checkmark.circle.fill" size={24} color="#9C27B0" />
            </View>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
              連続日数
            </ThemedText>
            <ThemedText type="subtitle" style={{ color: "#9C27B0" }}>
              {stats.streak}日
            </ThemedText>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIcon, { backgroundColor: "#2196F3" + "20" }]}>
              <IconSymbol name="chart.bar.fill" size={24} color="#2196F3" />
            </View>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
              記録数
            </ThemedText>
            <ThemedText type="subtitle" style={{ color: "#2196F3" }}>
              {stats.totalRecords}件
            </ThemedText>
          </View>
        </View>

        {/* 時間グラフ */}
        {items.some((i) => i.type === "time") && (
          <View style={[styles.chartSection, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={styles.chartTitle}>
              過去7日間の時間
            </ThemedText>
            <View style={styles.chartContainer}>
              <Svg width={chartWidth} height={chartHeight + 30}>
                {chartData.map((data, index) => {
                  const barHeight = (data.timeValue / maxTimeValue) * chartHeight;
                  const x = index * (barWidth + barGap) + barGap;
                  const y = chartHeight - barHeight;

                  return (
                    <Rect
                      key={data.date}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight || 2}
                      rx={4}
                      fill={colors.tint}
                      opacity={data.timeValue > 0 ? 1 : 0.3}
                    />
                  );
                })}
                {chartData.map((data, index) => {
                  const x = index * (barWidth + barGap) + barGap + barWidth / 2;
                  return (
                    <SvgText
                      key={`label-${data.date}`}
                      x={x}
                      y={chartHeight + 20}
                      fontSize={10}
                      fill={colors.textSecondary}
                      textAnchor="middle"
                    >
                      {formatDate(data.date)}
                    </SvgText>
                  );
                })}
              </Svg>
            </View>
          </View>
        )}

        {/* 回数グラフ */}
        {items.some((i) => i.type === "count") && (
          <View style={[styles.chartSection, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={styles.chartTitle}>
              過去7日間の回数
            </ThemedText>
            <View style={styles.chartContainer}>
              <Svg width={chartWidth} height={chartHeight + 30}>
                {chartData.map((data, index) => {
                  const barHeight = (data.countValue / maxCountValue) * chartHeight;
                  const x = index * (barWidth + barGap) + barGap;
                  const y = chartHeight - barHeight;

                  return (
                    <Rect
                      key={data.date}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight || 2}
                      rx={4}
                      fill={colors.success}
                      opacity={data.countValue > 0 ? 1 : 0.3}
                    />
                  );
                })}
                {chartData.map((data, index) => {
                  const x = index * (barWidth + barGap) + barGap + barWidth / 2;
                  return (
                    <SvgText
                      key={`label-${data.date}`}
                      x={x}
                      y={chartHeight + 20}
                      fontSize={10}
                      fill={colors.textSecondary}
                      textAnchor="middle"
                    >
                      {formatDate(data.date)}
                    </SvgText>
                  );
                })}
              </Svg>
            </View>
          </View>
        )}

        {/* 項目がない場合 */}
        {items.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="chart.bar.fill" size={48} color={colors.textDisabled} />
            <ThemedText style={{ color: colors.textSecondary, marginTop: Spacing.m }}>
              まだデータがありません
            </ThemedText>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
              項目を追加して積み上げを始めましょう
            </ThemedText>
          </View>
        )}

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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.s,
    gap: Spacing.s,
  },
  summaryCard: {
    width: "47%",
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.s,
  },
  chartSection: {
    margin: Spacing.m,
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    marginBottom: Spacing.m,
  },
  chartContainer: {
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
    marginTop: Spacing.xl,
  },
});
