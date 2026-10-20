# 開発環境

## 現在の構成（2026-10-20）

- Expo SDK: 57（expo 57.0.30）。Expo GoもSDK 57対応版を使用する。
- React: 19.2.3、React Native: 0.86.3、TypeScript: 6.0.3。
- 音声再生: expo-audio。画面遷移の共有APIはexpo-router経由で利用する。
- 今回の検証環境: macOS、Node 24.19.0、pnpm 11.25.0。
- package.jsonのpackageManagerは従来のpnpm 9.12.0指定を維持。pnpm 11ではpnpm-workspace.yamlでビルドスクリプトの実行を許可する。

## 開発コマンド

- 依存導入: `pnpm install --frozen-lockfile`
- Expo Goでの操作テスト（開発モード無効・軽量化）: `pnpm exec expo start --go --tunnel --port 8082 --no-dev --minify`
- Fast Refreshを使う開発: `pnpm exec expo start --go --tunnel --port 8082`
- 型チェック: `pnpm check`
- テスト: `pnpm test`
- Android向け書き出し: `pnpm exec expo export --platform android`

Expo Goでは独自Android通知モジュールを検証できない。SDK 54で作成した既存の開発ビルドはSDK 57のコード配信に使用できず、専用ビルドの再作成が必要。クラウドビルドはRELEASE.mdの手順に従う。
