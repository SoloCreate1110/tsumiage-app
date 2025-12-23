/**
 * 積み上げアプリのデータ型定義
 */

// 積み上げ項目の種類
export type StackType = 'time' | 'count';

// 積み上げ項目
export interface StackItem {
  id: string;
  name: string;
  type: StackType;
  icon: string;
  color: string;
  totalValue: number; // 秒（時間タイプ）または回数（カウントタイプ）
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
