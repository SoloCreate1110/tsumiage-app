import { useState } from "react";
import { Alert, StyleSheet, TextInput, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol"; // Adjust import path if needed
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNotification } from "@/hooks/use-notification";

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? "light"];
    const { scheduleDailyReminder, cancelNotifications } = useNotification();

    const [hour, setHour] = useState("20");
    const [minute, setMinute] = useState("00");

    const handleSetNotification = async () => {
        const h = parseInt(hour, 10);
        const m = parseInt(minute, 10);

        if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
            Alert.alert("エラー", "正しい時刻を入力してください");
            return;
        }

        const success = await scheduleDailyReminder(h, m);
        if (success) {
            Alert.alert("設定完了", `毎日 ${h}:${m.toString().padStart(2, '0')} に通知します`);
        } else {
            Alert.alert("エラー", "通知権限がありません");
        }
    };

    const handleCancel = async () => {
        await cancelNotifications();
        Alert.alert("解除完了", "通知を解除しました");
    };

    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="arrow.left" size={24} color={colors.tint} />
                </Pressable>
                <ThemedText type="subtitle">設定</ThemedText>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.m }}>
                        通知設定
                    </ThemedText>
                    <ThemedText style={{ color: colors.textSecondary, marginBottom: Spacing.m }}>
                        毎日決まった時間にリマインダーを送ります。
                    </ThemedText>

                    <View style={styles.timeInputRow}>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                            value={hour}
                            onChangeText={setHour}
                            keyboardType="numeric"
                            maxLength={2}
                            placeholder="20"
                        />
                        <ThemedText>:</ThemedText>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                            value={minute}
                            onChangeText={setMinute}
                            keyboardType="numeric"
                            maxLength={2}
                            placeholder="00"
                        />
                    </View>

                    <View style={styles.buttonRow}>
                        <Pressable
                            style={[styles.button, { backgroundColor: colors.tint }]}
                            onPress={handleSetNotification}
                        >
                            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>設定する</ThemedText>
                        </Pressable>

                        <Pressable
                            style={[styles.button, { backgroundColor: colors.error, marginTop: Spacing.s }]}
                            onPress={handleCancel}
                        >
                            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>通知を解除</ThemedText>
                        </Pressable>
                    </View>
                </View>
            </View>
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
        padding: Spacing.m,
    },
    backButton: {
        padding: Spacing.s,
    },
    content: {
        padding: Spacing.m,
    },
    section: {
        padding: Spacing.m,
        borderRadius: BorderRadius.card,
    },
    timeInputRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.m,
        marginBottom: Spacing.l,
    },
    input: {
        borderWidth: 1,
        borderRadius: BorderRadius.button,
        padding: Spacing.m,
        width: 60,
        textAlign: "center",
        fontSize: 20,
    },
    buttonRow: {
        gap: Spacing.s,
    },
    button: {
        padding: Spacing.m,
        borderRadius: BorderRadius.button,
        alignItems: "center",
    },
});
