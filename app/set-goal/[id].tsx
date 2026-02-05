import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState, useEffect } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TimeInput } from "@/components/ui/time-input";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useStackStorage } from "@/hooks/use-stack-storage";
import { COLOR_OPTIONS, ICON_OPTIONS } from "@/types/stack";
import { Goal, calculateDaysRemaining, formatCount, formatTime, getTodayString, toDateString } from "@/types/stack";

export default function SetGoalModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { items, updateItem, deleteItem } = useStackStorage();

  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);

  // State
  const [name, setName] = useState(item?.name ?? "");
  const [selectedIcon, setSelectedIcon] = useState(item?.icon ?? ICON_OPTIONS[0].name);
  const [selectedColor, setSelectedColor] = useState<string>(item?.color ?? COLOR_OPTIONS[0]);
  const [target, setTarget] = useState(item?.goal?.target?.toString() || "");
  const [deadline, setDeadline] = useState(item?.goal?.deadline || "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyPace, setDailyPace] = useState<number | null>(null);

  // Sync saved goal when reopening
  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setSelectedIcon(item.icon);
    setSelectedColor(item.color);
    setTarget(item.goal?.target?.toString() || "");
    setDeadline(item.goal?.deadline || "");
  }, [item]);

  // Calculate suggested daily pace
  useEffect(() => {
    if (target && deadline && item) {
      const targetVal = parseInt(target, 10);
      const days = calculateDaysRemaining(deadline);
      const current = item.totalValue || 0;
      const remaining = Math.max(0, targetVal - current);

      if (days > 0) {
        setDailyPace(Math.ceil(remaining / days));
      } else {
        setDailyPace(remaining); // If today is deadline, do it all
      }
    } else {
      setDailyPace(null);
    }
  }, [target, deadline, item]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }

    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      const dateStr = toDateString(selectedDate);
      setDeadline(dateStr);
    }
  };

  const handleSave = async () => {
    if (!id || !item) return;

    const updates: Partial<typeof item> = {
      name: name.trim() ? name.trim() : item.name,
      icon: selectedIcon,
      color: selectedColor,
    };

    if (target && deadline) {
      const goal: Goal = {
        target: parseInt(target, 10),
        deadline: deadline,
        startTotal: item.totalValue,
        startDate: getTodayString(),
      };
      updates.goal = goal;
    }

    await updateItem(id, updates);
    router.back();
  };

  const handleDelete = () => {
    if (!id || !item) return;
    Alert.alert(
      "項目を削除",
      `${item.name}を削除しますか？\nこの操作は元に戻せません。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => {
            router.replace("/(tabs)");
            setTimeout(() => {
              deleteItem(id).catch((error) => {
                console.error("Failed to delete item:", error);
              });
            }, 0);
          },
        },
      ]
    );
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
  const daysRemaining = deadline ? calculateDaysRemaining(deadline) : null;
  const currentTotal = item.totalValue || 0;

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
      <View style={styles.header}>
        <Pressable onPress={handleCancel} style={styles.headerButton}>
          <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
        </Pressable>
        <ThemedText type="subtitle">目標設定</ThemedText>
        <Pressable onPress={handleSave} style={styles.headerButton}>
          <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>
            保存</ThemedText>
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Total Target Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            目標値を設定</ThemedText>
          <ThemedText style={{ marginBottom: Spacing.s, color: colors.textSecondary, fontSize: 14 }}>
            いつまでにどれくらい達成したいかを入力</ThemedText>

          {item.type === "time" ? (
            <View style={{ marginBottom: Spacing.s }}>
              <TimeInput
                value={target ? parseInt(target, 10) : 0}
                onChange={(seconds) => setTarget(seconds.toString())}
              />
            </View>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="例: 1000"
                placeholderTextColor={colors.textDisabled}
                value={target}
                onChangeText={setTarget}
                keyboardType="numeric"
              />
              <ThemedText style={{ color: colors.textSecondary, marginLeft: Spacing.s }}>{unit}</ThemedText>
            </View>
          )}
        </View>

        {/* Deadline Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            期限を設定</ThemedText>

          <View style={{ marginTop: Spacing.s }}>
            {Platform.OS === 'web' ? (
              <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={{ flex: 1, color: colors.text, fontSize: 16 }}
                  placeholder="期限 (YYYY-MM-DD)"
                  placeholderTextColor={colors.textDisabled}
                  value={deadline}
                  onChangeText={setDeadline}
                  // @ts-ignore
                  type="date"
                />
                <IconSymbol name="calendar" size={20} color={colors.textSecondary} />
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <ThemedText style={{ color: deadline ? colors.text : colors.textDisabled }}>
                    {deadline || "日付を選択"}
                  </ThemedText>
                  <IconSymbol name="calendar" size={20} color={colors.textSecondary} />
                </Pressable>

                {showDatePicker && (
                  <DateTimePicker
                    value={deadline ? new Date(deadline) : new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}
          </View>
        </View>

        {/* Simulation / Feedback Section */}
        {daysRemaining !== null && dailyPace !== null && (
          <View style={[styles.feedbackContainer, { backgroundColor: colors.tint + "10", borderColor: colors.tint }]}>
            <View style={{ flexDirection: 'row', gap: Spacing.s, marginBottom: Spacing.s }}>
              <IconSymbol name="flame.fill" size={24} color={colors.tint} />
              <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                プラン
              </ThemedText>
            </View>

            <ThemedText style={{ color: colors.text }}>
              期限まであと <ThemedText type="defaultSemiBold">{daysRemaining}日</ThemedText> 日です。            </ThemedText>

            <View style={{ marginVertical: Spacing.s, padding: Spacing.m, backgroundColor: colors.card, borderRadius: BorderRadius.card }}>
              <ThemedText style={{ textAlign: "center", color: colors.textSecondary, fontSize: 12 }}>
                1日あたりの目安</ThemedText>
              <ThemedText style={{ textAlign: "center", fontSize: 24, fontWeight: "bold", color: colors.text }}>
                {item.type === "time" ? formatTime(dailyPace) : formatCount(dailyPace)}
              </ThemedText>
            </View>

            <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
              このペースで続けると達成できます。</ThemedText>
          </View>
        )}

        <View style={[styles.itemInfo, { backgroundColor: colors.card }]}>
          <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
            現在の累計: {item.type === "time" ? formatTime(currentTotal) : formatCount(currentTotal)}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            項目設定
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="項目名"
            placeholderTextColor={colors.textDisabled}
            value={name}
            onChangeText={setName}
          />

          <View style={{ marginTop: Spacing.m }}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              アイコン
            </ThemedText>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => (
                <Pressable
                  key={icon.name}
                  style={[
                    styles.iconOption,
                    {
                      backgroundColor:
                        selectedIcon === icon.name
                          ? selectedColor + "20"
                          : colors.card,
                      borderColor:
                        selectedIcon === icon.name
                          ? selectedColor
                          : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedIcon(icon.name)}
                >
                  <IconSymbol
                    name={icon.name as any}
                    size={28}
                    color={selectedIcon === icon.name ? selectedColor : colors.text}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ marginTop: Spacing.m }}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              カラー
            </ThemedText>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: color,
                      borderWidth: selectedColor === color ? 3 : 0,
                      borderColor: colors.text,
                    },
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.error }]}>
            項目を削除
          </ThemedText>
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: colors.error }]}
          >
            <ThemedText style={{ color: colors.error, fontWeight: "600" }}>
              この項目を削除
            </ThemedText>
          </Pressable>
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
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.button,
    padding: Spacing.m,
    fontSize: 16,
    minHeight: 56,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.s,
  },
  iconOption: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.s,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackContainer: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    marginTop: Spacing.m,
  },
  deleteButton: {
    paddingVertical: Spacing.m,
    alignItems: "center",
    borderRadius: BorderRadius.button,
    borderWidth: 1,
  },
});




