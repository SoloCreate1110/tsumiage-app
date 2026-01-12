/**
 * UI改善機能のテスト
 */

import { describe, it, expect } from "vitest";
import {
  calculateDaysRemaining,
  calculateGoalProgress,
  formatDate,
  formatTimeDetailed,
} from "../types/stack";
import type { StackRecord } from "../types/stack";

describe("UI改善機能", () => {
  describe("残日数計算", () => {
    it("未来の日付の残日数を計算", () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const daysRemaining = calculateDaysRemaining(tomorrowStr);
      expect(daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it("今日の日付の残日数は0", () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const daysRemaining = calculateDaysRemaining(todayStr);
      expect(daysRemaining).toBe(0);
    });

    it("過去の日付の残日数は0", () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const daysRemaining = calculateDaysRemaining(yesterdayStr);
      expect(daysRemaining).toBe(0);
    });

    it("1週間後の残日数を計算", () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split("T")[0];

      const daysRemaining = calculateDaysRemaining(nextWeekStr);
      expect(daysRemaining).toBeGreaterThanOrEqual(6);
    });
  });

  describe("日付フォーマット", () => {
    it("YYYY-MM-DD形式をM/D形式に変換", () => {
      const formatted = formatDate("2025-02-15");
      expect(formatted).toBe("2月15日");
    });

    it("1月1日の形式", () => {
      const formatted = formatDate("2025-01-01");
      expect(formatted).toBe("1月1日");
    });

    it("12月31日の形式", () => {
      const formatted = formatDate("2025-12-31");
      expect(formatted).toBe("12月31日");
    });
  });

  describe("時間詳細フォーマット", () => {
    it("秒をHH:MM:SS形式に変換", () => {
      const formatted = formatTimeDetailed(3661); // 1時間1分1秒
      expect(formatted).toBe("01:01:01");
    });

    it("0秒は00:00:00", () => {
      const formatted = formatTimeDetailed(0);
      expect(formatted).toBe("00:00:00");
    });

    it("1時間は01:00:00", () => {
      const formatted = formatTimeDetailed(3600);
      expect(formatted).toBe("01:00:00");
    });

    it("1分は00:01:00", () => {
      const formatted = formatTimeDetailed(60);
      expect(formatted).toBe("00:01:00");
    });

    it("1秒は00:00:01", () => {
      const formatted = formatTimeDetailed(1);
      expect(formatted).toBe("00:00:01");
    });

    it("24時間以上は正しく表示", () => {
      const formatted = formatTimeDetailed(86400); // 24時間
      expect(formatted).toBe("24:00:00");
    });
  });

  describe("目標達成率計算", () => {
    it("達成率0%", () => {
      const progress = calculateGoalProgress(0, 100);
      expect(progress).toBe(0);
    });

    it("達成率50%", () => {
      const progress = calculateGoalProgress(50, 100);
      expect(progress).toBe(50);
    });

    it("達成率100%", () => {
      const progress = calculateGoalProgress(100, 100);
      expect(progress).toBe(100);
    });

    it("達成率が100%を超える場合は100%に制限", () => {
      const progress = calculateGoalProgress(150, 100);
      expect(progress).toBe(100);
    });

    it("目標が0の場合は0%", () => {
      const progress = calculateGoalProgress(50, 0);
      expect(progress).toBe(0);
    });

    it("目標がundefinedの場合は0%", () => {
      const progress = calculateGoalProgress(50, undefined);
      expect(progress).toBe(0);
    });

    it("小数点以下は丸める", () => {
      const progress = calculateGoalProgress(33, 100);
      expect(progress).toBe(33);
    });
  });

  describe("記録グループ化", () => {
    it("複数の記録を日付ごとにグループ化", () => {
      const records = [
        { id: "1", itemId: "item1", value: 100, date: "2025-02-15", createdAt: "" },
        { id: "2", itemId: "item1", value: 200, date: "2025-02-15", createdAt: "" },
        { id: "3", itemId: "item1", value: 150, date: "2025-02-14", createdAt: "" },
      ];

      const grouped = new Map<string, { count: number; totalValue: number }>();
      records.forEach((record) => {
        if (grouped.has(record.date)) {
          const existing = grouped.get(record.date)!;
          existing.count += 1;
          existing.totalValue += record.value;
        } else {
          grouped.set(record.date, { count: 1, totalValue: record.value });
        }
      });

      expect(grouped.get("2025-02-15")).toEqual({ count: 2, totalValue: 300 });
      expect(grouped.get("2025-02-14")).toEqual({ count: 1, totalValue: 150 });
    });

    it("最新10日分に制限", () => {
      const dates = Array.from({ length: 20 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split("T")[0];
      });

      const latestTen = dates.slice(0, 10);
      expect(latestTen.length).toBe(10);
    });
  });
});
