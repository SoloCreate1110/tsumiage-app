import { Audio } from "expo-av";
import { useCallback, useEffect, useRef } from "react";

const SOUND_MAP = {
  success: { uri: "https://actions.google.com/sounds/v1/cartoon/descending_whistle_3.ogg" },
  fanfare: { uri: "https://actions.google.com/sounds/v1/cartoon/concussive_drum_hit.ogg" },
  click: { uri: "https://actions.google.com/sounds/v1/ui/wood_plank_flicks.ogg" },
  toggle: { uri: "https://actions.google.com/sounds/v1/ui/click.ogg" },
  beep: { uri: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg" },
  softStop: { uri: "https://actions.google.com/sounds/v1/ui/click.ogg" },
  alarm: {
    uri: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg",
    maxDurationMs: 1000,
  },
  delete: { uri: "https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg" },
} as const;

type ManagedSound = {
  sound: Audio.Sound;
  timeoutId?: ReturnType<typeof setTimeout>;
};

export function useSound() {
  const mountedRef = useRef(true);
  const soundsRef = useRef<ManagedSound[]>([]);

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
    async (uri: string, maxDurationMs?: number) => {
      try {
        const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 1 });

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
  const playStart = useCallback(() => play(SOUND_MAP.beep.uri), [play]);
  const playStop = useCallback(() => play(SOUND_MAP.softStop.uri), [play]);
  const playComplete = useCallback(
    () => play(SOUND_MAP.alarm.uri, SOUND_MAP.alarm.maxDurationMs),
    [play]
  );
  const playPause = useCallback(() => play(SOUND_MAP.beep.uri), [play]);
  const playDelete = useCallback(() => play(SOUND_MAP.delete.uri), [play]);
  const playBeep = useCallback(() => play(SOUND_MAP.beep.uri), [play]);

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
