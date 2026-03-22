import { describe, expect, it } from "vitest";
import {
  formatTime,
  formatTimeDetailed,
  formatCount,
  formatDate,
  getTodayString,
  generateId,
} from "../types/stack";

describe("formatTime", () => {
  it("formats seconds only", () => {
    expect(formatTime(30)).toBe("30\u79d2");
    expect(formatTime(0)).toBe("0\u79d2");
  });

  it("formats minutes", () => {
    expect(formatTime(60)).toBe("1\u52060\u79d2");
    expect(formatTime(90)).toBe("1\u520630\u79d2");
    expect(formatTime(300)).toBe("5\u52060\u79d2");
  });

  it("formats hours and minutes", () => {
    expect(formatTime(3600)).toBe("1\u6642\u95930\u5206");
    expect(formatTime(3660)).toBe("1\u6642\u95931\u5206");
    expect(formatTime(7200)).toBe("2\u6642\u95930\u5206");
    expect(formatTime(5400)).toBe("1\u6642\u959330\u5206");
  });
});

describe("formatTimeDetailed", () => {
  it("formats as HH:MM:SS", () => {
    expect(formatTimeDetailed(0)).toBe("00:00:00");
    expect(formatTimeDetailed(30)).toBe("00:00:30");
    expect(formatTimeDetailed(90)).toBe("00:01:30");
    expect(formatTimeDetailed(3661)).toBe("01:01:01");
    expect(formatTimeDetailed(36000)).toBe("10:00:00");
  });
});

describe("formatCount", () => {
  it("formats count with unit", () => {
    expect(formatCount(0)).toBe("0\u56de");
    expect(formatCount(1)).toBe("1\u56de");
    expect(formatCount(100)).toBe("100\u56de");
  });
});

describe("formatDate", () => {
  it("formats YYYY-MM-DD to M月D日", () => {
    expect(formatDate("2024-01-15")).toBe("1\u670815\u65e5");
    expect(formatDate("2024-12-25")).toBe("12\u670825\u65e5");
  });
});

describe("getTodayString", () => {
  it("returns YYYY-MM-DD", () => {
    const today = getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const date = new Date();
    const expected = date.toISOString().split("T")[0];
    expect(today).toBe(expected);
  });
});

describe("generateId", () => {
  it("returns unique ids", () => {
    const id1 = generateId();
    const id2 = generateId();

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it("returns a non-empty string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});
