// src/stamps/geometry-2d/dsl/__tests__/transpile.cycles.test.ts
import { detectCycles } from '../transpile/cycles';
import { buildSymbols } from '../transpile/symbols';
import type { DslInputT } from '../schema';

function check(dsl: DslInputT) {
  const { symbols } = buildSymbols(dsl);
  return detectCycles(symbols);
}

describe('detectCycles', () => {
  it('no cycle → empty errors', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' },
      ],
      shapes: [],
    };
    expect(check(dsl).errors).toEqual([]);
  });

  it('self-cycle detected', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        // M depends on itself
        { name: 'M', kind: 'midpoint', p1: 'M', p2: 'A' },
      ],
      shapes: [],
    };
    const r = check(dsl);
    expect(r.errors.some((e) => e.code === 'CYCLE')).toBe(true);
  });

  it('2-cycle detected', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'M', kind: 'midpoint', p1: 'N', p2: 'N' },
        { name: 'N', kind: 'midpoint', p1: 'M', p2: 'M' },
      ],
      shapes: [],
    };
    expect(check(dsl).errors.some((e) => e.code === 'CYCLE')).toBe(true);
  });

  it('3-cycle detected', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'X', kind: 'midpoint', p1: 'Y', p2: 'Y' },
        { name: 'Y', kind: 'midpoint', p1: 'Z', p2: 'Z' },
        { name: 'Z', kind: 'midpoint', p1: 'X', p2: 'X' },
      ],
      shapes: [],
    };
    expect(check(dsl).errors.some((e) => e.code === 'CYCLE')).toBe(true);
  });

  it('long chain no cycle OK', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' },
        { name: 'N', kind: 'midpoint', p1: 'A', p2: 'M' },
        { name: 'P', kind: 'midpoint', p1: 'M', p2: 'N' },
      ],
      shapes: [],
    };
    expect(check(dsl).errors).toEqual([]);
  });

  it('disconnected components: 1 cycle, 1 acyclic — only cycle reported', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' },
        { name: 'X', kind: 'midpoint', p1: 'Y', p2: 'Y' },
        { name: 'Y', kind: 'midpoint', p1: 'X', p2: 'X' },
      ],
      shapes: [],
    };
    expect(check(dsl).errors.length).toBeGreaterThan(0);
    expect(check(dsl).errors.every((e) => e.code === 'CYCLE')).toBe(true);
  });

  it('ignores refs pointing to unknown names (refs.ts catches those)', () => {
    // detectCycles không quan tâm UNKNOWN_REF — refs.ts handle. cycles chỉ traverse known.
    const dsl: DslInputT = {
      version: 1,
      points: [{ name: 'M', kind: 'midpoint', p1: 'Z_UNKNOWN', p2: 'Z_UNKNOWN' }],
      shapes: [],
    };
    expect(check(dsl).errors).toEqual([]);
  });
});
