// disjointOffset.test.ts
import { layoutDisjointComponents } from '../disjointOffset';
import type { DslPointT, DslShapeT } from '../../../dsl/schema';

const byName = (ps: DslPointT[], n: string) =>
  ps.find((p) => p.name === n) as Extract<DslPointT, { kind: 'free' }>;

describe('layoutDisjointComponents', () => {
  test('2 polygon rời → dịch comp thứ 2 sang phải, x-interval rời', () => {
    const points: DslPointT[] = [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 5, y: 0 },
      { name: 'C', kind: 'free', x: 2, y: 3 },
      { name: 'D', kind: 'free', x: 0, y: 0 },
      { name: 'E', kind: 'free', x: 4, y: 0 },
      { name: 'F', kind: 'free', x: 4, y: 4 },
      { name: 'G', kind: 'free', x: 0, y: 4 },
    ];
    const shapes: DslShapeT[] = [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'DEFG', kind: 'polygon', vertices: ['D', 'E', 'F', 'G'] },
    ];
    layoutDisjointComponents(points, shapes);
    expect([byName(points, 'A').x, byName(points, 'A').y]).toEqual([0, 0]);
    expect(byName(points, 'B').x).toBe(5);
    expect([byName(points, 'D').x, byName(points, 'D').y]).toEqual([7, 0]);
    expect(byName(points, 'E').x).toBe(11);
    expect(byName(points, 'G').x).toBe(7);
    expect(5).toBeLessThan(7);
  });

  test('1 polygon → no-op (byte-identical)', () => {
    const points: DslPointT[] = [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 5, y: 0 },
      { name: 'C', kind: 'free', x: 2, y: 3 },
    ];
    const shapes: DslShapeT[] = [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }];
    const before = JSON.parse(JSON.stringify(points));
    layoutDisjointComponents(points, shapes);
    expect(points).toEqual(before);
  });

  test('midpoint M của BC → cùng component ABC → no-op (chống false-positive)', () => {
    const points: DslPointT[] = [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 5, y: 0 },
      { name: 'C', kind: 'free', x: 2, y: 3 },
      { name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' },
    ];
    const shapes: DslShapeT[] = [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }];
    const before = JSON.parse(JSON.stringify(points));
    layoutDisjointComponents(points, shapes);
    expect(points).toEqual(before);
  });

  test('2 đường tròn circleCR (R=2, R=5) tâm free → bbox circle-aware tách đủ', () => {
    const points: DslPointT[] = [
      { name: 'I', kind: 'free', x: 0, y: 0 },
      { name: 'O', kind: 'free', x: 0, y: 0 },
    ];
    const shapes: DslShapeT[] = [
      { name: 'cI', kind: 'circleCR', center: 'I', radius: 2 },
      { name: 'cO', kind: 'circleCR', center: 'O', radius: 5 },
    ];
    layoutDisjointComponents(points, shapes);
    expect(byName(points, 'I').x).toBe(0);
    expect(byName(points, 'O').x).toBe(9);
    expect(Math.abs(byName(points, 'O').x - byName(points, 'I').x)).toBeGreaterThan(2 + 5);
  });

  test('0 free point → no-op an toàn', () => {
    const points: DslPointT[] = [];
    const shapes: DslShapeT[] = [];
    expect(() => layoutDisjointComponents(points, shapes)).not.toThrow();
    expect(points).toEqual([]);
  });
});
