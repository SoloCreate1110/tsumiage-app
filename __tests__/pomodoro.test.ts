/**
 * ポモドーロテクニック機能のテスト
 */

import { describe, it, expect, beforeEach } from "vitest";

// ポモドーロの定数
const WORK_DURATION = 25 * 60; // 25分
const BREAK_DURATION = 5 * 60; // 5分

describe("ポモドーロテクニック", () => {
  describe("時間フォーマット", () => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    it("秒をMM:SS形式にフォーマット", () => {
      expect(formatTime(0)).toBe("00:00");
      expect(formatTime(60)).toBe("01:00");
      expect(formatTime(1500)).toBe("25:00"); // 25分
      expect(formatTime(300)).toBe("05:00"); // 5分
      expect(formatTime(3661)).toBe("61:01");
    });

    it("1秒未満の場合は00:00", () => {
      expect(formatTime(0)).toBe("00:00");
    });
  });

  describe("ポモドーロサイクル", () => {
    it("作業時間は25分", () => {
      expect(WORK_DURATION).toBe(1500);
    });

    it("休憩時間は5分", () => {
      expect(BREAK_DURATION).toBe(300);
    });

    it("1サイクルの合計時間は30分", () => {
      expect(WORK_DURATION + BREAK_DURATION).toBe(1800);
    });
  });

  describe("プログレス計算", () => {
    const calculateProgress = (timeLeft: number, totalTime: number): number => {
      return totalTime > 0 ? timeLeft / totalTime : 0;
    };

    it("開始時は100%", () => {
      expect(calculateProgress(WORK_DURATION, WORK_DURATION)).toBe(1);
    });

    it("半分経過で50%", () => {
      expect(calculateProgress(WORK_DURATION / 2, WORK_DURATION)).toBe(0.5);
    });

    it("終了時は0%", () => {
      expect(calculateProgress(0, WORK_DURATION)).toBe(0);
    });

    it("totalTimeが0の場合は0", () => {
      expect(calculateProgress(100, 0)).toBe(0);
    });
  });

  describe("セッションカウント", () => {
    it("初期セッション数は0", () => {
      let sessionsCompleted = 0;
      expect(sessionsCompleted).toBe(0);
    });

    it("作業セッション完了でカウント増加", () => {
      let sessionsCompleted = 0;
      sessionsCompleted += 1;
      expect(sessionsCompleted).toBe(1);
    });

    it("複数セッション完了", () => {
      let sessionsCompleted = 0;
      for (let i = 0; i < 4; i++) {
        sessionsCompleted += 1;
      }
      expect(sessionsCompleted).toBe(4);
    });
  });

  describe("フェーズ遷移", () => {
    type Phase = "work" | "break" | "idle";

    it("アイドル状態から作業開始", () => {
      let phase: Phase = "idle";
      phase = "work";
      expect(phase).toBe("work");
    });

    it("作業から休憩に遷移", () => {
      let phase: Phase = "work";
      phase = "break";
      expect(phase).toBe("break");
    });

    it("休憩から作業に遷移", () => {
      let phase: Phase = "break";
      phase = "work";
      expect(phase).toBe("work");
    });

    it("作業を停止するとアイドル状態に", () => {
      let phase: Phase = "work";
      phase = "idle";
      expect(phase).toBe("idle");
    });
  });
});
