import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCount, formatTime, StackItem } from "@/types/stack";
import { getLevelInfo } from "@/constants/levels";

interface StackItemCardProps {
  item: StackItem;
  todayValue: number;
  onPress?: () => void;
  onLongPress?: () => void;
  isActive?: boolean;
}

const StackItemCardComponent = ({
  item,
  todayValue,
  onPress,
  onLongPress,
  isActive = false,
}: StackItemCardProps) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const displayValue =
    item.type === "time" ? formatTime(item.totalValue) : formatCount(item.totalValue);

  const todayDisplay =
    item.type === "time" ? formatTime(todayValue) : formatCount(todayValue);

  // レベル情報を取得
  const levelInfo = getLevelInfo(item.type, item.totalValue);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isActive ? colors.card + "F0" : colors.card,
          borderColor: isActive ? colors.tint : "rgba(0,0,0,0.03)",
          shadowOpacity: isActive ? 0.18 : 0.08,
          shadowRadius: isActive ? 16 : 12,
          elevation: isActive ? 8 : 4,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed || isActive ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconInfo}>
          <View style={[styles.iconCircle, { backgroundColor: item.color + "15" }]}>
            <IconSymbol
              name={item.icon as any}
              size={22}
              color={item.color}
            />
          </View>
          <View>
            <ThemedText type="defaultSemiBold" style={styles.name}>
              {item.name}
            </ThemedText>
            <View style={[styles.rankBadge, { backgroundColor: levelInfo.current.color + '20' }]}>
              <ThemedText style={[styles.rankText, { color: levelInfo.current.color }]}>
                {levelInfo.current.title}
              </ThemedText>
            </View>
          </View>
        </View>
        <IconSymbol name="chevron.right" size={16} color={colors.textDisabled} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.mainStat}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
            今日
          </ThemedText>
          <ThemedText type="title" style={{ fontSize: 24, lineHeight: 30 }}>
            {todayDisplay}
          </ThemedText>
        </View>

        <View style={styles.subStat}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
            累計
          </ThemedText>
          <ThemedText type="defaultSemiBold" style={{ color: item.color }}>
            {displayValue}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
};

export const StackItemCard = React.memo(StackItemCardComponent);

const styles = StyleSheet.create({
  card: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.m,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.m,
  },
  iconInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
  },
  rankBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  rankText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  mainStat: {
    flex: 1,
  },
  subStat: {
    alignItems: "flex-end",
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
});
