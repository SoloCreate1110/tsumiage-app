import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const FIRST_OPENED_AT_KEY = "first_opened_at";
const FOUNDER_PROMPT_SEEN_KEY = "founder_prompt_seen";
const SAIKOYAMA_CUTOFF = Date.UTC(2026, 5, 1);
const FOUNDER_PROMPT_END_AT = Date.UTC(2026, 4, 31, 23, 59, 59, 999);

export function isSaikoyamaEligible(firstOpenedAt: string | null) {
  if (!firstOpenedAt) return false;

  const openedAt = Date.parse(firstOpenedAt);
  if (Number.isNaN(openedAt)) return false;

  return openedAt < SAIKOYAMA_CUTOFF;
}

export function useFounderTitle() {
  const [loading, setLoading] = useState(true);
  const [firstOpenedAt, setFirstOpenedAt] = useState<string | null>(null);
  const [promptSeen, setPromptSeen] = useState(true);

  const loadOrCreateFirstOpenedAt = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FIRST_OPENED_AT_KEY);
      if (stored) {
        setFirstOpenedAt(stored);
        const seen = await AsyncStorage.getItem(FOUNDER_PROMPT_SEEN_KEY);
        setPromptSeen(seen === "1");
        return;
      }

      const now = new Date().toISOString();
      await AsyncStorage.setItem(FIRST_OPENED_AT_KEY, now);
      setFirstOpenedAt(now);
      setPromptSeen(false);
    } catch (error) {
      console.error("Failed to load first opened date:", error);
      setFirstOpenedAt(null);
      setPromptSeen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrCreateFirstOpenedAt();
  }, [loadOrCreateFirstOpenedAt]);

  const markFounderPromptSeen = useCallback(async () => {
    await AsyncStorage.setItem(FOUNDER_PROMPT_SEEN_KEY, "1");
    setPromptSeen(true);
  }, []);

  const isSaikoyama = isSaikoyamaEligible(firstOpenedAt);
  const shouldShowFounderPrompt =
    isSaikoyama && !promptSeen && Date.now() <= FOUNDER_PROMPT_END_AT;

  return {
    loading,
    firstOpenedAt,
    isSaikoyama,
    shouldShowFounderPrompt,
    markFounderPromptSeen,
  };
}
