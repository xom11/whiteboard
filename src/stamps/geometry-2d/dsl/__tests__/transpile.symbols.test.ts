// src/stamps/geometry-2d/dsl/__tests__/transpile.symbols.test.ts
import { buildSymbols } from '../transpile/symbols';
import { assignIds } from '../transpile/ids';
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

describe('assignIds', () => {
  it('points get p1, p2, ... in DSL order', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'C', kind: 'free', x: 2, y: 0 },
      ],
      shapes: [],
    };
    const { symbols } = buildSymbols(dsl);
    const ids = assignIds(symbols);
    expect(ids.get('A')).toBe('p1');
    expect(ids.get('B')).toBe('p2');
    expect(ids.get('C')).toBe('p3');
  });

  it('intersection gets i prefix', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'P', kind: 'intersection', ref1: 'AB', ref2: 'CD' },
      ],
      shapes: [
        { name: 'AB', kind: 'line', p1: 'A', p2: 'A' },
        { name: 'CD', kind: 'line', p1: 'A', p2: 'A' },
      ],
    };
    const { symbols } = buildSymbols(dsl);
    const ids = assignIds(symbols);
    expect(ids.get('A')).toBe('p1');
    expect(ids.get('P')).toBe('i1');
    expect(ids.get('AB')).toBe('l1');
    expect(ids.get('CD')).toBe('l2');
  });

  it('mixed prefixes count independently', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [{ name: 'A', kind: 'free', x: 0, y: 0 }],
      shapes: [
        { name: 'S', kind: 'segment', p1: 'A', p2: 'A' },
        { name: 'L', kind: 'line', p1: 'A', p2: 'A' },
        { name: 'R', kind: 'ray', origin: 'A', through: 'A' },
        { name: 'P', kind: 'polygon', vertices: ['A','A','A'] },
        { name: 'C', kind: 'circleCP', center: 'A', surfacePoint: 'A' },
      ],
    };
    const { symbols } = buildSymbols(dsl);
    const ids = assignIds(symbols);
    expect(ids.get('S')).toBe('s1');
    expect(ids.get('L')).toBe('l1');
    expect(ids.get('R')).toBe('r1');
    expect(ids.get('P')).toBe('poly1');
    expect(ids.get('C')).toBe('c1');
  });

  it('all line-constructions share "l" prefix counter', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [{ name: 'A', kind: 'free', x: 0, y: 0 }],
      shapes: [
        { name: 'L1', kind: 'line', p1: 'A', p2: 'A' },
        { name: 'L2', kind: 'perpendicular', throughPoint: 'A', toLine: 'L1' },
        { name: 'L3', kind: 'parallel', throughPoint: 'A', toLine: 'L1' },
      ],
    };
    const { symbols } = buildSymbols(dsl);
    const ids = assignIds(symbols);
    expect(ids.get('L1')).toBe('l1');
    expect(ids.get('L2')).toBe('l2');
    expect(ids.get('L3')).toBe('l3');
  });
});
