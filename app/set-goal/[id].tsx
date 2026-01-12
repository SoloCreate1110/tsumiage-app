/**
 * 目標設定モーダル
 */

import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useStackStorage } from "@/hooks/use-stack-storage";
import { Goal, calculateDaysRemaining } from "@/types/stack";

export default function SetGoalModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { items, updateItem } = useStackStorage();

  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);

  const [daily, setDaily] = useState(item?.goal?.daily?.toString() || "");
  const [weekly, setWeekly] = useState(item?.goal?.weekly?.toString() || "");
  const [monthly, setMonthly] = useState(item?.goal?.monthly?.toString() || "");
  const [dailyDeadline, setDailyDeadline] = useState(item?.goal?.dailyDeadline || "");
  const [weeklyDeadline, setWeeklyDeadline] = useState(item?.goal?.weeklyDeadline || "");
  const [monthlyDeadline, setMonthlyDeadline] = useState(item?.goal?.monthlyDeadline || "");

  const daysRemainingDaily = dailyDeadline ? calculateDaysRemaining(dailyDeadline) : null;
  const daysRemainingWeekly = weeklyDeadline ? calculateDaysRemaining(weeklyDeadline) : null;
  const daysRemainingMonthly = monthlyDeadline ? calculateDaysRemaining(monthlyDeadline) : null;

  const handleSave = async () => {
    if (!id) return;

    const goal: Goal = {
      daily: daily ? parseInt(daily, 10) : undefined,
      weekly: weekly ? parseInt(weekly, 10) : undefined,
      monthly: monthly ? parseInt(monthly, 10) : undefined,
      dailyDeadline: dailyDeadline || undefined,
      weeklyDeadline: weeklyDeadline || undefined,
      monthlyDeadline: monthlyDeadline || undefined,
    };

    await updateItem(id, { goal });
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  if (!item) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText>項目が見つかりません</ThemedText>
      </ThemedView>
    );
  }

  const unit = item.type === "time" ? "秒" : "回";
  const timeHint = item.type === "time" ? "（例: 3600 = 1時間）" : "";

  const renderGoalSection = (
    title: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    deadline: string,
    onDeadlineChange: (text: string) => void,
    daysRemaining: number | null
  ) => (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
        />
        <ThemedText style={[styles.unit, { color: colors.textSecondary }]}>
          {unit}
        </ThemedText>
      </View>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: colors.border,
            marginTop: Spacing.s,
          },
        ]}
        placeholder="期限（YYYY-MM-DD）"
        placeholderTextColor={colors.textDisabled}
        value={deadline}
        onChangeText={onDeadlineChange}
      />
      {daysRemaining !== null && (
        <ThemedText
          style={[
            styles.daysRemaining,
            { color: daysRemaining === 0 ? colors.error : colors.textSecondary },
          ]}
        >
          残り {daysRemaining} 日
        </ThemedText>
      )}
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
        <Pressable onPress={handleCancel} style={styles.headerButton}>
          <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
        </Pressable>
        <ThemedText type="subtitle">目標設定</ThemedText>
        <Pressable onPress={handleSave} style={styles.headerButton}>
          <ThemedText
            style={{
              color: colors.tint,
              fontWeight: "600",
            }}
          >
            保存
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 項目情報 */}
        <View style={[styles.itemInfo, { backgroundColor: colors.card }]}>
          <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
            {item.type === "time" ? "時間を積み上げ" : "回数を積み上げ"}
          </ThemedText>
        </View>

        {/* 説明 */}
        <View style={styles.section}>
          <ThemedText style={{ color: colors.textSecondary, lineHeight: 22 }}>
            目標を設定すると、達成率が表示されます。目標は日次・週次・月次で設定できます。期限を設定すると残日数が表示されます。
            {timeHint}
          </ThemedText>
        </View>

        {/* 日次目標 */}
        {renderGoalSection(
          "日次目標",
          daily,
          setDaily,
          `例: ${item.type === "time" ? "3600" : "10"}`,
          dailyDeadline,
          setDailyDeadline,
          daysRemainingDaily
        )}

        {/* 週次目標 */}
        {renderGoalSection(
          "週次目標",
          weekly,
          setWeekly,
          `例: ${item.type === "time" ? "25200" : "70"}`,
          weeklyDeadline,
          setWeeklyDeadline,
          daysRemainingWeekly
        )}

        {/* 月次目標 */}
        {renderGoalSection(
          "月次目標",
          monthly,
          setMonthly,
          `例: ${item.type === "time" ? "108000" : "300"}`,
          monthlyDeadline,
          setMonthlyDeadline,
          daysRemainingMonthly
        )}

        {/* 時間の目安 */}
        {item.type === "time" && (
          <View style={[styles.hint, { backgroundColor: colors.tint + "10" }]}>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
              💡 時間の目安:{"\n"}
              1時間 = 3600秒{"\n"}
              7時間/週 = 25200秒{"\n"}
              30時間/月 = 108000秒
            </ThemedText>
          </View>
        )}
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerButton: {
    padding: Spacing.s,
    minWidth: 80,
  },
  content: {
    flex: 1,
    padding: Spacing.m,
  },
  itemInfo: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.l,
    alignItems: "center",
  },
  section: {
    marginBottom: Spacing.l,
  },
  sectionTitle: {
    marginBottom: Spacing.s,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.button,
    padding: Spacing.m,
    fontSize: 16,
  },
  unit: {
    fontSize: 16,
    minWidth: 40,
  },
  daysRemaining: {
    marginTop: Spacing.s,
    fontSize: 12,
    fontWeight: "500",
  },
  hint: {
    padding: Spacing.m,
    borderRadius: BorderRadius.button,
    marginTop: Spacing.s,
  },
});
