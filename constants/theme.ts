/**
 * 積み上げアプリのテーマカラー
 * オレンジベースで活力・成長を表現
 */

import { Platform } from "react-native";

// アクセントカラー
const accentLight = "#FF6B35";
const accentDark = "#FF8C5A";

export const Colors = {
  light: {
    text: "#1A1A2E",
    textSecondary: "#666666",
    textDisabled: "#AAAAAA",
    background: "#F8F9FA",
    card: "#FFFFFF",
    tint: accentLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: accentLight,
    border: "#E0E0E0",
    success: "#4CAF50",
    error: "#FF5252",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    textDisabled: "#666666",
    background: "#121212",
    card: "#1E1E1E",
    tint: accentDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: accentDark,
    border: "#333333",
    success: "#66BB6A",
    error: "#FF6B6B",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// スペーシング（8ptグリッド）
export const Spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

// 角丸
export const BorderRadius = {
  button: 12,
  card: 16,
  modal: 24,
};
