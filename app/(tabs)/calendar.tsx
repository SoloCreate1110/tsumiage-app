import { useMemo, useRef, useCallback, useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useStackStorage } from "@/hooks/use-stack-storage";
import { getTodayDate, toDateString } from "@/types/stack";
import { shareView } from "@/utils/share";

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { records, loading, reload } = useStackStorage();
  const viewRef = useRef<View>(null);
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

  // ... (keep heatmapData calculation) ...

  // 繝偵・繝医・繝・・逕ｨ縺ｮ繝・・繧ｿ繧堤函謌撰ｼ磯℃蜴ｻ20騾ｱ髢灘・・・
  const heatmapData = useMemo(() => {
    const today = getTodayDate();
    const weeks = 20;
    const daysToLoad = weeks * 7;
    const data = [];

    // 記録日ごとの件数を集計
    const activityMap = new Map<string, number>();
    records.forEach((r) => {
      const key = normalizeRecordDate(r.date);
      const count = activityMap.get(key) || 0;
      activityMap.set(key, count + 1);
    });

    // 右端が「今日」、列は週単位（上から日〜土）で揃える
    const dayOfWeek = today.getDay(); // 0:日
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek - (weeks - 1) * 7);

    // 日付ごとにレベルを算出
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
        level
      });
    }

    return data;
  }, [records]);

  // 日莉倥ョ繝ｼ繧ｿ繧帝ｱ縺斐→縺ｮ驟榊・縺ｫ螟画鋤 [騾ｱ髢転[譖懈律]
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
    // 邱醍ｳｻ縺ｮ濶ｲ・郁拷・・
    if (colorScheme === 'dark') {
      switch (level) {
        case 1: return "#0E4429";
        case 2: return "#006D32";
        case 3: return "#26A641";
        case 4: return "#39D353";
        default: return "#161B22";
      }
    } else {
      switch (level) {
        case 1: return "#9BE9A8";
        case 2: return "#40C463";
        case 3: return "#30A14E";
        case 4: return "#216E39";
        default: return "#EBEDF0";
      }
    }
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
      {/* ヘッダー（固定） */}
      <View style={styles.header}>
        <View>
          <ThemedText type="title">活動記録</ThemedText>
          <ThemedText style={{ color: colors.textSecondary }}>
            日々の積み上げを可視化しましょう
          </ThemedText>
        </View>
        <Pressable onPress={handleShare} style={{ padding: Spacing.s }}>
          <IconSymbol name="square.and.arrow.up" size={24} color={colors.tint} />
        </Pressable>
      </View>

      {/* 繧ｭ繝｣繝励メ繝｣蟇ｾ雎｡ */}
      <View
        ref={viewRef}
        collapsable={false}
        style={{ flex: 1, backgroundColor: colors.background }} // 閭梧勹濶ｲ繧呈欠螳壹＠縺ｪ縺・→騾城℃縺ｫ縺ｪ繧句庄閭ｽ諤ｧ
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
        >
          {/* 繝偵・繝医・繝・・繧ｳ繝ｳ繝・リ */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.heatmapScroll}
            contentContainerStyle={styles.heatmapContent}
          >
            <View style={styles.heatmapGrid}>
              {/* 曜日ラベル（日〜土） */}
              <View style={styles.dayLabels}>
                {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                  <ThemedText key={d} style={styles.dayLabel}>
                    {d}
                  </ThemedText>
                ))}
              </View>

              {/* 繧ｰ繝ｪ繝・ラ譛ｬ菴・*/}
              <View style={styles.weeksContainer}>
                {weeksData.map((week, wIndex) => (
                  <View key={wIndex} style={styles.weekColumn}>
                    {week.map((day, dIndex) => (
                      <View
                        key={day.date}
                        style={[
                          styles.cell,
                          { backgroundColor: getLevelColor(day.level) }
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* 蜃｡萓・*/}
          <View style={styles.legendContainer}>
            <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginRight: 8 }}>少</ThemedText>
            {[0, 1, 2, 3, 4].map(level => (
              <View
                key={level}
                style={[styles.legendCell, { backgroundColor: getLevelColor(level) }]}
              />
            ))}
            <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 8 }}>多</ThemedText>
          </View>

          <View style={styles.statsContainer}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.m }}>週間サマリー</ThemedText>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <ThemedText style={{ color: colors.textSecondary }}>活動日数</ThemedText>
              <ThemedText type="title" style={{ color: colors.tint }}>
                {heatmapData.filter(d => d.count > 0).length}日
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
  heatmapScroll: {
    marginVertical: Spacing.m,
  },
  heatmapContent: {
    paddingHorizontal: Spacing.m,
  },
  heatmapGrid: {
    flexDirection: 'row',
  },
  dayLabels: {
    justifyContent: 'space-between',
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
    flexDirection: 'row',
    gap: 3,
  },
  weekColumn: {
    gap: 3,
  },
  cell: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.m,
    marginBottom: Spacing.l,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  statsContainer: {
    paddingHorizontal: Spacing.m,
  },
  statCard: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
  }
});












