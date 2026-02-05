import { useEffect } from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useQuoteHistory } from "@/hooks/use-quote-history";
import { QUOTES } from "@/constants/quotes";

export default function QuotesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { history, loadHistory, resetHistory } = useQuoteHistory();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const historyIds = new Set(history.map((h) => h.no));
  const list = QUOTES.map((q) => ({
    ...q,
    collected: historyIds.has(q.no),
  }));
  const collectedCount = historyIds.size;
  const uncollectedBg = colorScheme === "dark" ? "#1F1F1F" : "#BDBDBD";
  const uncollectedBorder = colorScheme === "dark" ? "#2C2C2C" : "#9E9E9E";
  const uncollectedText = colorScheme === "dark" ? "#777" : "#555";

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20),
        },
      ]}
    >
      <View style={[styles.header, { marginTop: -8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </Pressable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">名言リスト</ThemedText>
          <ThemedText style={styles.headerMeta}>
            収集済み {collectedCount}/{QUOTES.length}
          </ThemedText>
        </View>
        <Pressable
          onPress={() =>
            Alert.alert(
              "名言をリセット",
              "収集済みの名言をすべてリセットします。よろしいですか？",
              [
                { text: "キャンセル", style: "cancel" },
                { text: "リセット", style: "destructive", onPress: resetHistory },
              ],
            )
          }
          style={styles.resetButton}
        >
          <ThemedText style={styles.resetText}>リセット</ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => `q-${item.no}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: item.collected ? colors.card : uncollectedBg,
                borderColor: item.collected ? "rgba(0,0,0,0.03)" : uncollectedBorder,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                NO.{item.no.toString().padStart(3, "0")}
              </ThemedText>
              {!item.collected && (
                <ThemedText style={{ color: uncollectedText, fontSize: 12 }}>
                  未収集
                </ThemedText>
              )}
            </View>
            {item.collected ? (
              <>
                <ThemedText style={styles.quoteText}>{item.text}</ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                  ・{item.author}
                </ThemedText>
              </>
            ) : (
              <ThemedText style={{ color: uncollectedText, fontSize: 12 }}>
                NO.{item.no.toString().padStart(3, "0")} 未収集
              </ThemedText>
            )}
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.m,
    gap: Spacing.s,
  },
  headerTitle: {
    flex: 1,
  },
  headerMeta: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  backButton: {
    padding: Spacing.s,
  },
  resetButton: {
    padding: Spacing.s,
  },
  resetText: {
    fontSize: 12,
    color: "#999",
  },
  listContent: {
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.xl,
  },
  card: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.m,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.s,
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.s,
  },
});
