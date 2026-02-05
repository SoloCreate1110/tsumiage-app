/**
 * 積み上げレベル（称号）定義
 */

import { StackType } from "@/types/stack";

export interface Level {
    threshold: number; // 到達に必要な値（秒または回数）
    title: string;     // 称号名
    color: string;     // バッジカラー
}

// 時間タイプ用のレベル定義 (秒単位)
export const TIME_LEVELS: Level[] = [
    { threshold: 0, title: "🐣 見習い", color: "#BDBDBD" },        // 0時間
    { threshold: 3 * 3600, title: "🐥 駆け出し", color: "#81C784" }, // 3時間
    { threshold: 10 * 3600, title: "🧑‍💻 一人前", color: "#4CAF50" },  // 10時間
    { threshold: 50 * 3600, title: "⚔️ 熟練者", color: "#2196F3" },  // 50時間
    { threshold: 100 * 3600, title: "👑 達人", color: "#FF9800" },   // 100時間
    { threshold: 500 * 3600, title: "🦄 伝説", color: "#9C27B0" },   // 500時間
];

// 回数タイプ用のレベル定義
export const COUNT_LEVELS: Level[] = [
    { threshold: 0, title: "🐣 見習い", color: "#BDBDBD" },
    { threshold: 10, title: "🐥 駆け出し", color: "#81C784" },
    { threshold: 50, title: "🧑‍💻 一人前", color: "#4CAF50" },
    { threshold: 100, title: "⚔️ 熟練者", color: "#2196F3" },
    { threshold: 500, title: "👑 達人", color: "#FF9800" },
    { threshold: 1000, title: "🦄 伝説", color: "#9C27B0" },
];

// 現在のレベル情報を取得する関数
export function getLevelInfo(type: StackType, totalValue: number) {
    const levels = type === "time" ? TIME_LEVELS : COUNT_LEVELS;

    // 現在達成している最高レベルを探す
    let currentLevel = levels[0];
    let nextLevel = levels[1] || null;

    for (let i = 0; i < levels.length; i++) {
        if (totalValue >= levels[i].threshold) {
            currentLevel = levels[i];
            nextLevel = levels[i + 1] || null;
        } else {
            break;
        }
    }

    return {
        current: currentLevel,
        next: nextLevel,
        progress: nextLevel
            ? Math.min(100, Math.max(0, ((totalValue - currentLevel.threshold) / (nextLevel.threshold - currentLevel.threshold)) * 100))
            : 100, // 最高レベル到達時は100%
    };
}
