import { Audio } from "expo-av";
import { useEffect, useState } from "react";

export function useSound() {
    const [sound, setSound] = useState<Audio.Sound>();

    async function playSuccess() {
        try {
            // デモ用の効果音（ポップ音）
            const { sound } = await Audio.Sound.createAsync(
                { uri: "https://actions.google.com/sounds/v1/cartoon/pop.ogg" }
            );
            setSound(sound);
            await sound.playAsync();
        } catch (error) {
            console.log("Error playing sound:", error);
        }
    }

    async function playFanfare() {
        try {
            // デモ用の完了音
            const { sound } = await Audio.Sound.createAsync(
                { uri: "https://actions.google.com/sounds/v1/cartoon/slide_whistle_to_drum_hit.ogg" }
            );
            setSound(sound);
            await sound.playAsync();
        } catch (error) {
            console.log("Error playing sound:", error);
        }
    }

    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    return { playSuccess, playFanfare };
}
