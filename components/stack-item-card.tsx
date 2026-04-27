import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCount, formatTime, getCountUnitLabel, StackItem } from "@/types/stack";

interface StackItemCardProps {
  item: StackItem;
  todayValue: number;
  onPress?: () => void;
  onLongPress?: () => void;
  isActive?: boolean;
  isRunning?: boolean;
}

const StackItemCardComponent = ({
  item,
  todayValue,
  onPress,
  onLongPress,
  isActive = false,
  isRunning = false,
}: StackItemCardProps) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const baseCardBg = colorScheme === "dark" ? "#1B1B1B" : "#FFFFFF";
  const baseBorder = colorScheme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)";
  const pulse = useRef(new Animated.Value(1)).current;
  const countUnitLabel = getCountUnitLabel(item);

  useEffect(() => {
    if (!isRunning) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.02,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isRunning, pulse]);

  const displayValue =
    item.type === "time" ? formatTime(item.totalValue) : formatCount(item.totalValue, countUnitLabel);

  const todayDisplay =
    item.type === "time" ? formatTime(todayValue) : formatCount(todayValue, countUnitLabel);

  const activeReminderTimes = (item.reminderSlots ?? [])
    .slice(0, Math.min(5, Math.max(1, item.reminderSlotCount ?? 1)))
    .filter((slot) => slot.enabled)
    .map((slot) => slot.time);

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} disabled={!onPress}>
      {({ pressed, hovered }) => (
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isRunning ? item.color + "1A" : baseCardBg,
              borderColor: isRunning
                ? item.color
                : hovered
                ? colors.tint + "55"
                : baseBorder,
              borderLeftColor: item.color,
              borderLeftWidth: 4,
              shadowOpacity: isActive || isRunning || hovered ? 0.22 : 0.14,
              shadowRadius: isActive || isRunning || hovered ? 18 : 12,
              elevation: isActive || isRunning || hovered ? 9 : 6,
              opacity: pressed ? 0.95 : 1,
              transform: [
                { scale: pressed || isActive ? 0.98 : hovered ? 1.01 : 1 },
                { scale: pulse },
              ],
            },
          ]}
        >
          {isRunning && (
            <View
              pointerEvents="none"
              style={[styles.runningOutline, { borderColor: item.color }]}
            />
          )}
          <View style={styles.topRow}>
            <ThemedText type="title" style={{ fontSize: 32, lineHeight: 38, color: colors.text }}>
              {todayDisplay}
            </ThemedText>
            <View style={styles.totalInfo}>
              <ThemedText style={[styles.totalLabel, { color: colors.textSecondary }]}>累計</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
                {displayValue}
              </ThemedText>
            </View>
          </View>

          <View style={{ height: Spacing.s }} />

          <View style={styles.bottomRow}>
            <View style={styles.iconInfo}>
              <View style={[styles.iconCircle, { backgroundColor: item.color + "15" }]}>
                <IconSymbol name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={styles.nameBlock}>
                <View style={styles.nameRow}>
                  <ThemedText type="defaultSemiBold" style={styles.name}>
                    {item.name}
                  </ThemedText>
                  {activeReminderTimes.length > 0 ? (
                    <ThemedText style={[styles.reminderTimes, { color: colors.textSecondary }]}>
                      {activeReminderTimes.join(" / ")}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            </View>

            {isRunning ? (
              <View style={[styles.runningBadge, { backgroundColor: item.color + "20" }]}>
                <Animated.View
                  style={[
                    styles.runningDot,
                    {
                      backgroundColor: item.color,
                      transform: [{ scale: pulse }],
                    },
                  ]}
                />
                <ThemedText style={[styles.runningText, { color: item.color }]}>作業中</ThemedText>
              </View>
            ) : null}
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
};

export const StackItemCard = React.memo(StackItemCardComponent);

const styles = StyleSheet.create({
  card: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.m,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
    position: "relative",
    overflow: "hidden",
  },
  runningOutline: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 2,
    borderRadius: BorderRadius.card,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.s,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  iconInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
    flex: 1,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.s,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 14,
    flexShrink: 1,
  },
  runningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  runningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  runningText: {
    fontSize: 10,
    fontWeight: "600",
  },
  totalLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  totalInfo: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: Spacing.m,
  },
  reminderTimes: {
    fontSize: 11,
    flexShrink: 1,
    textAlign: "right",
  },
});
