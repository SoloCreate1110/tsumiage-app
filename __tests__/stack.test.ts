/**
 * 積み上げアプリのユニットテスト
 */

import { describe, it, expect } from "vitest";
import {
  formatTime,
  formatTimeDetailed,
  formatCount,
  formatDate,
  getTodayString,
  generateId,
} from "../types/stack";

describe("formatTime", () => {
  it("秒のみの場合は秒で表示", () => {
    expect(formatTime(30)).toBe("30秒");
    expect(formatTime(0)).toBe("0秒");
  });

  it("分がある場合は分秒で表示", () => {
    expect(formatTime(60)).toBe("1分0秒");
    expect(formatTime(90)).toBe("1分30秒");
    expect(formatTime(300)).toBe("5分0秒");
  });

  it("時間がある場合は時間分で表示", () => {
    expect(formatTime(3600)).toBe("1時間0分");
    expect(formatTime(3660)).toBe("1時間1分");
    expect(formatTime(7200)).toBe("2時間0分");
    expect(formatTime(5400)).toBe("1時間30分");
  });
});

describe("formatTimeDetailed", () => {
  it("HH:MM:SS形式で表示", () => {
    expect(formatTimeDetailed(0)).toBe("00:00:00");
    expect(formatTimeDetailed(30)).toBe("00:00:30");
    expect(formatTimeDetailed(90)).toBe("00:01:30");
    expect(formatTimeDetailed(3661)).toBe("01:01:01");
    expect(formatTimeDetailed(36000)).toBe("10:00:00");
  });
});

describe("formatCount", () => {
  it("回数を正しくフォーマット", () => {
    expect(formatCount(0)).toBe("0回");
    expect(formatCount(1)).toBe("1回");
    expect(formatCount(100)).toBe("100回");
  });
});

describe("formatDate", () => {
  it("日付を月/日形式でフォーマット", () => {
    expect(formatDate("2024-01-15")).toBe("1/15");
    expect(formatDate("2024-12-25")).toBe("12/25");
  });
});

describe("getTodayString", () => {
  it("今日の日付をYYYY-MM-DD形式で返す", () => {
    const today = getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    
    const date = new Date();
    const expected = date.toISOString().split("T")[0];
    expect(today).toBe(expected);
  });
});

describe("generateId", () => {
  it("ユニークなIDを生成", () => {
    const id1 = generateId();
    const id2 = generateId();
    
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it("文字列を返す", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});
