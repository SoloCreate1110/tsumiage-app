import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

import { useStackStorage } from "@/hooks/use-stack-storage";

type PersistedPomodoroState = {
  phase?: "work" | "break" | "idle";
  isRunning?: boolean;
};

export function useActivePomodoroState() {
  const { items } = useStackStorage();
  const [hasActivePomodoro, setHasActivePomodoro] = useState(false);

  const checkActivePomodoro = useCallback(async () => {
    if (items.length === 0) {
      setHasActivePomodoro(false);
      return;
    }

    try {
      const entries = await AsyncStorage.multiGet(
        items.map((item) => `pomodoro_state_${item.id}`)
      );

      const hasActive = entries.some(([, raw]) => {
        if (!raw) return false;
        try {
          const state = JSON.parse(raw) as PersistedPomodoroState;
          return state.phase !== "idle";
        } catch {
          return false;
        }
      });

      setHasActivePomodoro(hasActive);
    } catch {
      setHasActivePomodoro(false);
    }
  }, [items]);

  useEffect(() => {
    void checkActivePomodoro();
  }, [checkActivePomodoro]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void checkActivePomodoro();
      }
    });

    return () => subscription.remove();
  }, [checkActivePomodoro]);

  return {
    hasActivePomodoro,
    refreshActivePomodoro: checkActivePomodoro,
  };
}
