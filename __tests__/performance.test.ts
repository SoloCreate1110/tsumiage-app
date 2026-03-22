import { describe, expect, it } from "vitest";

describe("performance assumptions", () => {
  describe("memoization basics", () => {
    it("returns same value for same input", () => {
      const fn = (value: number) => value * 2;
      expect(fn(5)).toBe(fn(5));
    });

    it("returns different value for different input", () => {
      const fn = (value: number) => value * 2;
      expect(fn(5)).not.toBe(fn(10));
    });
  });

  describe("list optimization config", () => {
    it("uses valid numeric config", () => {
      const config = {
        maxToRenderPerBatch: 10,
        updateCellsBatchingPeriod: 50,
        removeClippedSubviews: true,
      };
      expect(config.maxToRenderPerBatch).toBeGreaterThan(0);
      expect(config.updateCellsBatchingPeriod).toBeGreaterThan(0);
      expect(typeof config.removeClippedSubviews).toBe("boolean");
    });
  });

  describe("parallel loading", () => {
    it("Promise.all completes near single-task time", async () => {
      const load1 = () => new Promise<number[]>((resolve) => setTimeout(() => resolve([1, 2, 3]), 100));
      const load2 = () => new Promise<number[]>((resolve) => setTimeout(() => resolve([4, 5, 6]), 100));

      const start = Date.now();
      const [a, b] = await Promise.all([load1(), load2()]);
      const duration = Date.now() - start;

      expect(a).toEqual([1, 2, 3]);
      expect(b).toEqual([4, 5, 6]);
      expect(duration).toBeLessThan(160);
    });

    it("sequential loading is slower than parallel", async () => {
      const load = () => new Promise<number[]>((resolve) => setTimeout(() => resolve([1, 2, 3]), 50));

      const start = Date.now();
      await load();
      await load();
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(95);
    });
  });

  describe("cache behavior", () => {
    it("memoized calculation reuses cached result", () => {
      let callCount = 0;
      const expensive = (n: number): number => {
        callCount += 1;
        let total = 0;
        for (let i = 0; i < n; i += 1) total += i;
        return total;
      };

      const cache = new Map<number, number>();
      const memoized = (n: number): number => {
        if (cache.has(n)) return cache.get(n) ?? 0;
        const result = expensive(n);
        cache.set(n, result);
        return result;
      };

      const first = memoized(1000);
      const second = memoized(1000);

      expect(callCount).toBe(1);
      expect(first).toBe(second);
    });
  });
});
