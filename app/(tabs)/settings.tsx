import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useStackStorage } from "@/hooks/use-stack-storage";
import { useNotificationSettings } from "@/hooks/use-notification-settings";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { items, records, reload } = useStackStorage();
  const {
    settings: notificationSettings,
    enableNotification,
    disableNotification,
    permissionStatus,
  } = useNotificationSettings();
  const notificationUnsupported = permissionStatus === "unsupported";

  const handleToggleNotification = async (value: boolean) => {
    if (value) {
      const success = await enableNotification("20:00");
      if (!success) {
        Alert.alert(
          "通知が許可されていません",
          "通知を受け取るには、端末の設定で通知を許可してください。",
        );
      }
    } else {
      await disableNotification();
    }
  };

  const handleExportData = () => {
    Alert.alert(
      "データの概要",
      `${items.length}個の項目と${records.length}件の記録があります。\n\n現在はコピーのみ対応しています。`,
      [{ text: "OK" }],
    );
  };

  const handleClearData = () => {
    Alert.alert(
      "データを削除",
      "すべての項目と記録を削除します。\nこの操作は元に戻せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(["stack_items", "stack_records"]);
              await reload();
              Alert.alert("完了", "データを削除しました。");
            } catch (error) {
              Alert.alert("エラー", "データの削除に失敗しました。");
            }
          },
        },
      ],
    );
  };

  const SettingItem = ({
    icon,
    iconColor,
    title,
    subtitle,
    onPress,
    showArrow = true,
    danger = false,
  }: {
    icon: string;
    iconColor: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    danger?: boolean;
  }) => (
    <Pressable
      style={[styles.settingItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconColor + "20" }]}>
        <IconSymbol name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText
          type="defaultSemiBold"
          style={danger ? { color: colors.error } : undefined}
        >
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {showArrow && (
        <IconSymbol name="chevron.right" size={16} color={colors.textDisabled} />
      )}
    </Pressable>
  );

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
        <ThemedText type="title">設定</ThemedText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: colors.textSecondary }]}
          >
            通知
          </ThemedText>
          <View style={styles.sectionContent}>
            <View
              style={[
                styles.settingItem,
                { backgroundColor: colors.card, justifyContent: "space-between" },
              ]}
            >
              <View style={styles.settingContent}>
                <ThemedText type="defaultSemiBold">毎日のリマインダー</ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {notificationUnsupported
                    ? "Expo Goでは通知が使えません"
                    : `${notificationSettings.time}に通知します`}
                </ThemedText>
              </View>
              <Switch
                value={notificationSettings.enabled}
                onValueChange={handleToggleNotification}
                disabled={notificationUnsupported}
                trackColor={{ false: colors.border, true: colors.tint + "80" }}
                thumbColor={notificationSettings.enabled ? colors.tint : "#f4f3f4"}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: colors.textSecondary }]}
          >
            データ
          </ThemedText>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="chart.bar.fill"
              iconColor="#2196F3"
              title="データをコピー"
              subtitle={`${items.length}個の項目、${records.length}件の記録`}
              onPress={handleExportData}
            />
            <SettingItem
              icon="trash.fill"
              iconColor={colors.error}
              title="データを削除"
              subtitle="すべての項目と記録を削除します"
              onPress={handleClearData}
              danger
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: colors.textSecondary }]}
          >
            アプリ情報
          </ThemedText>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="checkmark.circle.fill"
              iconColor={colors.success}
              title="バージョン"
              subtitle="1.0.0"
              showArrow={false}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText style={{ color: colors.textDisabled, fontSize: 12 }}>
            積み上げアプリ
          </ThemedText>
          <ThemedText style={{ color: colors.textDisabled, fontSize: 12 }}>
            今日の積み上げを続けましょう
          </ThemedText>
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
  header: {
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.m,
  },
  section: {
    marginBottom: Spacing.l,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    paddingHorizontal: Spacing.m,
    marginBottom: Spacing.s,
  },
  sectionContent: {
    paddingHorizontal: Spacing.m,
    gap: Spacing.xs,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.m,
  },
  settingContent: {
    flex: 1,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
});