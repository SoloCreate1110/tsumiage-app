/**
 * ホーム画面 - 積み上げ項目一覧
 */

import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StackItemCard } from "@/components/stack-item-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useStackStorage } from "@/hooks/use-stack-storage";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { items, loading, getTodayValue } = useStackStorage();

  const handleAddItem = () => {
    router.push("/add-item");
  };

  const handleItemPress = (id: string) => {
    router.push(`/item/${id}`);
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
      {/* ヘッダー */}
      <View style={styles.header}>
        <ThemedText type="title">積み上げ</ThemedText>
        <ThemedText style={{ color: colors.textSecondary }}>
          {items.length}個の項目
        </ThemedText>
      </View>

      {/* 項目一覧 */}
      {items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StackItemCard
              item={item}
              todayValue={getTodayValue(item.id)}
              onPress={() => handleItemPress(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.tint + "20" },
            ]}
          >
            <IconSymbol name="chart.bar.fill" size={48} color={colors.tint} />
          </View>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            まだ項目がありません
          </ThemedText>
          <ThemedText
            style={[styles.emptyText, { color: colors.textSecondary }]}
          >
            下のボタンから積み上げたい項目を{"\n"}追加してみましょう
          </ThemedText>
        </View>
      )}

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={handleAddItem}
      >
        <IconSymbol name="plus" size={28} color="#fff" />
      </Pressable>
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
  },
  listContent: {
    paddingHorizontal: Spacing.m,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.l,
  },
  emptyTitle: {
    marginBottom: Spacing.s,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 22,
  },
  fab: {
    position: "absolute",
    right: Spacing.m,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
