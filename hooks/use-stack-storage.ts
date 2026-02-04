/**
 * 遨阪∩荳翫￡繝・・繧ｿ縺ｮ豌ｸ邯壼喧繝輔ャ繧ｯ
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  generateId,
  getTodayDate,
  getTodayString,
  toDateString,
  StackItem,
  StackRecord,
  StackType,
  DailyNote,
} from "@/types/stack";

const ITEMS_KEY = "stack_items";
const RECORDS_KEY = "stack_records";
const DAILY_NOTES_KEY = "stack_daily_notes";

const normalizeRecordDate = (value: string, createdAt?: string): string => {
  if (createdAt) {
    const created = new Date(createdAt);
    if (!Number.isNaN(created.getTime())) {
      const adjusted = new Date(created);
      if (adjusted.getHours() < 6) {
        adjusted.setDate(adjusted.getDate() - 1);
      }
      adjusted.setHours(0, 0, 0, 0);
      return toDateString(adjusted);
    }
  }

  if (!value) return value;
  const head = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) {
    const parsed = new Date(head);
    if (!Number.isNaN(parsed.getTime())) {
      return toDateString(parsed);
    }
    return head;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return toDateString(parsed);
  }
  return value;
};

function useStackStorageInternal() {
  const [items, setItems] = useState<StackItem[]>([]);
  const [records, setRecords] = useState<StackRecord[]>([]);
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
  const [loading, setLoading] = useState(true);

  // 蛻晄悄繝・・繧ｿ隱ｭ縺ｿ霎ｼ縺ｿ
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [itemsData, recordsData, dailyNotesData] = await Promise.all([
        AsyncStorage.getItem(ITEMS_KEY),
        AsyncStorage.getItem(RECORDS_KEY),
        AsyncStorage.getItem(DAILY_NOTES_KEY),
      ]);

      if (itemsData) {
        const parsedItems = JSON.parse(itemsData) as StackItem[];
        const withOrder = parsedItems.map((item, index) => ({
          ...item,
          order: item.order ?? index,
          reminder: item.reminder ?? { enabled: false, time: "20:00" },
        }));
        const sortedItems = [...withOrder].sort((a, b) => {
          const ao = a.order ?? 0;
          const bo = b.order ?? 0;
          if (ao !== bo) return ao - bo;
          return a.createdAt.localeCompare(b.createdAt);
        });
        setItems(sortedItems);
      }
      if (recordsData) {
        const parsed = JSON.parse(recordsData) as StackRecord[];
        const normalized = parsed.map((r) => ({
          ...r,
          date: normalizeRecordDate(r.date, r.createdAt),
        }));
        setRecords(normalized);
      }
      if (dailyNotesData) {
        const parsedNotes = JSON.parse(dailyNotesData) as DailyNote[];
        setDailyNotes(parsedNotes);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 鬆・岼繧剃ｿ晏ｭ・
  const saveItems = async (newItems: StackItem[]) => {
    try {
      await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(newItems));
      setItems(newItems);
    } catch (error) {
      console.error("Failed to save items:", error);
    }
  };

  // 險倬鹸繧剃ｿ晏ｭ・
  const saveRecords = async (newRecords: StackRecord[]) => {
    try {
      const normalized = newRecords.map((r) => ({
        ...r,
        date: normalizeRecordDate(r.date, r.createdAt),
      }));
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(normalized));
      setRecords(normalized);
    } catch (error) {
      console.error("Failed to save records:", error);
    }
  };

  const saveDailyNotes = async (newNotes: DailyNote[]) => {
    try {
      await AsyncStorage.setItem(DAILY_NOTES_KEY, JSON.stringify(newNotes));
      setDailyNotes(newNotes);
    } catch (error) {
      console.error("Failed to save daily notes:", error);
    }
  };

  // 譁ｰ隕城・岼繧定ｿｽ蜉
  const addItem = useCallback(
    async (name: string, type: StackType, icon: string, color: string) => {
      console.log('[addItem] Starting to add item:', { name, type, icon, color });
      const now = new Date().toISOString();
      const newItem: StackItem = {
        id: generateId(),
        name,
        type,
        icon,
        color,
        totalValue: 0,
        order: items.length,
        reminder: { enabled: false, time: "20:00" },
        createdAt: now,
        updatedAt: now,
      };

      console.log('[addItem] New item created:', newItem);
      const newItems = [...items, newItem];
      console.log('[addItem] Total items:', newItems.length);
      await saveItems(newItems);
      console.log('[addItem] Item saved successfully');
      return newItem;
    },
    [items]
  );

  // 鬆・岼繧呈峩譁ｰ
  const updateItem = useCallback(
    async (id: string, updates: Partial<StackItem>) => {
      const newItems = items.map((item) =>
        item.id === id
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      );
      await saveItems(newItems);
    },
    [items]
  );

  // 鬆・岼繧貞炎髯､
  const deleteItem = useCallback(
    async (id: string) => {
      const newItems = items.filter((item) => item.id !== id);
      const newRecords = records.filter((record) => record.itemId !== id);
      await Promise.all([saveItems(newItems), saveRecords(newRecords)]);
    },
    [items, records]
  );

  const reorderItems = useCallback(
    async (orderedItems: StackItem[]) => {
      const normalized = orderedItems.map((item, index) => ({
        ...item,
        order: index,
        updatedAt: new Date().toISOString(),
      }));
      await saveItems(normalized);
    },
    [saveItems]
  );

  // 遨阪∩荳翫￡險倬鹸繧定ｿｽ蜉
  const addRecord = useCallback(
    async (itemId: string, value: number, note?: string) => {
      const now = new Date().toISOString();
      const today = getTodayString();

      const newRecord: StackRecord = {
        id: generateId(),
        itemId,
        value,
        date: today,
        createdAt: now,
        note: note?.trim() ? note.trim() : undefined,
      };

      // 險倬鹸繧定ｿｽ蜉
      const newRecords = [...records, newRecord];
      await saveRecords(newRecords);

      // 鬆・岼縺ｮ蜷郁ｨ亥､繧呈峩譁ｰ
      const item = items.find((i) => i.id === itemId);
      if (item) {
        await updateItem(itemId, {
          totalValue: item.totalValue + value,
        });
      }

      return newRecord;
    },
    [items, records, updateItem]
  );

  // 迚ｹ螳夐・岼縺ｮ險倬鹸繧貞叙蠕・
  const getRecordsByItem = useCallback(
    (itemId: string) => {
      return records.filter((record) => record.itemId === itemId);
    },
    [records]
  );

  // 迚ｹ螳壽律縺ｮ險倬鹸繧貞叙蠕・
  const getRecordsByDate = useCallback(
    (date: string) => {
      return records.filter((record) => record.date === date);
    },
    [records]
  );

  // 莉頑律縺ｮ遨阪∩荳翫￡蛟､繧貞叙蠕・
  const getTodayValue = useCallback(
    (itemId: string) => {
      const today = getTodayString();
      const todayRecords = records.filter(
        (r) => r.itemId === itemId && r.date === today
      );
      return todayRecords.reduce((sum, r) => sum + r.value, 0);
    },
    [records]
  );

  // 譌･蛻･縺ｮ蜷郁ｨ医ｒ蜿門ｾ暦ｼ磯℃蜴ｻN譌･蛻・ｼ・
  const getDailyTotals = useCallback(
    (itemId: string, days: number = 7) => {
      const result: { date: string; value: number }[] = [];
      const today = getTodayDate();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = toDateString(date);

        const dayRecords = records.filter(
          (r) => r.itemId === itemId && r.date === dateStr
        );
        const total = dayRecords.reduce((sum, r) => sum + r.value, 0);

        result.push({ date: dateStr, value: total });
      }

      return result;
    },
    [records]
  );

  // 騾｣邯壽律謨ｰ繧定ｨ育ｮ・
  const calculateStreak = useCallback(() => {
    const uniqueDates = [...new Set(records.map((r) => r.date))].sort();
    let streak = 0;
    const today = getTodayDate();

    // 莉頑律縺ｾ縺溘・譏ｨ譌･縺ｮ險倬鹸縺後↑縺・→繧ｹ繝医Μ繝ｼ繧ｯ縺ｯ0縺ｫ縺ｪ繧九・縺ｧ縲・
    // 莉頑律縺ｮ險倬鹸縺檎┌縺上※繧よ乖譌･縺ゅｌ縺ｰ騾泌・繧後↑縺・ｈ縺・↓縺吶ｋ・医い繝励Μ縺ｮ莉墓ｧ倥↓繧医ｋ縺後∽ｻ雁屓縺ｯ縲御ｻ頑律繧・▲縺ｦ縺ｪ縺上※繧よ乖譌･縺ｮ邯壹″縲阪→縺ｿ縺ｪ縺吶°縲√御ｻ頑律繧・ｉ縺ｪ縺・→0縲阪→縺吶ｋ縺九・
    // 荳闊ｬ逧・↓縺ｯ縲梧乖譌･縺ｾ縺ｧ邯壹＞縺ｦ縺・ｌ縺ｰ縲∽ｻ頑律繧ゅメ繝｣繝ｳ繧ｹ縺後≠繧九阪・縺ｧ縲∵乖譌･縺ｾ縺ｧ縺ｮ騾｣邯壽焚繧定｡ｨ遉ｺ縺励∽ｻ頑律繧・ｌ縺ｰ+1縲∽ｻ頑律繧・ｉ縺ｪ縺代ｌ縺ｰ譏取律0縺ｫ縺ｪ繧九√→縺・≧繝ｭ繧ｸ繝・け縺悟､壹＞縲・
    // 縺薙％縺ｧ縺ｯ stats.tsx 縺ｮ繝ｭ繧ｸ繝・け繧定ｸ剰･ｲ縺吶ｋ縲・

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = toDateString(checkDate);
      if (uniqueDates.includes(dateStr)) {
        streak++;
      } else if (i === 0) {
        // 莉頑律縺ｾ縺險倬鹸縺後↑縺・ｴ蜷医∵乖譌･險倬鹸縺後≠繧後・繧ｹ繝医Μ繝ｼ繧ｯ邯ｭ謖√→縺吶ｋ縺溘ａ縺ｮ迪ｶ莠・
        // 縺溘□縺励《tats.tsx縺ｮ繝ｭ繧ｸ繝・け縺縺ｨ縲御ｻ頑律險倬鹸縺後↑縺・→繧ｫ繧ｦ繝ｳ繝医＆繧後↑縺・ｼ郁ｨ倬鹸譌･蝓ｺ貅厄ｼ峨阪↓縺ｪ縺｣縺ｦ縺・ｋ縲・
        // 縺薙％縺ｧ縺ｯ縲御ｻ頑律險倬鹸縺後↑縺上※繧ゅ∵乖譌･險倬鹸縺後≠繧後・繧ｫ繧ｦ繝ｳ繝医☆繧九阪ｈ縺・↓蟆代＠隱ｿ謨ｴ縺励◆縺・′縲・
        // 縺ｾ縺壹・譌｢蟄倥Ο繧ｸ繝・け騾壹ｊ縺ｫ縺吶ｋ縲・
        continue;
      } else {
        // 險倬鹸縺碁泌・繧後◆繧臥ｵゆｺ・
        break;
      }
    }
    return streak;
  }, [records]);

  const getDailyNote = useCallback(
    (itemId: string, date: string) => {
      return dailyNotes.find((n) => n.itemId === itemId && n.date === date)?.text ?? "";
    },
    [dailyNotes]
  );

  const setDailyNote = useCallback(
    async (itemId: string, date: string, text: string) => {
      const trimmed = text.trim();
      const now = new Date().toISOString();
      let nextNotes = dailyNotes.filter((n) => !(n.itemId === itemId && n.date === date));
      if (trimmed) {
        nextNotes = [
          ...nextNotes,
          { itemId, date, text: trimmed, updatedAt: now },
        ];
      }
      await saveDailyNotes(nextNotes);
    },
    [dailyNotes]
  );

  return {
    items,
    records,
    dailyNotes,
    loading,
    addItem,
    updateItem,
    deleteItem,
    addRecord,
    getRecordsByItem,
    getRecordsByDate,
    getTodayValue,
    getDailyTotals,
    calculateStreak,
    reorderItems,
    getDailyNote,
    setDailyNote,
    reload: loadData,
  };
}

type StackStorageContextValue = ReturnType<typeof useStackStorageInternal>;

const StackStorageContext = createContext<StackStorageContextValue | null>(null);

export function StackStorageProvider({ children }: { children: ReactNode }) {
  const value = useStackStorageInternal();
  return createElement(StackStorageContext.Provider, { value }, children);
}

export function useStackStorage() {
  const ctx = useContext(StackStorageContext);
  if (!ctx) {
    throw new Error("useStackStorage must be used within StackStorageProvider");
  }
  return ctx;
}


