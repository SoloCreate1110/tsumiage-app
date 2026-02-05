import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getTodayString } from "@/types/stack";
import { getQuoteByDate, QUOTES } from "@/constants/quotes";

const QUOTE_HISTORY_KEY = "quote_history";

export interface QuoteHistoryEntry {
  no: number;
  text: string;
  author: string;
  date: string; // YYYY-MM-DD
}

const normalizeHistory = (entries: QuoteHistoryEntry[]) => {
  const map = new Map<string, QuoteHistoryEntry>();
  entries.forEach((e) => {
    if (!map.has(e.date)) {
      map.set(e.date, e);
    }
  });
  return Array.from(map.values());
};

const pickQuoteForDate = (_date: string, history: QuoteHistoryEntry[]) => {
  const collected = new Set(history.map((h) => h.no));
  const remaining = QUOTES.filter((q) => !collected.has(q.no));
  if (remaining.length > 0) {
    const index = Math.floor(Math.random() * remaining.length);
    return remaining[index];
  }
  const randomIndex = Math.floor(Math.random() * QUOTES.length);
  return QUOTES[randomIndex];
};

export function useQuoteHistory() {
  const [history, setHistory] = useState<QuoteHistoryEntry[]>([]);

  const saveHistory = useCallback(async (entries: QuoteHistoryEntry[]) => {
    try {
      const normalized = normalizeHistory(entries);
      await AsyncStorage.setItem(QUOTE_HISTORY_KEY, JSON.stringify(normalized));
      setHistory(normalized);
    } catch (error) {
      console.error("Failed to save quote history:", error);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(QUOTE_HISTORY_KEY);
      const parsed = raw ? (JSON.parse(raw) as QuoteHistoryEntry[]) : [];
      let normalized = normalizeHistory(parsed);
      const today = getTodayString();
      const hasToday = normalized.some((h) => h.date === today);
      if (!hasToday) {
        const picked = pickQuoteForDate(today, normalized);
        const entry: QuoteHistoryEntry = {
          no: picked.no,
          text: picked.text,
          author: picked.author,
          date: today,
        };
        normalized = normalizeHistory([entry, ...normalized]);
        await AsyncStorage.setItem(QUOTE_HISTORY_KEY, JSON.stringify(normalized));
      }
      setHistory(normalized);
    } catch (error) {
      console.error("Failed to load quote history:", error);
    }
  }, []);

  const resetHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(QUOTE_HISTORY_KEY);
      setHistory([]);
    } catch (error) {
      console.error("Failed to reset quote history:", error);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const todayQuote = useMemo(() => {
    const today = getTodayString();
    const existing = history.find((h) => h.date === today);
    if (existing) return existing;
    return pickQuoteForDate(today, history);
  }, [history]);

  const ensureTodayQuote = useCallback(async () => {
    const today = getTodayString();
    const exists = history.some((h) => h.date === today);
    if (exists) return;
    const picked = pickQuoteForDate(today, history);
    const entry: QuoteHistoryEntry = {
      no: picked.no,
      text: picked.text,
      author: picked.author,
      date: today,
    };
    await saveHistory([entry, ...history]);
  }, [history, saveHistory]);

  const getTodayQuote = useCallback(() => {
    return todayQuote;
  }, [todayQuote]);

  const getAllQuotes = useCallback(() => {
    return QUOTES;
  }, []);

  return {
    history,
    loadHistory,
    saveHistory,
    resetHistory,
    ensureTodayQuote,
    getTodayQuote,
    getAllQuotes,
    todayQuote,
  };
}
