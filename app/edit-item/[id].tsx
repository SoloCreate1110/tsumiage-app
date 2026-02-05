import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState, useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useStackStorage } from "@/hooks/use-stack-storage";
import { COLOR_OPTIONS, ICON_OPTIONS } from "@/types/stack";

export default function EditItemModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { items, updateItem } = useStackStorage();

  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);

  const [name, setName] = useState(item?.name ?? "");
  const [selectedIcon, setSelectedIcon] = useState(item?.icon ?? ICON_OPTIONS[0].name);
  const [selectedColor, setSelectedColor] = useState<string>(item?.color ?? COLOR_OPTIONS[0]);

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setSelectedIcon(item.icon);
    setSelectedColor(item.color);
  }, [item]);

  const handleSave = async () => {
    if (!id || !item) return;
    if (!name.trim()) return;
    await updateItem(id, {
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
    });
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
        <ThemedText type="subtitle">項目を編集</ThemedText>
        <Pressable
          onPress={handleSave}
          style={styles.headerButton}
          disabled={!name.trim()}
        >
          <ThemedText
            style={{
              color: name.trim() ? colors.tint : colors.textDisabled,
              fontWeight: "600",
            }}
          >
            保存
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            項目名
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
            placeholder="例: 読書、筋トレ、学習..."
            placeholderTextColor={colors.textDisabled}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            タイプ
          </ThemedText>
          <View style={[styles.typeInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol
              name={item.type === "time" ? "clock.fill" : "number"}
              size={20}
              color={colors.textSecondary}
            />
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
              {item.type === "time" ? "時間" : "回数"}（変更不可）
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
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

        <View style={styles.section}>
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

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            プレビュー
          </ThemedText>
          <View
            style={[
              styles.preview,
              {
                backgroundColor: colors.card,
                borderLeftColor: selectedColor,
              },
            ]}
          >
            <View
              style={[
                styles.previewIcon,
                { backgroundColor: selectedColor + "20" },
              ]}
            >
              <IconSymbol
                name={selectedIcon as any}
                size={24}
                color={selectedColor}
              />
            </View>
            <View style={styles.previewContent}>
              <ThemedText type="defaultSemiBold">
                {name || "項目名"}
              </ThemedText>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                {item.type === "time" ? "時間を積み上げ" : "回数を積み上げ"}
              </ThemedText>
            </View>
          </View>
        </View>
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
  section: {
    marginBottom: Spacing.l,
  },
  sectionTitle: {
    marginBottom: Spacing.s,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.button,
    padding: Spacing.m,
    fontSize: 16,
  },
  typeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
    padding: Spacing.m,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
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
  preview: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    borderLeftWidth: 4,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.m,
  },
  previewContent: {
    flex: 1,
  },
});
