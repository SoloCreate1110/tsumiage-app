import { useMemo, useRef, useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

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

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { items, records, loading, reload } = useStackStorage();
  const viewRef = useRef<View>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>("all");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const normalizeRecordDate = (value: string) => {
    if (!value) return value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const normalized = value.includes("/") ? value.replace(/\//g, "-") : value;
    const head = normalized.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return toDateString(parsed);
    return value;
  };

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
  }, [selectedRecords]);

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

  const getLevelColor = (level: number) => {
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
  };

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
  }, [items, selectedDate, selectedRecords]);

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
      <View style={styles.header}>
        <View>
          <ThemedText type="title">活動記録</ThemedText>
          <ThemedText style={{ color: colors.textSecondary }}>
            {selectedItem ? `${selectedItem.name}の積み上げ` : "日々の積み上げを可視化しましょう"}
          </ThemedText>
        </View>
        <Pressable onPress={handleShare} style={{ padding: Spacing.s }}>
          <IconSymbol name="square.and.arrow.up" size={24} color={colors.tint} />
        </Pressable>
      </View>

      <View
        ref={viewRef}
        collapsable={false}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
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
                      style={[styles.dayDetailCard, { backgroundColor: colors.card }]}
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
                <View style={[styles.dayDetailCard, { backgroundColor: colors.card }]}>
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
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <ThemedText style={{ color: colors.textSecondary }}>活動日数</ThemedText>
              <ThemedText type="title" style={{ color: colors.tint }}>
                {heatmapData.filter((day) => day.count > 0).length}日
              </ThemedText>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
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
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.m,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectorContainer: {
    paddingHorizontal: Spacing.m,
    marginBottom: Spacing.s,
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
  heatmapScroll: {
    marginVertical: Spacing.m,
  },
  heatmapContent: {
    paddingHorizontal: Spacing.m,
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
    paddingHorizontal: Spacing.m,
    marginBottom: Spacing.l,
  },
  cutoffNote: {
    fontSize: 11,
    color: "#888",
    paddingHorizontal: Spacing.m,
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
    paddingHorizontal: Spacing.m,
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
    paddingHorizontal: Spacing.m,
  },
  statCard: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    alignItems: "center",
  },
});
