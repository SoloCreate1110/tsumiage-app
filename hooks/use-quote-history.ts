import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getTodayString } from "@/types/stack";
import { QUOTES } from "@/constants/quotes";

const QUOTE_HISTORY_KEY = "quote_history";
const TODAY_QUOTE_KEY = "quote_today";

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
  const [initialized, setInitialized] = useState(false);
  const [todayQuote, setTodayQuote] = useState<QuoteHistoryEntry | null>(null);

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
      const [historyRaw, todayRaw] = await AsyncStorage.multiGet([
        QUOTE_HISTORY_KEY,
        TODAY_QUOTE_KEY,
      ]);
      const parsed = historyRaw[1] ? (JSON.parse(historyRaw[1]) as QuoteHistoryEntry[]) : [];
      let normalized = normalizeHistory(parsed);
      const today = getTodayString();
      let entry: QuoteHistoryEntry | null = null;

      if (todayRaw[1]) {
        try {
          const stored = JSON.parse(todayRaw[1]) as { date: string; no: number };
          if (stored?.date === today) {
            const found = QUOTES.find((q) => q.no === stored.no);
            if (found) {
              entry = {
                no: found.no,
                text: found.text,
                author: found.author,
                date: today,
              };
            }
          }
        } catch {
          entry = null;
        }
      }

      if (!entry) {
        entry = normalized.find((h) => h.date === today) ?? null;
      }

      if (!entry) {
        const picked = pickQuoteForDate(today, normalized);
        entry = {
          no: picked.no,
          text: picked.text,
          author: picked.author,
          date: today,
        };
        normalized = normalizeHistory([entry, ...normalized]);
        await AsyncStorage.multiSet([
          [QUOTE_HISTORY_KEY, JSON.stringify(normalized)],
          [TODAY_QUOTE_KEY, JSON.stringify({ date: today, no: entry.no })],
        ]);
      } else {
        await AsyncStorage.setItem(
          TODAY_QUOTE_KEY,
          JSON.stringify({ date: today, no: entry.no })
        );
      }
      setHistory(normalized);
      setTodayQuote(entry);
    } catch (error) {
      console.error("Failed to load quote history:", error);
    } finally {
      setInitialized(true);
    }
  }, []);

  const resetHistory = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([QUOTE_HISTORY_KEY, TODAY_QUOTE_KEY]);
      setHistory([]);
      setTodayQuote(null);
    } catch (error) {
      console.error("Failed to reset quote history:", error);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const derivedTodayQuote = useMemo(() => {
    const today = getTodayString();
    return history.find((h) => h.date === today) ?? null;
  }, [history]);

  const ensureTodayQuote = useCallback(async () => {
    if (!initialized) return;
    const today = getTodayString();
    const existing = history.find((h) => h.date === today) ?? todayQuote;
    if (existing && existing.date === today) {
      setTodayQuote(existing);
      await AsyncStorage.setItem(
        TODAY_QUOTE_KEY,
        JSON.stringify({ date: today, no: existing.no })
      );
      return;
    }
    const picked = pickQuoteForDate(today, history);
    const entry: QuoteHistoryEntry = {
      no: picked.no,
      text: picked.text,
      author: picked.author,
      date: today,
    };
    await saveHistory([entry, ...history]);
    setTodayQuote(entry);
    await AsyncStorage.setItem(
      TODAY_QUOTE_KEY,
      JSON.stringify({ date: today, no: entry.no })
    );
  }, [history, saveHistory, todayQuote, initialized]);

  const getTodayQuote = useCallback(() => {
    return todayQuote ?? derivedTodayQuote ?? history[0] ?? QUOTES[0];
  }, [todayQuote, derivedTodayQuote, history]);

  const getAllQuotes = useCallback(() => {
    return QUOTES;
  }, []);

  return {
    history,
    initialized,
    loadHistory,
    saveHistory,
    resetHistory,
    ensureTodayQuote,
    getTodayQuote,
    getAllQuotes,
    todayQuote: todayQuote ?? derivedTodayQuote ?? history[0] ?? QUOTES[0],
  };
}
