import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const POMODORO_SETTINGS_KEY = "pomodoro_settings";

export const DEFAULT_POMODORO_WORK_MINUTES = 25;
export const DEFAULT_POMODORO_BREAK_MINUTES = 5;
export const MIN_POMODORO_MINUTES = 1;
export const MAX_POMODORO_MINUTES = 60;

export interface PomodoroSettings {
  workMinutes: number;
  breakMinutes: number;
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workMinutes: DEFAULT_POMODORO_WORK_MINUTES,
  breakMinutes: DEFAULT_POMODORO_BREAK_MINUTES,
};

let cachedPomodoroSettings: PomodoroSettings = DEFAULT_POMODORO_SETTINGS;
const pomodoroSettingsListeners = new Set<(settings: PomodoroSettings) => void>();

function publishPomodoroSettings(settings: PomodoroSettings) {
  cachedPomodoroSettings = settings;
  pomodoroSettingsListeners.forEach((listener) => listener(settings));
}

export function clampPomodoroMinutes(value: number): number {
  if (!Number.isFinite(value)) return MIN_POMODORO_MINUTES;
  return Math.min(MAX_POMODORO_MINUTES, Math.max(MIN_POMODORO_MINUTES, Math.round(value)));
}

function normalizeSettings(input: Partial<PomodoroSettings> | null | undefined): PomodoroSettings {
  return {
    workMinutes: clampPomodoroMinutes(input?.workMinutes ?? DEFAULT_POMODORO_WORK_MINUTES),
    breakMinutes: clampPomodoroMinutes(input?.breakMinutes ?? DEFAULT_POMODORO_BREAK_MINUTES),
  };
}

export function usePomodoroSettings() {
  const [settings, setSettings] = useState<PomodoroSettings>(cachedPomodoroSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pomodoroSettingsListeners.add(setSettings);

    const loadSettings = async () => {
      try {
        const raw = await AsyncStorage.getItem(POMODORO_SETTINGS_KEY);
        if (raw) {
          publishPomodoroSettings(normalizeSettings(JSON.parse(raw) as Partial<PomodoroSettings>));
        }
      } catch (error) {
        console.error("Failed to load pomodoro settings:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();

    return () => {
      pomodoroSettingsListeners.delete(setSettings);
    };
  }, []);

  const saveSettings = useCallback(async (nextSettings: Partial<PomodoroSettings>) => {
    const normalized = normalizeSettings({
      ...cachedPomodoroSettings,
      ...nextSettings,
    });
    await AsyncStorage.setItem(POMODORO_SETTINGS_KEY, JSON.stringify(normalized));
    publishPomodoroSettings(normalized);
    return normalized;
  }, []);

  const setWorkMinutes = useCallback(
    (workMinutes: number) => saveSettings({ workMinutes }),
    [saveSettings]
  );

  const setBreakMinutes = useCallback(
    (breakMinutes: number) => saveSettings({ breakMinutes }),
    [saveSettings]
  );

  return {
    settings,
    loading,
    setWorkMinutes,
    setBreakMinutes,
  };
}
