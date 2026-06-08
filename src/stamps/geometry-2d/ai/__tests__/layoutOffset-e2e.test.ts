// layoutOffset-e2e.test.ts
// e2e: offset chạy bên trong intentsToDsl. Đề ≥2 hình rời → bbox disjoint (số học);
// đề 1 component → coords canonical KHÔNG đổi (bất biến).
import { intentsToDsl } from '../intentToDsl';
import type { IntentT } from '../intent';

const coord = (dsl: ReturnType<typeof intentsToDsl>, n: string) => {
  const p = dsl.points.find((pt) => pt.name === n);
  if (!p || p.kind !== 'free') throw new Error('không phải free point: ' + n);
  return { x: p.x, y: p.y };
};
const bbox = (dsl: ReturnType<typeof intentsToDsl>, ns: string[]) => {
  const cs = ns.map((n) => coord(dsl, n));
  return {
    minX: Math.min(...cs.map((c) => c.x)), maxX: Math.max(...cs.map((c) => c.x)),
    minY: Math.min(...cs.map((c) => c.y)), maxY: Math.max(...cs.map((c) => c.y)),
  };
};

describe('layout disjoint offset — e2e qua intentsToDsl', () => {
  test('tam giác ABC + hình vuông DEFG → bbox x-interval rời', () => {
    const intents = [
      { op: 'draw-shape', shape: 'triangle', variant: 'any', labels: ['A', 'B', 'C'] },
      { op: 'draw-shape', shape: 'square', variant: 'standard', labels: ['D', 'E', 'F', 'G'] },
    ] as unknown as IntentT[];
    const dsl = intentsToDsl(intents);
    const t = bbox(dsl, ['A', 'B', 'C']);
    const s = bbox(dsl, ['D', 'E', 'F', 'G']);
    const xDisjoint = t.maxX < s.minX || s.maxX < t.minX;
    expect(xDisjoint).toBe(true);
  });

  test('1 component (tam giác) → coords canonical KHÔNG đổi', () => {
    const intents = [
      { op: 'draw-shape', shape: 'triangle', variant: 'any', labels: ['A', 'B', 'C'] },
    ] as unknown as IntentT[];
    const dsl = intentsToDsl(intents);
    expect(coord(dsl, 'A')).toEqual({ x: 0, y: 0 });
    expect(coord(dsl, 'B')).toEqual({ x: 5, y: 0 });
    expect(coord(dsl, 'C')).toEqual({ x: 2, y: 3 });
  });
});
