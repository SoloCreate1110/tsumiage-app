/**
 * 積み上げデータの永続化フック
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  generateId,
  getTodayString,
  StackItem,
  StackRecord,
  StackType,
} from "@/types/stack";

const ITEMS_KEY = "stack_items";
const RECORDS_KEY = "stack_records";

export function useStackStorage() {
  const [items, setItems] = useState<StackItem[]>([]);
  const [records, setRecords] = useState<StackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 初期データ読み込み
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [itemsData, recordsData] = await Promise.all([
        AsyncStorage.getItem(ITEMS_KEY),
        AsyncStorage.getItem(RECORDS_KEY),
      ]);

      if (itemsData) {
        setItems(JSON.parse(itemsData));
      }
      if (recordsData) {
        setRecords(JSON.parse(recordsData));
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 項目を保存
  const saveItems = async (newItems: StackItem[]) => {
    try {
      await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(newItems));
      setItems(newItems);
    } catch (error) {
      console.error("Failed to save items:", error);
    }
  };

  // 記録を保存
  const saveRecords = async (newRecords: StackRecord[]) => {
    try {
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(newRecords));
      setRecords(newRecords);
    } catch (error) {
      console.error("Failed to save records:", error);
    }
  };

  // 新規項目を追加
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

  // 項目を更新
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

  // 項目を削除
  const deleteItem = useCallback(
    async (id: string) => {
      const newItems = items.filter((item) => item.id !== id);
      const newRecords = records.filter((record) => record.itemId !== id);
      await Promise.all([saveItems(newItems), saveRecords(newRecords)]);
    },
    [items, records]
  );

  // 積み上げ記録を追加
  const addRecord = useCallback(
    async (itemId: string, value: number) => {
      const now = new Date().toISOString();
      const today = getTodayString();

      const newRecord: StackRecord = {
        id: generateId(),
        itemId,
        value,
        date: today,
        createdAt: now,
      };

      // 記録を追加
      const newRecords = [...records, newRecord];
      await saveRecords(newRecords);

      // 項目の合計値を更新
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

  // 特定項目の記録を取得
  const getRecordsByItem = useCallback(
    (itemId: string) => {
      return records.filter((record) => record.itemId === itemId);
    },
    [records]
  );

  // 特定日の記録を取得
  const getRecordsByDate = useCallback(
    (date: string) => {
      return records.filter((record) => record.date === date);
    },
    [records]
  );

  // 今日の積み上げ値を取得
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

  // 日別の合計を取得（過去N日分）
  const getDailyTotals = useCallback(
    (itemId: string, days: number = 7) => {
      const result: { date: string; value: number }[] = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

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

  return {
    items,
    records,
    loading,
    addItem,
    updateItem,
    deleteItem,
    addRecord,
    getRecordsByItem,
    getRecordsByDate,
    getTodayValue,
    getDailyTotals,
    reload: loadData,
  };
}
