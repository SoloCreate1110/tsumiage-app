# 開発環境メモ（次プロジェクト用）

## OS / Shell
- OS: Windows
- Shell: PowerShell

## Node / Package Manager
- Node: v20.19.6
- pnpm: 9.12.0
- packageManager: pnpm@9.12.0（package.json）

## Expo / EAS
- Expo CLI: 54.0.19
- EAS CLI: 16.32.0
- Expo SDK: ~54.0.29
- 開発ビルド運用: EAS build（Android）

## 主要ライブラリ（抜粋）
- React: 19.1.0
- React Native: 0.81.5
- expo-router: ~6.0.19
- react-native-reanimated: ~4.1.1
- react-native-gesture-handler: ~2.28.0
- @react-native-async-storage/async-storage: ^2.1.2
- expo-notifications: ~0.32.9
- expo-av: ~16.0.8
- react-native-draggable-flatlist: ^4.0.3

## 開発コマンド
- Metro起動: `pnpm dev:metro`
- フル開発起動: `pnpm dev`

## ビルド（Android 開発ビルド）
- 初期化: `eas build:configure`
- ビルド: `eas build -p android --profile development`

## 参考: package.json の scripts
- dev: concurrentlyで server + metro
- dev:server: tsx watch
- dev:metro: expo start --web
- test: vitest
- lint: expo lint

## 注意点
- EASのクラウドビルドは「コミット済みのコード」だけ反映される
- Expo Goでは通知が使えないため、通知は開発ビルドで確認