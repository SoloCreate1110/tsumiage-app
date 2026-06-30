/**
 * 邨ｱ險育判髱｢ - 謌宣聞縺ｮ蜿ｯ隕門喧
 */

import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";

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
  getCountUnitLabel,
  getTodayDate,
  toDateString,
} from "@/types/stack";
import { shareView } from "@/utils/share";

interface ChartAxis {
  max: number;
  ticks: number[];
  formatLabel: (value: number) => string;
}

function buildCountAxis(maxValue: number): ChartAxis {
  const safeMax = Math.max(1, maxValue);
  let step = 1;
  if (safeMax > 10) step = 5;
  if (safeMax > 50) step = 10;
  if (safeMax > 100) step = 20;
  if (safeMax > 300) step = 50;
  if (safeMax > 1000) step = 100;

  const max = Math.ceil(safeMax / step) * step;
  const middle = Math.round(max / 2);

  return {
    max,
    ticks: [max, middle, 0],
    formatLabel: (value) => `${value}`,
  };
}

function buildTimeAxis(maxValue: number): ChartAxis {
  const safeMax = Math.max(60, maxValue);
  const oneHour = 60 * 60;
  const minute = 60;

  if (safeMax >= oneHour) {
    const stepHours =
      safeMax <= 3 * oneHour ? 1 : safeMax <= 6 * oneHour ? 2 : safeMax <= 12 * oneHour ? 3 : 6;
    const step = stepHours * oneHour;
    const max = Math.ceil(safeMax / step) * step;
    const ticks = [];
    for (let value = max; value >= 0; value -= step) {
      ticks.push(value);
    }
    return {
      max,
      ticks,
      formatLabel: (value) => `${Math.round(value / oneHour)}h`,
    };
  }

  const safeMinutes = Math.ceil(safeMax / minute);
  const stepMinutes =
    safeMinutes <= 10 ? 5 : safeMinutes <= 30 ? 10 : safeMinutes <= 60 ? 15 : 30;
  const step = stepMinutes * minute;
  const max = Math.ceil(safeMax / step) * step;
  const ticks = [];
  for (let value = max; value >= 0; value -= step) {
    ticks.push(value);
  }
  return {
    max,
    ticks,
    formatLabel: (value) => `${Math.round(value / minute)}m`,
  };
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { items, records, loading, reload } = useStackStorage();
  const viewRef = useRef<View>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>("all");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const normalizeRecordDate = useCallback((value: string) => {
    if (!value) return value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const normalized = value.includes("/") ? value.replace(/\//g, "-") : value;
    const head = normalized.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return toDateString(parsed);
    return value;
  }, []);

  const handleShare = async () => {
    await shareView(viewRef);
  };

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    reload();
  }, [records.length, reload]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId),
    [items, selectedItemId]
  );

  const selectedRecords = useMemo(() => {
    if (selectedItemId === "all") return records;
    return records.filter((record) => record.itemId === selectedItemId);
  }, [records, selectedItemId]);

  // 蜈ｨ菴薙・邨ｱ險医ｒ險育ｮ・
  const stats = useMemo(() => {
    const itemTypeMap = new Map(items.map((item) => [item.id, item.type]));

    const totalTime = selectedRecords.reduce((sum, record) => {
      const type = selectedItem?.type ?? itemTypeMap.get(record.itemId);
      return type === "time" ? sum + record.value : sum;
    }, 0);
    const totalCount = selectedRecords.reduce((sum, record) => {
      const type = selectedItem?.type ?? itemTypeMap.get(record.itemId);
      return type === "count" ? sum + record.value : sum;
    }, 0);

    // 連続日数繧定ｨ育ｮ・
    const uniqueDates = [...new Set(selectedRecords.map((r) => r.date))].sort();
    let streak = 0;
    const today = getTodayDate();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = toDateString(checkDate);
      if (uniqueDates.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      totalTime,
      totalCount,
      totalRecords: selectedRecords.length,
      streak,
    };
  }, [items, selectedItem, selectedRecords]);

  // 驕主悉7日髢薙・繧ｰ繝ｩ繝輔ョ繝ｼ繧ｿ・亥・鬆・岼蜷郁ｨ茨ｼ・
  const chartData = useMemo(() => {
    const days = 7;
    const result: { date: string; timeValue: number; countValue: number }[] = [];
    const today = getTodayDate();
    const itemTypeMap = new Map(items.map((item) => [item.id, item.type]));

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = toDateString(date);

      const dayRecords = selectedRecords.filter((record) => record.date === dateStr);
      const timeValue = dayRecords.reduce((sum, record) => {
        const type = selectedItem?.type ?? itemTypeMap.get(record.itemId);
        return type === "time" ? sum + record.value : sum;
      }, 0);
      const countValue = dayRecords.reduce((sum, record) => {
        const type = selectedItem?.type ?? itemTypeMap.get(record.itemId);
        return type === "count" ? sum + record.value : sum;
      }, 0);

      result.push({ date: dateStr, timeValue, countValue });
    }

    return result;
  }, [items, selectedItem, selectedRecords]);

  const heatmapData = useMemo(() => {
    const today = getTodayDate();
    const weeks = 20;
    const daysToLoad = weeks * 7;
    const data = [];

    const activityMap = new Map<string, number>();
    selectedRecords.forEach((record) => {
      const key = normalizeRecordDate(record.date);
      const count = activityMap.get(key) || 0;
      activityMap.set(key, count + 1);
    });

    const dayOfWeek = today.getDay();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek - (weeks - 1) * 7);

    for (let i = 0; i < daysToLoad; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = toDateString(d);
      const count = activityMap.get(dateStr) || 0;

      let level = 0;
      if (count > 0) {
        if (count === 1) level = 1;
        else if (count <= 3) level = 2;
        else if (count <= 5) level = 3;
        else level = 4;
      }

      data.push({
        date: dateStr,
        dateObj: d,
        count,
        level,
      });
    }

    return data;
  }, [normalizeRecordDate, selectedRecords]);

  const weeksData = useMemo(() => {
    const weeks = [];
    let currentWeek = [];

    for (let i = 0; i < heatmapData.length; i++) {
      currentWeek.push(heatmapData[i]);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    return weeks;
  }, [heatmapData]);

  const getLevelColor = useCallback(
    (level: number) => {
      if (colorScheme === "dark") {
        switch (level) {
          case 1:
            return "#0E4429";
          case 2:
            return "#006D32";
          case 3:
            return "#26A641";
          case 4:
            return "#39D353";
          default:
            return "#161B22";
        }
      }

      switch (level) {
        case 1:
          return "#9BE9A8";
        case 2:
          return "#40C463";
        case 3:
          return "#30A14E";
        case 4:
          return "#216E39";
        default:
          return "#EBEDF0";
      }
    },
    [colorScheme]
  );

  const selectedDateSummary = useMemo(() => {
    if (!selectedDate) return [];
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const dayRecords = selectedRecords.filter(
      (record) => normalizeRecordDate(record.date) === selectedDate
    );
    const grouped = new Map<string, { value: number; records: number }>();

    dayRecords.forEach((record) => {
      const current = grouped.get(record.itemId) ?? { value: 0, records: 0 };
      grouped.set(record.itemId, {
        value: current.value + record.value,
        records: current.records + 1,
      });
    });

    return [...grouped.entries()]
      .map(([itemId, summary]) => ({
        item: itemMap.get(itemId),
        ...summary,
      }))
      .filter((entry) => entry.item);
  }, [items, normalizeRecordDate, selectedDate, selectedRecords]);

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText>読み込み中...</ThemedText>
      </ThemedView>
    );
  }

  const maxTimeValue = Math.max(...chartData.map((d) => d.timeValue), 1);
  const maxCountValue = Math.max(...chartData.map((d) => d.countValue), 1);
  const timeAxis = buildTimeAxis(maxTimeValue);
  const countAxis = buildCountAxis(maxCountValue);

  const axisLabelWidth = 38;
  const plotWidth = 292;
  const chartWidth = axisLabelWidth + plotWidth;
  const chartHeight = 130;
  const barWidth = 28;
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
      {/* ヘッダー（固定） */}
      <View style={styles.header}>
        <View>
          <ThemedText type="title">統計</ThemedText>
          <ThemedText style={{ color: colors.textSecondary }}>
            あなたの頑張りを見える化します
          </ThemedText>
        </View>
        <Pressable onPress={handleShare} style={{ padding: Spacing.s }}>
          <IconSymbol name="square.and.arrow.up" size={24} color={colors.tint} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          ref={viewRef}
          collapsable={false}
          style={{ backgroundColor: colors.background }}
        >
        <View style={styles.selectorContainer}>
          <ThemedText style={[styles.selectorLabel, { color: colors.textSecondary }]}>
            表示対象
          </ThemedText>
          <Pressable
            onPress={() => setSelectorOpen((open) => !open)}
            style={[
              styles.selectorButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ThemedText style={styles.selectorText} numberOfLines={1}>
              {selectedItem?.name ?? "全ての統計"}
            </ThemedText>
            <IconSymbol
              name={selectorOpen ? "chevron.up" : "chevron.down"}
              size={22}
              color={colors.textSecondary}
            />
          </Pressable>
          {selectorOpen && (
            <View style={[styles.selectorMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                onPress={() => {
                  setSelectedItemId("all");
                  setSelectedDate(null);
                  setSelectorOpen(false);
                }}
                style={[
                  styles.selectorOption,
                  selectedItemId === "all" && { backgroundColor: colors.tint + "18" },
                ]}
              >
                <ThemedText style={{ color: selectedItemId === "all" ? colors.tint : colors.text }}>
                  全ての統計
                </ThemedText>
              </Pressable>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSelectedItemId(item.id);
                    setSelectedDate(null);
                    setSelectorOpen(false);
                  }}
                  style={[
                    styles.selectorOption,
                    selectedItemId === item.id && { backgroundColor: item.color + "18" },
                  ]}
                >
                  <View style={[styles.optionDot, { backgroundColor: item.color }]} />
                  <ThemedText style={{ color: selectedItemId === item.id ? item.color : colors.text }}>
                    {item.name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* 繧ｵ繝槭Μ繝ｼ繧ｫ繝ｼ繝・*/}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.tint + "20" }]}>
              <IconSymbol name="clock.fill" size={24} color={colors.tint} />
            </View>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
              合計時間
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
              合計回数
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

        <View style={[styles.activitySection, { backgroundColor: colors.card }]}>
          <View style={styles.activityHeader}>
            <View>
              <ThemedText type="subtitle">活動記録</ThemedText>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                {selectedItem ? `${selectedItem.name}の積み上げ` : "日々の積み上げ"}
              </ThemedText>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.heatmapScroll}
            contentContainerStyle={styles.heatmapContent}
          >
            <View style={styles.heatmapGrid}>
              <View style={styles.dayLabels}>
                {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
                  <ThemedText key={day} style={styles.dayLabel}>
                    {day}
                  </ThemedText>
                ))}
              </View>

              <View style={styles.weeksContainer}>
                {weeksData.map((week, weekIndex) => (
                  <View key={weekIndex} style={styles.weekColumn}>
                    {week.map((day) => (
                      <Pressable
                        key={day.date}
                        onPress={() => setSelectedDate(day.count > 0 ? day.date : null)}
                        style={[
                          styles.cell,
                          {
                            backgroundColor: getLevelColor(day.level),
                            borderColor: selectedDate === day.date ? colors.tint : "transparent",
                          },
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.legendContainer}>
            <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginRight: 8 }}>
              少
            </ThemedText>
            {[0, 1, 2, 3, 4].map((level) => (
              <View
                key={level}
                style={[styles.legendCell, { backgroundColor: getLevelColor(level) }]}
              />
            ))}
            <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 8 }}>
              多
            </ThemedText>
          </View>
          <ThemedText style={styles.cutoffNote}>※ 日付は朝5時に切り替わります</ThemedText>

          {selectedDate && (
            <View style={styles.dayDetailContainer}>
              <ThemedText type="subtitle" style={{ marginBottom: Spacing.m }}>
                {formatDate(selectedDate)}の記録
              </ThemedText>
              {selectedDateSummary.length > 0 ? (
                selectedDateSummary.map(({ item, value, records: recordCount }) => {
                  if (!item) return null;
                  const displayValue =
                    item.type === "time"
                      ? formatTime(value)
                      : formatCount(value, getCountUnitLabel(item));
                  return (
                    <View
                      key={item.id}
                      style={[styles.dayDetailCard, { backgroundColor: colors.background }]}
                    >
                      <View style={[styles.detailIcon, { backgroundColor: item.color + "20" }]}>
                        <IconSymbol name={item.icon as any} size={20} color={item.color} />
                      </View>
                      <View style={styles.detailText}>
                        <ThemedText style={styles.detailName} numberOfLines={1}>
                          {item.name}
                        </ThemedText>
                        <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {recordCount}件
                        </ThemedText>
                      </View>
                      <ThemedText type="subtitle" style={{ color: item.color }}>
                        {displayValue}
                      </ThemedText>
                    </View>
                  );
                })
              ) : (
                <View style={[styles.dayDetailCard, { backgroundColor: colors.background }]}>
                  <ThemedText style={{ color: colors.textSecondary }}>
                    この日の記録はありません
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          <View style={styles.statsContainer}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.m }}>
              週間サマリー
            </ThemedText>
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <ThemedText style={{ color: colors.textSecondary }}>活動日数</ThemedText>
              <ThemedText type="title" style={{ color: colors.tint }}>
                {heatmapData.filter((day) => day.count > 0).length}日
              </ThemedText>
            </View>
          </View>
        </View>

        {/* 譎る俣繧ｰ繝ｩ繝・*/}
        {(selectedItem ? selectedItem.type === "time" : items.some((i) => i.type === "time")) && (
          <View style={[styles.chartSection, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={styles.chartTitle}>
              直近7日間の時間
            </ThemedText>
            <View style={styles.chartContainer}>
              <Svg width={chartWidth} height={chartHeight + 30}>
                {timeAxis.ticks.map((tick) => {
                  const y = chartHeight - (tick / timeAxis.max) * chartHeight;
                  return (
                    <SvgText
                      key={`time-axis-${tick}`}
                      x={axisLabelWidth - 8}
                      y={y + 4}
                      fontSize={10}
                      fill={colors.textSecondary}
                      textAnchor="end"
                    >
                      {timeAxis.formatLabel(tick)}
                    </SvgText>
                  );
                })}
                {timeAxis.ticks.map((tick) => {
                  const y = chartHeight - (tick / timeAxis.max) * chartHeight;
                  return (
                    <Line
                      key={`time-grid-${tick}`}
                      x1={axisLabelWidth}
                      y1={y}
                      x2={chartWidth}
                      y2={y}
                      stroke={colors.border}
                      strokeWidth={1}
                      opacity={tick === 0 ? 0.8 : 0.45}
                    />
                  );
                })}
                {chartData.map((data, index) => {
                  const barHeight = (data.timeValue / timeAxis.max) * chartHeight;
                  const x = axisLabelWidth + index * (barWidth + barGap) + barGap;
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
                  const x = axisLabelWidth + index * (barWidth + barGap) + barGap + barWidth / 2;
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

        {/* 蝗樊焚繧ｰ繝ｩ繝・*/}
        {(selectedItem ? selectedItem.type === "count" : items.some((i) => i.type === "count")) && (
          <View style={[styles.chartSection, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={styles.chartTitle}>
              直近7日間の回数
            </ThemedText>
            <View style={styles.chartContainer}>
              <Svg width={chartWidth} height={chartHeight + 30}>
                {countAxis.ticks.map((tick) => {
                  const y = chartHeight - (tick / countAxis.max) * chartHeight;
                  return (
                    <SvgText
                      key={`count-axis-${tick}`}
                      x={axisLabelWidth - 8}
                      y={y + 4}
                      fontSize={10}
                      fill={colors.textSecondary}
                      textAnchor="end"
                    >
                      {countAxis.formatLabel(tick)}
                    </SvgText>
                  );
                })}
                {countAxis.ticks.map((tick) => {
                  const y = chartHeight - (tick / countAxis.max) * chartHeight;
                  return (
                    <Line
                      key={`count-grid-${tick}`}
                      x1={axisLabelWidth}
                      y1={y}
                      x2={chartWidth}
                      y2={y}
                      stroke={colors.border}
                      strokeWidth={1}
                      opacity={tick === 0 ? 0.8 : 0.45}
                    />
                  );
                })}
                {chartData.map((data, index) => {
                  const barHeight = (data.countValue / countAxis.max) * chartHeight;
                  const x = axisLabelWidth + index * (barWidth + barGap) + barGap;
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
                  const x = axisLabelWidth + index * (barWidth + barGap) + barGap + barWidth / 2;
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

        {/* 鬆・岼縺後↑縺・ｴ蜷・*/}
        {items.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="chart.bar.fill" size={48} color={colors.textDisabled} />
            <ThemedText style={{ color: colors.textSecondary, marginTop: Spacing.m }}>
              まだデータがありません
            </ThemedText>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
              記録を追加してグラフを表示しましょう
            </ThemedText>
          </View>
        )}

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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectorContainer: {
    paddingHorizontal: Spacing.m,
    marginBottom: Spacing.m,
  },
  selectorLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
    fontWeight: "600",
  },
  selectorButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorText: {
    flex: 1,
    marginRight: Spacing.s,
    fontWeight: "600",
  },
  selectorMenu: {
    borderWidth: 1,
    borderRadius: BorderRadius.button,
    marginTop: Spacing.xs,
    overflow: "hidden",
  },
  selectorOption: {
    minHeight: 44,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    flexDirection: "row",
    alignItems: "center",
  },
  optionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.s,
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
  activitySection: {
    margin: Spacing.m,
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    marginBottom: Spacing.s,
  },
  heatmapScroll: {
    marginVertical: Spacing.m,
  },
  heatmapContent: {
    paddingRight: Spacing.s,
  },
  heatmapGrid: {
    flexDirection: "row",
  },
  dayLabels: {
    justifyContent: "space-between",
    marginRight: Spacing.s,
    paddingVertical: 2,
    height: (12 + 4) * 7,
  },
  dayLabel: {
    fontSize: 10,
    height: 16,
    lineHeight: 16,
    opacity: 0.5,
  },
  weeksContainer: {
    flexDirection: "row",
    gap: 3,
  },
  weekColumn: {
    gap: 3,
  },
  cell: {
    width: 14,
    height: 14,
    borderRadius: 2,
    borderWidth: 2,
  },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: Spacing.s,
  },
  cutoffNote: {
    fontSize: 11,
    color: "#888",
    marginBottom: Spacing.l,
    textAlign: "right",
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  dayDetailContainer: {
    marginBottom: Spacing.l,
  },
  dayDetailCard: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.s,
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.s,
  },
  detailText: {
    flex: 1,
    marginRight: Spacing.s,
  },
  detailName: {
    fontWeight: "600",
  },
  statsContainer: {
    marginTop: Spacing.s,
  },
  statCard: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    alignItems: "center",
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





