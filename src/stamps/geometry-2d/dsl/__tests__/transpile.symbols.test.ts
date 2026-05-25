// src/stamps/geometry-2d/dsl/__tests__/transpile.symbols.test.ts
import { buildSymbols } from '../transpile/symbols';
import type { DslInputT } from '../schema';

const A = { name: 'A', kind: 'free', x: 0, y: 0 } as const;
const B = { name: 'B', kind: 'free', x: 1, y: 0 } as const;
const M = { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' } as const;

describe('buildSymbols', () => {
  it('empty input → empty map + no errors', () => {
    const dsl: DslInputT = { version: 1, points: [], shapes: [] };
    const r = buildSymbols(dsl);
    expect(r.errors).toEqual([]);
    expect(r.symbols.size).toBe(0);
  });

  it('builds map keyed by name across points + shapes', () => {
    const seg = { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' } as const;
    const dsl: DslInputT = { version: 1, points: [A, B], shapes: [seg] };
    const r = buildSymbols(dsl);
    expect(r.errors).toEqual([]);
    expect(r.symbols.size).toBe(3);
    expect(r.symbols.get('A')?.entity).toEqual(A);
    expect(r.symbols.get('A')?.role).toBe('point');
    expect(r.symbols.get('AB')?.role).toBe('shape');
  });

  it('detects duplicate name across point + shape', () => {
    const dup = { name: 'A', kind: 'segment', p1: 'A', p2: 'B' } as const;
    const dsl: DslInputT = { version: 1, points: [A, B], shapes: [dup] };
    const r = buildSymbols(dsl);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].code).toBe('DUPLICATE_NAME');
    expect(r.errors[0].path).toEqual(['A']);
  });

  it('detects duplicate name within points list', () => {
    const dup = { name: 'A', kind: 'free', x: 5, y: 5 } as const;
    const dsl: DslInputT = { version: 1, points: [A, dup], shapes: [] };
    const r = buildSymbols(dsl);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].code).toBe('DUPLICATE_NAME');
  });

  it('still emits symbols map for non-duplicate entries when duplicates exist', () => {
    const dup = { name: 'A', kind: 'free', x: 5, y: 5 } as const;
    const dsl: DslInputT = { version: 1, points: [A, B, dup], shapes: [] };
    const r = buildSymbols(dsl);
    expect(r.symbols.has('B')).toBe(true);
  });
});
