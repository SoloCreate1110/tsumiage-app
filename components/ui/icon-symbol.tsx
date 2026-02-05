// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  // 積み上げアプリ用アイコン
  "chart.bar.fill": "bar-chart",
  "gearshape.fill": "settings",
  "plus": "add",
  "play.fill": "play-arrow",
  "stop.fill": "stop",
  "pause.fill": "pause",
  "plus.circle.fill": "add-circle",
  "minus.circle.fill": "remove-circle",
  "trash.fill": "delete",
  "pencil": "edit",
  "clock.fill": "access-time",
  "number": "tag",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "arrow.left": "arrow-back",
  "calendar": "calendar-today",
  "chevron.up": "keyboard-arrow-up",
  "chevron.down": "keyboard-arrow-down",
  "flame.fill": "local-fire-department",
  "square.and.arrow.up": "share",
  "quote.bubble": "format-quote",
  // 新規追加アイコン
  "book.fill": "menu-book",
  "desktopcomputer": "desktop-mac",
  "briefcase.fill": "work",
  "figure.run": "directions-run",
  "figure.walk": "directions-walk",
  "bicycle": "directions-bike",
  "dumbbell.fill": "fitness-center",
  "bed.double.fill": "hotel",
  "cart.fill": "shopping-cart",
  "car.fill": "directions-car",
  "pawprint.fill": "pets",
  "gamecontroller.fill": "videogame-asset",
  "music.note": "music-note",
  "camera.fill": "camera-alt",
  "paintbrush.fill": "brush",
  "banknote.fill": "attach-money",
  "leaf.fill": "eco",
  "sun.max.fill": "wb-sunny",
  "moon.fill": "nightlight-round",
} as Partial<IconMapping>;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
