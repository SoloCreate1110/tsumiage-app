/**
 * Shared types and helpers for stack items/records.
 */

// Stack item type
export type StackType = "time" | "count";

// Goal period (legacy)
export type GoalPeriod = "daily" | "weekly" | "monthly";

// Goal (single target + deadline)
export interface Goal {
  target?: number; // total target value (seconds or count)
  deadline?: string; // YYYY-MM-DD
  startTotal?: number; // total value at the time of setting goal
  startDate?: string; // YYYY-MM-DD
}

// Stack item
export interface StackItem {
  id: string;
  name: string;
  type: StackType;
  icon: string;
  color: string;
  totalValue: number;
  goal?: Goal;
  createdAt: string;
  updatedAt: string;
  order?: number; // 並び順
}

// Record
export interface StackRecord {
  id: string;
  itemId: string;
  value: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

// Icon options
export const ICON_OPTIONS = [
  { name: "clock.fill", label: "時間" },
  { name: "number", label: "回数" },
  { name: "checkmark.circle.fill", label: "チェック" },
  { name: "pencil", label: "メモ" },
  { name: "house.fill", label: "家" },
  { name: "chart.bar.fill", label: "グラフ" },
] as const;

// Color options
export const COLOR_OPTIONS = [
  "#FF6B35",
  "#4CAF50",
  "#2196F3",
  "#9C27B0",
  "#F44336",
  "#FF9800",
  "#00BCD4",
  "#795548",
] as const;

// Format seconds to h/m/s
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  }
  return `${secs}秒`;
}

// Format seconds to HH:MM:SS
export function formatTimeDetailed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

// Format count
export function formatCount(count: number): string {
  return `${count}回`;
}

// Format date label (MM/DD)
export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const normalized = dateString.includes("/") ? dateString.replace(/\//g, "-") : dateString;
  const parts = normalized.split("-");
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!Number.isNaN(month) && !Number.isNaN(day)) {
    return `${month}月${day}日`;
  }
  const parsed = new Date(dateString);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getMonth() + 1}月${parsed.getDate()}日`;
  }
  return dateString;
}

// Today string with cutoff hour (default 6:00)
export function getTodayString(cutoffHour: number = 6): string {
  return toDateString(getTodayDate(cutoffHour));
}

// Today date with cutoff hour (default 6:00)
export function getTodayDate(cutoffHour: number = 6): Date {
  const now = new Date();
  const local = new Date(now);
  if (local.getHours() < cutoffHour) {
    local.setDate(local.getDate() - 1);
  }
  local.setHours(0, 0, 0, 0);
  return local;
}

// Date -> YYYY-MM-DD
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// UUID-ish
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Progress percentage
export function calculateGoalProgress(currentValue: number, goalValue: number | undefined): number {
  if (!goalValue || goalValue === 0) return 0;
  return Math.min(Math.round((currentValue / goalValue) * 100), 100);
}

// Week start (Mon)
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Month start
export function getMonthStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Period total
export function calculatePeriodTotal(
  records: StackRecord[],
  itemId: string,
  period: GoalPeriod
): number {
  const now = getTodayDate();
  let startDate: Date;

  switch (period) {
    case "daily":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "weekly":
      startDate = getWeekStart(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      startDate = getMonthStart(now);
      startDate.setHours(0, 0, 0, 0);
      break;
  }

  const startDateStr = toDateString(startDate);

  return records
    .filter((r) => r.itemId === itemId && r.date >= startDateStr)
    .reduce((sum, r) => sum + r.value, 0);
}

// Days remaining to target date
export function calculateDaysRemaining(targetDate: string): number {
  const target = new Date(targetDate);
  const today = getTodayDate();
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
