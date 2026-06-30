import { Audio } from "expo-av";
import type { AVPlaybackSource } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef } from "react";

export const SOUND_VOLUME_KEY = "sound_volume";
export const DEFAULT_SOUND_VOLUME = 0.55;
export const SOUND_VOLUME_STEP = 0.1;

const SOUND_MAP = {
  success: { uri: "https://actions.google.com/sounds/v1/cartoon/descending_whistle_3.ogg" },
  fanfare: { uri: "https://actions.google.com/sounds/v1/cartoon/concussive_drum_hit.ogg" },
  click: { uri: "https://actions.google.com/sounds/v1/ui/wood_plank_flicks.ogg" },
  toggle: { uri: "https://actions.google.com/sounds/v1/ui/click.ogg" },
  starting: require("@/assets/sounds/Starting000.wav"),
  ending: require("@/assets/sounds/Ending000.wav"),
  stop: require("@/assets/sounds/Stop000.wav"),
  delete: { uri: "https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg" },
} as const;

type ManagedSound = {
  sound: Audio.Sound;
  timeoutId?: ReturnType<typeof setTimeout>;
};

export function clampSoundVolume(value: number) {
  return Math.min(1, Math.max(0, value));
}

export async function loadSoundVolume() {
  try {
    const raw = await AsyncStorage.getItem(SOUND_VOLUME_KEY);
    if (!raw) return DEFAULT_SOUND_VOLUME;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clampSoundVolume(parsed) : DEFAULT_SOUND_VOLUME;
  } catch {
    return DEFAULT_SOUND_VOLUME;
  }
}

export async function saveSoundVolume(value: number) {
  const nextVolume = clampSoundVolume(value);
  await AsyncStorage.setItem(SOUND_VOLUME_KEY, String(nextVolume));
  return nextVolume;
}

export function useSound() {
  const mountedRef = useRef(true);
  const soundsRef = useRef<ManagedSound[]>([]);
  const volumeRef = useRef(DEFAULT_SOUND_VOLUME);

  useEffect(() => {
    void loadSoundVolume().then((volume) => {
      volumeRef.current = volume;
    });
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      soundsRef.current.forEach(({ sound, timeoutId }) => {
        if (timeoutId) clearTimeout(timeoutId);
        void sound.unloadAsync();
      });
      soundsRef.current = [];
    };
  }, []);

  const cleanup = useCallback((target: Audio.Sound) => {
    const managed = soundsRef.current.find((entry) => entry.sound === target);
    if (managed?.timeoutId) clearTimeout(managed.timeoutId);
    soundsRef.current = soundsRef.current.filter((entry) => entry.sound !== target);
    void target.unloadAsync();
  }, []);

  const stopAllSounds = useCallback(() => {
    soundsRef.current.forEach(({ sound, timeoutId }) => {
      if (timeoutId) clearTimeout(timeoutId);
      void sound.stopAsync().catch(() => undefined);
      void sound.unloadAsync().catch(() => undefined);
    });
    soundsRef.current = [];
  }, []);

  const play = useCallback(
    async (source: AVPlaybackSource | string, maxDurationMs?: number) => {
      try {
        const playbackSource = typeof source === "string" ? { uri: source } : source;
        volumeRef.current = await loadSoundVolume();
        const { sound } = await Audio.Sound.createAsync(playbackSource, {
          shouldPlay: true,
          volume: volumeRef.current,
        });

        if (!mountedRef.current) {
          await sound.unloadAsync();
          return;
        }

        const managed: ManagedSound = { sound };
        if (maxDurationMs) {
          managed.timeoutId = setTimeout(() => {
            void sound.stopAsync().catch(() => undefined);
            cleanup(sound);
          }, maxDurationMs);
        }

        soundsRef.current.push(managed);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded || !status.didJustFinish) return;
          cleanup(sound);
        });
      } catch (error) {
        console.log("Error playing sound:", error);
      }
    },
    [cleanup]
  );

  const playSuccess = useCallback(() => play(SOUND_MAP.success.uri), [play]);
  const playFanfare = useCallback(() => play(SOUND_MAP.fanfare.uri), [play]);
  const playClick = useCallback(() => play(SOUND_MAP.click.uri), [play]);
  const playToggle = useCallback(() => play(SOUND_MAP.toggle.uri), [play]);
  const playStart = useCallback(() => play(SOUND_MAP.starting), [play]);
  const playStop = useCallback(() => play(SOUND_MAP.ending), [play]);
  const playComplete = useCallback(() => play(SOUND_MAP.ending), [play]);
  const playPause = useCallback(() => play(SOUND_MAP.stop), [play]);
  const playDelete = useCallback(() => play(SOUND_MAP.delete.uri), [play]);
  const playBeep = useCallback(() => play(SOUND_MAP.ending), [play]);

  return {
    playSuccess,
    playFanfare,
    playClick,
    playToggle,
    playStart,
    playStop,
    playComplete,
    playPause,
    playDelete,
    playBeep,
    stopAllSounds,
  };
}
