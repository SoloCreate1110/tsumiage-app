/**
 * 積み上げ項目カードコンポーネント
 */

import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCount, formatTime, StackItem } from "@/types/stack";

interface StackItemCardProps {
  item: StackItem;
  todayValue: number;
  onPress: () => void;
}

export function StackItemCard({ item, todayValue, onPress }: StackItemCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const displayValue =
    item.type === "time" ? formatTime(item.totalValue) : formatCount(item.totalValue);

  const todayDisplay =
    item.type === "time" ? formatTime(todayValue) : formatCount(todayValue);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderLeftColor: item.color,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: item.color + "20" }]}>
          <IconSymbol
            name={item.icon as any}
            size={24}
            color={item.color}
          />
        </View>
      </View>

      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" style={styles.name}>
          {item.name}
        </ThemedText>
        <ThemedText style={[styles.todayLabel, { color: colors.textSecondary }]}>
          今日: {todayDisplay}
        </ThemedText>
      </View>

      <View style={styles.valueContainer}>
        <ThemedText type="title" style={[styles.value, { color: item.color }]}>
          {displayValue}
        </ThemedText>
        <ThemedText style={[styles.totalLabel, { color: colors.textSecondary }]}>
          累計
        </ThemedText>
      </View>

      <IconSymbol name="chevron.right" size={20} color={colors.textDisabled} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    borderLeftWidth: 4,
    marginBottom: Spacing.s,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginRight: Spacing.m,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    marginBottom: 4,
  },
  todayLabel: {
    fontSize: 12,
  },
  valueContainer: {
    alignItems: "flex-end",
    marginRight: Spacing.s,
  },
  value: {
    fontSize: 20,
    lineHeight: 24,
  },
  totalLabel: {
    fontSize: 10,
  },
});
