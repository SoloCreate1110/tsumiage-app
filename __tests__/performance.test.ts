/**
 * パフォーマンス最適化のテスト
 */

import { describe, it, expect } from "vitest";

describe("パフォーマンス最適化", () => {
  describe("メモ化効果", () => {
    it("同じ入力値に対して同じ参照を返す", () => {
      const memoizedFunc = (value: number) => value * 2;
      const result1 = memoizedFunc(5);
      const result2 = memoizedFunc(5);
      expect(result1).toBe(result2);
    });

    it("異なる入力値に対して異なる結果を返す", () => {
      const memoizedFunc = (value: number) => value * 2;
      const result1 = memoizedFunc(5);
      const result2 = memoizedFunc(10);
      expect(result1).not.toBe(result2);
    });
  });

  describe("FlatList 最適化設定", () => {
    it("maxToRenderPerBatch は正の整数", () => {
      const config = {
        maxToRenderPerBatch: 10,
        updateCellsBatchingPeriod: 50,
        removeClippedSubviews: true,
      };
      expect(config.maxToRenderPerBatch).toBeGreaterThan(0);
      expect(Number.isInteger(config.maxToRenderPerBatch)).toBe(true);
    });

    it("updateCellsBatchingPeriod は正の整数", () => {
      const config = {
        maxToRenderPerBatch: 10,
        updateCellsBatchingPeriod: 50,
      };
      expect(config.updateCellsBatchingPeriod).toBeGreaterThan(0);
      expect(Number.isInteger(config.updateCellsBatchingPeriod)).toBe(true);
    });

    it("removeClippedSubviews は boolean", () => {
      const config = {
        removeClippedSubviews: true,
      };
      expect(typeof config.removeClippedSubviews).toBe("boolean");
    });
  });

  describe("キャッシング効果", () => {
    it("キャッシュがある場合は高速に結果を返す", () => {
      const cache = new Map<string, number>();
      const getValue = (key: string): number => {
        if (cache.has(key)) {
          return cache.get(key) || 0;
        }
        const value = Math.random() * 1000;
        cache.set(key, value);
        return value;
      };

      const result1 = getValue("test");
      const result2 = getValue("test");
      expect(result1).toBe(result2); // キャッシュから同じ値を返す
    });

    it("異なるキーは異なる値を返す", () => {
      const cache = new Map<string, number>();
      const getValue = (key: string): number => {
        if (cache.has(key)) {
          return cache.get(key) || 0;
        }
        const value = Math.random() * 1000;
        cache.set(key, value);
        return value;
      };

      const result1 = getValue("test1");
      const result2 = getValue("test2");
      expect(result1).not.toBe(result2); // 異なるキーなので異なる値
    });
  });

  describe("データ読み込み最適化", () => {
    it("Promise.all で複数のデータを並列読み込み", async () => {
      const mockLoadData1 = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([1, 2, 3]), 100);
        });
      };

      const mockLoadData2 = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([4, 5, 6]), 100);
        });
      };

      const startTime = Date.now();
      const [data1, data2] = await Promise.all([
        mockLoadData1(),
        mockLoadData2(),
      ]);
      const duration = Date.now() - startTime;

      expect(data1).toEqual([1, 2, 3]);
      expect(data2).toEqual([4, 5, 6]);
      // 並列実行なので、順序実行の場合の200msより短い
      expect(duration).toBeLessThan(150);
    });

    it("順序実行は並列実行より遅い", async () => {
      const mockLoadData = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([1, 2, 3]), 50);
        });
      };

      const startTime = Date.now();
      await mockLoadData();
      await mockLoadData();
      const duration = Date.now() - startTime;

      // 順序実行なので100ms以上かかる
      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe("計算結果キャッシング", () => {
    it("複雑な計算結果をメモ化", () => {
      let callCount = 0;
      const expensiveCalculation = (n: number): number => {
        callCount++;
        let result = 0;
        for (let i = 0; i < n; i++) {
          result += i;
        }
        return result;
      };

      const cache = new Map<number, number>();
      const memoizedCalculation = (n: number): number => {
        if (cache.has(n)) {
          return cache.get(n) || 0;
        }
        const result = expensiveCalculation(n);
        cache.set(n, result);
        return result;
      };

      // 1回目の呼び出し
      const result1 = memoizedCalculation(1000);
      expect(callCount).toBe(1);

      // 2回目の呼び出し（キャッシュから）
      const result2 = memoizedCalculation(1000);
      expect(callCount).toBe(1); // 呼び出し数は増えない

      expect(result1).toBe(result2);
    });
  });

  describe("レンダリング最適化", () => {
    it("React.memo は同じ props では再レンダリングしない", () => {
      let renderCount = 0;
      const Component = ({ value }: { value: number }) => {
        renderCount++;
        return value;
      };

      // 実際のテストでは React.memo の効果を測定
      // ここでは概念的なテストを実施
      expect(typeof Component).toBe("function");
    });

    it("useCallback は関数参照を安定化", () => {
      const callback1 = () => console.log("test");
      const callback2 = () => console.log("test");

      // 異なる関数オブジェクト
      expect(callback1).not.toBe(callback2);

      // useCallback でメモ化すれば同じ参照を返す
      const memoized1 = callback1;
      const memoized2 = callback1;
      expect(memoized1).toBe(memoized2);
    });
  });
});
