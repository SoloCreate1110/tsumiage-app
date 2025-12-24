/**
 * 積み上げアプリのデータ型定義
 */

// 積み上げ項目の種類
export type StackType = 'time' | 'count';

// 目標期間の種類
export type GoalPeriod = 'daily' | 'weekly' | 'monthly';

// 目標設定
export interface Goal {
  daily?: number;   // 日次目標
  weekly?: number;  // 週次目標
  monthly?: number; // 月次目標
}

// 積み上げ項目
export interface StackItem {
  id: string;
  name: string;
  type: StackType;
  icon: string;
  color: string;
  totalValue: number; // 秒（時間タイプ）または回数（カウントタイプ）
  goal?: Goal;        // 目標設定（オプショナル）
  createdAt: string;
  updatedAt: string;
}

// 積み上げ記録
export interface StackRecord {
  id: string;
  itemId: string;
  value: number; // 秒または回数
  date: string; // YYYY-MM-DD形式
  createdAt: string;
}

// アイコン選択肢
export const ICON_OPTIONS = [
  { name: 'clock.fill', label: '時計' },
  { name: 'number', label: '数字' },
  { name: 'checkmark.circle.fill', label: 'チェック' },
  { name: 'pencil', label: '鉛筆' },
  { name: 'house.fill', label: '家' },
  { name: 'chart.bar.fill', label: 'グラフ' },
] as const;

// カラー選択肢
export const COLOR_OPTIONS = [
  '#FF6B35', // オレンジ（デフォルト）
  '#4CAF50', // グリーン
  '#2196F3', // ブルー
  '#9C27B0', // パープル
  '#F44336', // レッド
  '#FF9800', // アンバー
  '#00BCD4', // シアン
  '#795548', // ブラウン
] as const;

// 時間フォーマット用ヘルパー
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

// 時間フォーマット（詳細表示用）
export function formatTimeDetailed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

// 回数フォーマット
export function formatCount(count: number): string {
  return `${count}回`;
}

// 日付フォーマット
export function formatDate(dateString: string): string {
  // YYYY-MM-DD形式の文字列をパース（タイムゾーンの影響を避ける）
  const parts = dateString.split('-');
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return `${month}/${day}`;
}

// 今日の日付を取得（YYYY-MM-DD形式）
export function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// UUID生成
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 目標達成率を計算（0-100%）
export function calculateGoalProgress(currentValue: number, goalValue: number | undefined): number {
  if (!goalValue || goalValue === 0) return 0;
  return Math.min(Math.round((currentValue / goalValue) * 100), 100);
}

// 週の開始日（月曜日）を取得
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を週の開始とする
  return new Date(d.setDate(diff));
}

// 月の開始日を取得
export function getMonthStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// 指定期間の記録合計を計算
export function calculatePeriodTotal(
  records: StackRecord[],
  itemId: string,
  period: GoalPeriod
): number {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'daily':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'weekly':
      startDate = getWeekStart(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      startDate = getMonthStart(now);
      startDate.setHours(0, 0, 0, 0);
      break;
  }

  const startDateStr = startDate.toISOString().split('T')[0];

  return records
    .filter((r) => r.itemId === itemId && r.date >= startDateStr)
    .reduce((sum, r) => sum + r.value, 0);
}
