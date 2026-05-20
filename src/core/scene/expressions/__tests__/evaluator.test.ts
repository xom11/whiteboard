// src/core/scene/expressions/__tests__/evaluator.test.ts
import { scanRoots, scanExtrema } from '../evaluator';

describe('expressions/evaluator', () => {
  describe('scanRoots', () => {
    it('finds root of x → 0', () => {
      const roots = scanRoots((x) => x, -10, 10);
      expect(roots.length).toBe(1);
      expect(roots[0]).toBeCloseTo(0, 3);
    });

    it('finds two roots of x^2-4 → ±2', () => {
      const roots = scanRoots((x) => x * x - 4, -10, 10);
      expect(roots.length).toBe(2);
      expect(roots[0]).toBeCloseTo(-2, 3);
      expect(roots[1]).toBeCloseTo(2, 3);
    });

    it('no roots cho x^2+1', () => {
      const roots = scanRoots((x) => x * x + 1, -10, 10);
      expect(roots).toEqual([]);
    });

    it('handles NaN gracefully', () => {
      const roots = scanRoots((x) => (x === 0 ? NaN : x), -10, 10);
      expect(Array.isArray(roots)).toBe(true);
    });
  });

  describe('scanExtrema', () => {
    it('finds min of x^2 → x=0,y=0', () => {
      const extrema = scanExtrema((x) => x * x, -10, 10);
      const min = extrema.find((e) => e.type === 'min');
      expect(min).toBeDefined();
      expect(min!.x).toBeCloseTo(0, 2);
      expect(min!.y).toBeCloseTo(0, 2);
    });

    it('finds max of -x^2 → x=0,y=0', () => {
      const extrema = scanExtrema((x) => -x * x, -10, 10);
      const max = extrema.find((e) => e.type === 'max');
      expect(max).toBeDefined();
      expect(max!.x).toBeCloseTo(0, 2);
    });

    it('monotone function returns []', () => {
      const extrema = scanExtrema((x) => x, -10, 10);
      expect(extrema).toEqual([]);
    });
  });
});
