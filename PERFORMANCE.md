# パフォーマンス最適化ガイド

## 実施した最適化

### 1. コンポーネント最適化

#### StackItemCard コンポーネント
- **React.memo でメモ化**: 親コンポーネントの再レンダリング時に、props が変わらなければ再レンダリングされない
- **効果**: リスト項目が多い場合、不要なレンダリングが大幅に削減される

### 2. ホーム画面最適化

#### useCallback による関数メモ化
- `handleAddItem` と `handleItemPress` を useCallback でメモ化
- 子コンポーネントへの参照が安定し、不要な再レンダリングを防止

#### FlatList パフォーマンス設定
```tsx
<FlatList
  removeClippedSubviews={true}      // 画面外の要素をメモリから削除
  maxToRenderPerBatch={10}          // 一度に描画する最大アイテム数
  updateCellsBatchingPeriod={50}    // バッチ更新の間隔（ミリ秒）
/>
```

#### getTodayValue メモ化
- useCallback で計算結果をキャッシング
- 同じ itemId への複数回のアクセスを効率化

### 3. AsyncStorage 最適化

#### 並列読み込み
```typescript
const [itemsData, recordsData] = await Promise.all([
  AsyncStorage.getItem(ITEMS_KEY),
  AsyncStorage.getItem(RECORDS_KEY),
]);
```
- 2つのデータを同時に読み込み、読み込み時間を短縮

### 4. 統計画面最適化

#### useMemo による計算結果キャッシング
- `stats` 計算: items と records が変わらなければ再計算されない
- `chartData` 計算: グラフデータの生成は重い処理のため、キャッシング効果が大きい

## パフォーマンス測定

### 計測方法
```javascript
// React Native Debugger で Performance タブを使用
// または、console.time/console.timeEnd を使用

console.time('getTodayValue');
const value = getTodayValue(itemId);
console.timeEnd('getTodayValue');
```

## 推奨事項

### さらなる最適化が必要な場合

1. **仮想化リスト** (100+ アイテムの場合)
   - `FlashList` ライブラリの導入を検討
   - より効率的なスクロール性能

2. **データベース** (1000+ レコードの場合)
   - SQLite や Realm の導入
   - AsyncStorage よりも高速なクエリ処理

3. **バンドルサイズ削減**
   - 不要な依存関係の削除
   - Tree-shaking の確認

4. **画像最適化**
   - WebP フォーマットの使用
   - 適切なサイズでの画像配信

## チェックリスト

- [x] コンポーネントメモ化
- [x] useCallback による関数メモ化
- [x] FlatList パフォーマンス設定
- [x] AsyncStorage 並列読み込み
- [x] useMemo による計算結果キャッシング
- [ ] 仮想化リスト導入 (必要に応じて)
- [ ] データベース導入 (必要に応じて)
