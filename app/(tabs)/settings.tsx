import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { APP_ANNOUNCEMENTS } from "@/constants/announcements";
import { CONTACT_FORM_URL, SNS_LINKS } from "@/constants/app-links";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useActivePomodoroState } from "@/hooks/use-active-pomodoro-state";
import { useAnnouncements } from "@/hooks/use-announcements";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFounderTitle } from "@/hooks/use-founder-title";
import { useNotificationSettings } from "@/hooks/use-notification-settings";
import {
  MAX_POMODORO_MINUTES,
  MIN_POMODORO_MINUTES,
  clampPomodoroMinutes,
  usePomodoroSettings,
} from "@/hooks/use-pomodoro-settings";
import {
  DEFAULT_SOUND_VOLUME,
  SOUND_VOLUME_STEP,
  clampSoundVolume,
  loadSoundVolume,
  saveSoundVolume,
  useSound,
} from "@/hooks/use-sound";
import { useStackStorage } from "@/hooks/use-stack-storage";
import { notificationsAreUnsupported, syncAllItemReminders } from "@/lib/item-reminders";

type PomodoroTimeRowProps = {
  title: string;
  minutes: number;
  disabled: boolean;
  colors: typeof Colors.light;
  onChange: (nextValue: number) => void;
};

function PomodoroTimeRow({
  title,
  minutes,
  disabled,
  colors,
  onChange,
}: PomodoroTimeRowProps) {
  const [draftText, setDraftText] = useState(String(minutes));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftText(String(minutes));
    }
  }, [isEditing, minutes]);

  const commitDraft = () => {
    const nextValue = Number(draftText);
    setIsEditing(false);

    if (
      !draftText ||
      !Number.isFinite(nextValue) ||
      nextValue < MIN_POMODORO_MINUTES ||
      nextValue > MAX_POMODORO_MINUTES
    ) {
      setDraftText(String(minutes));
      return;
    }

    const normalized = clampPomodoroMinutes(nextValue);
    setDraftText(String(normalized));
    if (normalized !== minutes) {
      onChange(normalized);
    }
  };

  const startEditing = () => {
    if (disabled || isEditing) return;
    setIsEditing(true);
    setDraftText("");
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraftText(String(minutes));
  };

  const appendDigit = (digit: string) => {
    setDraftText((current) => {
      const next = `${current}${digit}`.replace(/^0+(?=\d)/, "");
      return next.slice(0, 2);
    });
  };

  const deleteDigit = () => {
    setDraftText((current) => current.slice(0, -1));
  };

  const keypadItems = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "消す", "0", "⌫"];

  const renderKeypadItem = (item: string) => {
    const onPress = () => {
      if (item === "消す") {
        setDraftText("");
        return;
      }
      if (item === "⌫") {
        deleteDigit();
        return;
      }
      appendDigit(item);
    };

    return (
      <Pressable
        key={item}
        onPress={onPress}
        style={[styles.keypadButton, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <ThemedText type="defaultSemiBold">{item}</ThemedText>
      </Pressable>
    );
  };

  return (
    <>
      <View style={[styles.pomodoroTimeRow, disabled ? styles.disabledControl : null]}>
        <View style={styles.pomodoroTimeLabel}>
          <ThemedText type="defaultSemiBold">{title}</ThemedText>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
            1分から60分
          </ThemedText>
        </View>
        <View style={styles.minuteStepper}>
          <Pressable
            onPress={() => onChange(minutes - 1)}
            style={[
              styles.minuteButton,
              {
                borderColor: colors.border,
                opacity: disabled || minutes <= MIN_POMODORO_MINUTES ? 0.4 : 1,
              },
            ]}
            disabled={disabled || minutes <= MIN_POMODORO_MINUTES}
          >
            <ThemedText type="defaultSemiBold">-</ThemedText>
          </Pressable>
          <View style={[styles.minuteValue, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Pressable
              onPress={startEditing}
              disabled={disabled}
              style={styles.minuteDisplayButton}
              accessibilityRole="button"
              accessibilityLabel={`${title}を入力`}
            >
              <ThemedText type="defaultSemiBold">{minutes}</ThemedText>
            </Pressable>
          </View>
          <Pressable
            onPress={() => onChange(minutes + 1)}
            style={[
              styles.minuteButton,
              {
                borderColor: colors.border,
                opacity: disabled || minutes >= MAX_POMODORO_MINUTES ? 0.4 : 1,
              },
            ]}
            disabled={disabled || minutes >= MAX_POMODORO_MINUTES}
          >
            <ThemedText type="defaultSemiBold">+</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={[styles.minuteUnit, { color: colors.textSecondary }]}>
            分
          </ThemedText>
        </View>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={isEditing}
        onRequestClose={cancelEditing}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelEditing}>
          <Pressable
            style={[styles.keypadModal, { backgroundColor: colors.background }]}
            onPress={(event) => event.stopPropagation()}
          >
            <ThemedText type="defaultSemiBold" style={styles.keypadTitle}>
              {title}
            </ThemedText>
            <View style={[styles.keypadValue, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <ThemedText type="title">{draftText || ""}</ThemedText>
              <ThemedText style={{ color: colors.textSecondary }}>分</ThemedText>
            </View>
            <View style={styles.keypadGrid}>
              {keypadItems.map(renderKeypadItem)}
            </View>
            <View style={styles.keypadActions}>
              <Pressable
                onPress={cancelEditing}
                style={[styles.keypadActionButton, { borderColor: colors.border }]}
              >
                <ThemedText style={{ color: colors.textSecondary }}>キャンセル</ThemedText>
              </Pressable>
              <Pressable
                onPress={commitDraft}
                style={[styles.keypadActionButton, { backgroundColor: colors.tint, borderColor: colors.tint }]}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>決定</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { markAsSeen } = useAnnouncements();
  const { isSaikoyama } = useFounderTitle();
  const { items } = useStackStorage();
  const { hasActivePomodoro } = useActivePomodoroState();
  const { playClick } = useSound();
  const { settings: notificationSettings, enableNotification, disableNotification, permissionStatus } =
    useNotificationSettings();
  const { settings: pomodoroSettings, setWorkMinutes, setBreakMinutes } = usePomodoroSettings();
  const [soundVolume, setSoundVolume] = useState(DEFAULT_SOUND_VOLUME);
  const [volumeTrackWidth, setVolumeTrackWidth] = useState(0);
  const [volumeTrackX, setVolumeTrackX] = useState(0);
  const [isAdjustingVolume, setIsAdjustingVolume] = useState(false);
  const volumeTrackRef = useRef<View | null>(null);
  const pendingSoundVolumeRef = useRef(DEFAULT_SOUND_VOLUME);
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const notificationUnsupported = permissionStatus === "unsupported" || notificationsAreUnsupported();

  const latestAnnouncement = useMemo(() => {
    return [...APP_ANNOUNCEMENTS].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.version.localeCompare(a.version);
    })[0] ?? null;
  }, []);

  useEffect(() => {
    void loadSoundVolume().then((volume) => {
      pendingSoundVolumeRef.current = volume;
      setSoundVolume(volume);
    });
  }, []);

  useEffect(() => {
    pendingSoundVolumeRef.current = soundVolume;
  }, [soundVolume]);

  const handleChangeSoundVolume = async (nextValue: number) => {
    const nextVolume = await saveSoundVolume(clampSoundVolume(nextValue));
    setSoundVolume(nextVolume);
    void playClick();
  };

  const previewSoundVolume = (nextValue: number) => {
    const nextVolume = clampSoundVolume(Math.round(nextValue * 20) / 20);
    if (Math.abs(pendingSoundVolumeRef.current - nextVolume) < 0.001) return;
    pendingSoundVolumeRef.current = nextVolume;
    setSoundVolume(nextVolume);
  };

  const previewSoundVolumeFromPageX = (pageX: number) => {
    if (volumeTrackWidth <= 0) return;
    previewSoundVolume((pageX - volumeTrackX) / volumeTrackWidth);
  };

  const measureVolumeTrack = () => {
    volumeTrackRef.current?.measureInWindow((x, _y, width) => {
      setVolumeTrackX(x);
      setVolumeTrackWidth(width);
    });
  };

  const commitPreviewSoundVolume = async () => {
    setIsAdjustingVolume(false);
    const nextVolume = await saveSoundVolume(pendingSoundVolumeRef.current);
    setSoundVolume(nextVolume);
    void playClick();
  };

  const handleChangePomodoroMinutes = async (
    key: "work" | "break",
    nextValue: number
  ) => {
    if (hasActivePomodoro) return;

    if (key === "work") {
      await setWorkMinutes(nextValue);
    } else {
      await setBreakMinutes(nextValue);
    }
    void playClick();
  };

  const handleToggleGlobalNotification = async (value: boolean) => {
    if (value) {
      const success = await enableNotification();
      if (!success) {
        Alert.alert(
          "通知が許可されていません",
          "通知を受け取るには、端末の設定で通知を許可してください。"
        );
        return;
      }
      await syncAllItemReminders(items);
      return;
    }

    await disableNotification();
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  const openExternalLink = async (url: string, label: string) => {
    if (!url) {
      Alert.alert("リンク未設定", `${label} のリンクが設定されていません。`);
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("エラー", "このリンクを開けませんでした。");
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
  }: {
    icon: string;
    iconColor: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
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
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        {subtitle ? (
          <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {showArrow ? (
        <IconSymbol name="chevron.right" size={16} color={colors.textDisabled} />
      ) : null}
    </Pressable>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      <View style={styles.header}>
        <ThemedText type="title">設定</ThemedText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isAdjustingVolume}
      >
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
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
                <ThemedText type="defaultSemiBold">通知のオン / オフ</ThemedText>
              </View>
              <Switch
                value={notificationSettings.enabled}
                onValueChange={(value) => void handleToggleGlobalNotification(value)}
                disabled={notificationUnsupported}
                trackColor={{ false: colors.border, true: colors.tint + "80" }}
                thumbColor={notificationSettings.enabled ? colors.tint : "#f4f3f4"}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            サウンド
          </ThemedText>
          <View style={styles.sectionContent}>
            <View style={[styles.soundItem, { backgroundColor: colors.card }]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.tint + "20" }]}>
                <IconSymbol name="speaker.wave.2.fill" size={20} color={colors.tint} />
              </View>
              <View style={styles.soundContent}>
                <View style={styles.soundHeader}>
                  <ThemedText type="defaultSemiBold">効果音の音量</ThemedText>
                  <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {Math.round(soundVolume * 100)}%
                  </ThemedText>
                </View>
                <View style={styles.volumeControls}>
                  <Pressable
                    onPress={() => void handleChangeSoundVolume(soundVolume - SOUND_VOLUME_STEP)}
                    style={[
                      styles.volumeButton,
                      { borderColor: colors.border, opacity: soundVolume <= 0 ? 0.4 : 1 },
                    ]}
                    disabled={soundVolume <= 0}
                  >
                    <ThemedText type="defaultSemiBold">-</ThemedText>
                  </Pressable>
                  <View
                    ref={volumeTrackRef}
                    style={styles.volumeTrack}
                    onLayout={measureVolumeTrack}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={(event) => {
                      setIsAdjustingVolume(true);
                      measureVolumeTrack();
                      previewSoundVolumeFromPageX(event.nativeEvent.pageX);
                    }}
                    onResponderMove={(event) => {
                      previewSoundVolumeFromPageX(event.nativeEvent.pageX);
                    }}
                    onResponderRelease={() => {
                      void commitPreviewSoundVolume();
                    }}
                    onResponderTerminate={() => {
                      void commitPreviewSoundVolume();
                    }}
                    hitSlop={{ top: 18, bottom: 18, left: 0, right: 0 }}
                    accessibilityRole="adjustable"
                    accessibilityLabel="効果音の音量"
                  >
                    <View style={[styles.volumeRail, { backgroundColor: colors.border }]} />
                    <View
                      style={[
                        styles.volumeFill,
                        { backgroundColor: colors.tint, width: `${Math.round(soundVolume * 100)}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.volumeThumb,
                        {
                          backgroundColor: colors.tint,
                          left: `${Math.round(soundVolume * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Pressable
                    onPress={() => void handleChangeSoundVolume(soundVolume + SOUND_VOLUME_STEP)}
                    style={[
                      styles.volumeButton,
                      { borderColor: colors.border, opacity: soundVolume >= 1 ? 0.4 : 1 },
                    ]}
                    disabled={soundVolume >= 1}
                  >
                    <ThemedText type="defaultSemiBold">+</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ポモドーロ
          </ThemedText>
          <View style={styles.sectionContent}>
            <View style={[styles.pomodoroItem, { backgroundColor: colors.card }]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.tint + "20" }]}>
                <IconSymbol name="clock.fill" size={20} color={colors.tint} />
              </View>
              <View style={styles.pomodoroContent}>
                {hasActivePomodoro ? (
                  <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                    ポモドーロ実行中は、開始時の時間設定で固定されます
                  </ThemedText>
                ) : null}
                <PomodoroTimeRow
                  title="作業時間"
                  minutes={pomodoroSettings.workMinutes}
                  disabled={hasActivePomodoro}
                  colors={colors}
                  onChange={(nextValue) => void handleChangePomodoroMinutes("work", nextValue)}
                />
                <View style={[styles.pomodoroDivider, { backgroundColor: colors.border }]} />
                <PomodoroTimeRow
                  title="休憩時間"
                  minutes={pomodoroSettings.breakMinutes}
                  disabled={hasActivePomodoro}
                  colors={colors}
                  onChange={(nextValue) => void handleChangePomodoroMinutes("break", nextValue)}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            お知らせ
          </ThemedText>
          <View style={styles.sectionContent}>
            {latestAnnouncement ? (
              <SettingItem
                icon="quote.bubble"
                iconColor={colors.tint}
                title={latestAnnouncement.title}
                subtitle={`${latestAnnouncement.date} / v${latestAnnouncement.version}`}
                onPress={() => {
                  Alert.alert(latestAnnouncement.title, latestAnnouncement.message);
                  markAsSeen(latestAnnouncement.id);
                }}
              />
            ) : null}
            <SettingItem
              icon="chevron.right"
              iconColor="#2196F3"
              title="もっと見る"
              subtitle="過去のお知らせを確認"
              onPress={() => router.push("/announcements" as never)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SNS・お問い合わせ
          </ThemedText>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="paperplane.fill"
              iconColor={colors.success}
              title="お問い合わせ"
              subtitle={CONTACT_FORM_URL ? "フォームを開く" : "未設定"}
              onPress={() => openExternalLink(CONTACT_FORM_URL, "お問い合わせ")}
            />
            {SNS_LINKS.map((sns) => (
              <SettingItem
                key={sns.id}
                icon="square.and.arrow.up"
                iconColor="#111111"
                title={sns.label}
                subtitle={sns.url ? "Xを開く" : "未設定"}
                onPress={() => openExternalLink(sns.url, sns.label)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
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
          {isSaikoyama ? (
            <View style={[styles.founderBadge, { borderColor: colors.border }]}>
              <ThemedText style={[styles.founderTitle, { color: colors.textSecondary }]}>
                あなたは初期サポーターです
              </ThemedText>
              <ThemedText style={[styles.founderMessage, { color: colors.textDisabled }]}>
                早期のサポートありがとうございます
              </ThemedText>
            </View>
          ) : null}
          <ThemedText style={{ color: colors.textDisabled, fontSize: 12 }}>
            積み上げアプリ
          </ThemedText>
          <ThemedText style={{ color: colors.textDisabled, fontSize: 12 }}>
            個別の通知時刻は各積み上げの詳細画面から設定できます
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
  soundItem: {
    flexDirection: "row",
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
  },
  soundContent: {
    flex: 1,
  },
  soundHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.s,
  },
  volumeControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
    minHeight: 64,
  },
  volumeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  volumeTrack: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    overflow: "visible",
  },
  volumeRail: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 8,
    borderRadius: 4,
  },
  volumeFill: {
    position: "absolute",
    height: 8,
    borderRadius: 4,
  },
  volumeThumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    top: 22,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  pomodoroItem: {
    flexDirection: "row",
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
  },
  pomodoroContent: {
    flex: 1,
    gap: Spacing.s,
  },
  pomodoroTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.s,
  },
  disabledControl: {
    opacity: 0.75,
  },
  pomodoroTimeLabel: {
    flex: 1,
  },
  minuteStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  minuteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  minuteValue: {
    minWidth: 82,
    height: 40,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.m,
  },
  minuteInput: {
    width: "100%",
    minWidth: 44,
    height: 40,
    padding: 0,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  minuteDisplayButton: {
    width: "100%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    padding: Spacing.l,
  },
  keypadModal: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.card,
    padding: Spacing.m,
  },
  keypadTitle: {
    textAlign: "center",
    marginBottom: Spacing.s,
  },
  keypadValue: {
    height: 56,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.m,
  },
  keypadGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.s,
  },
  keypadButton: {
    width: "30%",
    minWidth: 80,
    height: 48,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keypadActions: {
    flexDirection: "row",
    gap: Spacing.s,
    marginTop: Spacing.m,
  },
  keypadActionButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  minuteUnit: {
    minWidth: 18,
  },
  pomodoroDivider: {
    height: 1,
    opacity: 0.7,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.m,
  },
  founderBadge: {
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.card,
    padding: Spacing.m,
    marginBottom: Spacing.m,
    opacity: 0.85,
  },
  founderTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  founderMessage: {
    fontSize: 12,
    marginTop: 4,
  },
});
