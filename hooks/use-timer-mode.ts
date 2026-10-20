import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";

// Mode is a preference, independent of whether a timer is running or finished.
export function useTimerMode(itemId: string | undefined) {
  const [showPomodoroMode, setMode] = useState(false);
  const [modeHydrated, setHydrated] = useState(false);
  const modeRef = useRef(false);
  const key = itemId ? `timer_mode_${itemId}` : null;
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    void (async () => {
      await writes.current;
      let pomodoro = false;
      try { pomodoro = !!key && (await AsyncStorage.getItem(key)) === "pomodoro"; }
      catch (error) { console.error("Failed to load timer mode:", error); }
      if (cancelled) return;
      modeRef.current = pomodoro;
      setMode(pomodoro);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [key]);
  const setShowPomodoroMode = useCallback((value: SetStateAction<boolean>) => {
    const next = typeof value === "function" ? value(modeRef.current) : value;
    if (next === modeRef.current) return;
    modeRef.current = next;
    setMode(next);
    if (key) writes.current = writes.current.then(() => AsyncStorage.setItem(key, next ? "pomodoro" : "normal"))
      .catch(error => console.error("Failed to save timer mode:", error));
  }, [key]);
  return { showPomodoroMode, setShowPomodoroMode, modeHydrated };
}
