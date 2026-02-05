import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View, Pressable, Platform } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface TimeInputProps {
    value: number | undefined; // 秒単位
    onChange: (seconds: number) => void;
}

export function TimeInput({ value, onChange }: TimeInputProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? "light"];

    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);

    // 初期値の反映
    useEffect(() => {
        if (value !== undefined) {
            const h = Math.floor(value / 3600);
            const m = Math.floor((value % 3600) / 60);
            setHours(h);
            setMinutes(m);
        } else {
            setHours(0);
            setMinutes(0);
        }
    }, [value]);

    const updateTime = (newHours: number, newMinutes: number) => {
        // 負の値にならないように
        const h = Math.max(0, newHours);
        const m = Math.max(0, newMinutes);

        setHours(h);
        setMinutes(m);

        const totalSeconds = h * 3600 + m * 60;
        onChange(totalSeconds);
    };

    const adjustHours = (delta: number) => {
        updateTime(hours + delta, minutes);
    };

    const adjustMinutes = (delta: number) => {
        let newM = minutes + delta;
        let newH = hours;

        if (newM >= 60) {
            newM -= 60;
            newH += 1;
        } else if (newM < 0) {
            newM += 60;
            newH = Math.max(0, newH - 1);
        }

        updateTime(newH, newM);
    };

    return (
        <View style={styles.container}>
            {/* Hours */}
            <View style={styles.column}>
                <Pressable
                    onPress={() => adjustHours(1)}
                    style={({ pressed }) => [styles.button, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1, borderColor: colors.border }]}
                >
                    <IconSymbol name="chevron.up" size={20} color={colors.tint} />
                </Pressable>

                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={hours.toString()}
                        onChangeText={(text) => updateTime(parseInt(text || "0", 10), minutes)}
                        keyboardType="numeric"
                        maxLength={3}
                    />
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>時間</ThemedText>
                </View>

                <Pressable
                    onPress={() => adjustHours(-1)}
                    style={({ pressed }) => [styles.button, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1, borderColor: colors.border }]}
                >
                    <IconSymbol name="chevron.down" size={20} color={colors.tint} />
                </Pressable>
            </View>

            <ThemedText style={{ fontSize: 20, fontWeight: "bold", paddingBottom: 20 }}>:</ThemedText>

            {/* Minutes */}
            <View style={styles.column}>
                <Pressable
                    onPress={() => adjustMinutes(5)} // 5分刻み
                    style={({ pressed }) => [styles.button, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1, borderColor: colors.border }]}
                >
                    <IconSymbol name="chevron.up" size={20} color={colors.tint} />
                </Pressable>

                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={minutes.toString().padStart(2, '0')}
                        onChangeText={(text) => updateTime(hours, parseInt(text || "0", 10))}
                        keyboardType="numeric"
                        maxLength={2}
                    />
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>分</ThemedText>
                </View>

                <Pressable
                    onPress={() => adjustMinutes(-5)} // 5分刻み
                    style={({ pressed }) => [styles.button, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1, borderColor: colors.border }]}
                >
                    <IconSymbol name="chevron.down" size={20} color={colors.tint} />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.m,
    },
    column: {
        alignItems: "center",
        gap: Spacing.xs,
    },
    inputContainer: {
        width: 70,
        height: 80,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: BorderRadius.card,
        paddingVertical: 4,
    },
    input: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        width: "100%",
        padding: 0,
    },
    button: {
        width: 44,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 4,
    },
});
