import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

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
    item.type === "time" ? formatTime(item.totalValue) : formatCount(item.totalValue);

  const todayDisplay =
    item.type === "time" ? formatTime(todayValue) : formatCount(todayValue);

  const levelInfo = getLevelInfo(item.type, item.totalValue);

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
        <View>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>今日の積み上げ</ThemedText>
          <ThemedText type="title" style={{ fontSize: 32, lineHeight: 38, color: colors.text }}>
            {todayDisplay}
          </ThemedText>
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
        ) : (
          <View style={[styles.startBadge, { borderColor: colors.border }]}> 
            <IconSymbol name="play.fill" size={12} color={colors.textSecondary} />
            <ThemedText style={{ fontSize: 10, color: colors.textSecondary, marginLeft: 4 }}>
              開始
            </ThemedText>
          </View>
        )}
      </View>

      <View style={{ height: Spacing.s }} />

      <View style={styles.bottomRow}>
        <View style={styles.iconInfo}>
          <View style={[styles.iconCircle, { backgroundColor: item.color + "15" }]}>
            <IconSymbol name={item.icon as any} size={18} color={item.color} />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.name}>
            {item.name}
          </ThemedText>
          <View style={[styles.rankBadge, { backgroundColor: levelInfo.current.color + "20" }]}> 
            <ThemedText style={[styles.rankText, { color: levelInfo.current.color }]}>
              {levelInfo.current.title}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
          累計 {displayValue}
        </ThemedText>
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
  },
  rankBadge: {
    alignSelf: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rankText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  runningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  startBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
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
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
});
