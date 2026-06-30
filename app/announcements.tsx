import { router } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { APP_ANNOUNCEMENTS } from "@/constants/announcements";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useAnnouncements } from "@/hooks/use-announcements";
import { useColorScheme } from "@/hooks/use-color-scheme";

const sortedAnnouncements = [...APP_ANNOUNCEMENTS].sort((a, b) => {
  const dateCompare = b.date.localeCompare(a.date);
  if (dateCompare !== 0) return dateCompare;
  return b.version.localeCompare(a.version);
});

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { markAsSeen } = useAnnouncements();

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20),
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </Pressable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">お知らせ</ThemedText>
          <ThemedText style={[styles.headerMeta, { color: colors.textSecondary }]}>
            これまでのお知らせ
          </ThemedText>
        </View>
      </View>

      <FlatList
        data={sortedAnnouncements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              Alert.alert(item.title, item.message);
              markAsSeen(item.id);
            }}
          >
            <View style={styles.cardHeader}>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                {item.title}
              </ThemedText>
              <ThemedText style={[styles.version, { color: colors.textSecondary }]}>
                v{item.version}
              </ThemedText>
            </View>
            <ThemedText style={[styles.date, { color: colors.textSecondary }]}>
              {item.date}
            </ThemedText>
            {item.changes?.length ? (
              <View style={styles.changeList}>
                {item.changes.map((change) => (
                  <View key={change} style={styles.changeRow}>
                    <ThemedText style={[styles.bullet, { color: colors.tint }]}>・</ThemedText>
                    <ThemedText style={styles.changeText}>{change}</ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText style={styles.message}>{item.message}</ThemedText>
            )}
            {item.comment ? (
              <View style={[styles.commentBox, { backgroundColor: colors.background }]}>
                <ThemedText style={[styles.commentText, { color: colors.textSecondary }]}>
                  {item.comment}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText style={{ color: colors.textSecondary }}>
              お知らせはまだありません
            </ThemedText>
          </View>
        }
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
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.m,
    gap: Spacing.s,
  },
  backButton: {
    padding: Spacing.s,
  },
  headerTitle: {
    flex: 1,
  },
  headerMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.xl,
  },
  card: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    marginBottom: Spacing.m,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.s,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
  },
  version: {
    fontSize: 12,
    fontWeight: "600",
  },
  date: {
    fontSize: 12,
    marginBottom: Spacing.s,
  },
  message: {
    lineHeight: 22,
  },
  changeList: {
    gap: 6,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bullet: {
    fontSize: 16,
    lineHeight: 22,
    marginRight: 4,
  },
  changeText: {
    flex: 1,
    lineHeight: 22,
  },
  commentBox: {
    marginTop: Spacing.m,
    padding: Spacing.s,
    borderRadius: BorderRadius.button,
  },
  commentText: {
    lineHeight: 20,
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
  },
});
