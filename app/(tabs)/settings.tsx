import Constants from "expo-constants";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { APP_ANNOUNCEMENTS } from "@/constants/announcements";
import { CONTACT_FORM_URL, SNS_LINKS } from "@/constants/app-links";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useAnnouncements } from "@/hooks/use-announcements";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNotificationSettings } from "@/hooks/use-notification-settings";
import { useSound } from "@/hooks/use-sound";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { playToggle } = useSound();
  const { markAsSeen } = useAnnouncements();
  const {
    settings: notificationSettings,
    enableNotification,
    disableNotification,
    permissionStatus,
  } = useNotificationSettings();

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const notificationUnsupported = permissionStatus === "unsupported";

  const handleToggleNotification = async (value: boolean) => {
    playToggle();
    if (value) {
      const success = await enableNotification(notificationSettings.time);
      if (!success) {
        Alert.alert(
          "通知が許可されていません",
          "通知を受け取るには、端末の設定で通知を許可してください。",
        );
      }
      return;
    }

    await disableNotification();
  };

  const openExternalLink = async (url: string, label: string) => {
    if (!url) {
      Alert.alert(
        "リンク未設定",
        `${label} のリンクは未設定です。\nconstants/app-links.ts にURLを設定してください。`,
      );
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("エラー", "このリンクは開けませんでした。URLを確認してください。");
      return;
    }

    await Linking.openURL(url);
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
                    ? "Expo Goでは通知は利用できません"
                    : "オン/オフのみ設定できます（時刻は各タスクで設定）"}
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
            お知らせ
          </ThemedText>
          <View style={styles.sectionContent}>
            {APP_ANNOUNCEMENTS.map((announcement) => (
              <SettingItem
                key={announcement.id}
                icon="quote.bubble"
                iconColor={colors.tint}
                title={announcement.title}
                subtitle={`${announcement.date} / v${announcement.version}`}
                onPress={() => {
                  Alert.alert(announcement.title, announcement.message);
                  markAsSeen(announcement.id);
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: colors.textSecondary }]}
          >
            SNS・お問い合わせ
          </ThemedText>
          <View style={styles.sectionContent}>
            {SNS_LINKS.map((sns) => (
              <SettingItem
                key={sns.id}
                icon="square.and.arrow.up"
                iconColor="#2196F3"
                title={sns.label}
                subtitle={sns.url ? "リンクを開く" : "未設定"}
                onPress={() => openExternalLink(sns.url, sns.label)}
              />
            ))}
            <SettingItem
              icon="paperplane.fill"
              iconColor={colors.success}
              title="お問い合わせ"
              subtitle={CONTACT_FORM_URL ? "Googleフォームを開く" : "未設定"}
              onPress={() => openExternalLink(CONTACT_FORM_URL, "お問い合わせ")}
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
              subtitle={appVersion}
              showArrow={false}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText style={{ color: colors.textDisabled, fontSize: 12 }}>
            積み上げアプリ
          </ThemedText>
          <ThemedText style={{ color: colors.textDisabled, fontSize: 12 }}>
            毎日の積み上げを続けましょう
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
