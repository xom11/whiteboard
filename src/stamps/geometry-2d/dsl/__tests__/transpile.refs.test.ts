// src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts
import { validateRefs } from '../transpile/refs';
import { buildSymbols } from '../transpile/symbols';
import type { DslInputT } from '../schema';

function check(dsl: DslInputT) {
  const { symbols } = buildSymbols(dsl);
  return validateRefs(dsl, symbols);
}

describe('validateRefs', () => {
  it('all anchors → no errors', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
      ],
      shapes: [],
    };
    expect(check(dsl).errors).toEqual([]);
  });

  it('unknown ref → UNKNOWN_REF', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'Z' },
      ],
      shapes: [],
    };
    const r = check(dsl);
    expect(r.errors.some((e) => e.code === 'UNKNOWN_REF' && e.path?.includes('M'))).toBe(true);
  });

  it('point field referencing shape → KIND_MISMATCH', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        // midpoint.p2 referencing a segment AB instead of point — bad
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'AB' },
      ],
      shapes: [{ name: 'AB', kind: 'segment', p1: 'A', p2: 'B' }],
    };
    const r = check(dsl);
    expect(r.errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });

  it('perpFoot.onLine accepts segment', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 1 },
        { name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC' },
      ],
      shapes: [{ name: 'BC', kind: 'segment', p1: 'B', p2: 'C' }],
    };
    expect(check(dsl).errors).toEqual([]);
  });

  it('tangent.toCircle rejects segment', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'P', kind: 'free', x: 2, y: 2 },
      ],
      shapes: [
        { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
        { name: 't', kind: 'tangent', throughPoint: 'P', toCircle: 'AB' },
      ],
    };
    expect(check(dsl).errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });

  it('intersection.ref1 must be line-like or circle-like', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        // intersection ref1 referencing a free point — bad
        { name: 'P', kind: 'intersection', ref1: 'A', ref2: 'B' },
        { name: 'B', kind: 'free', x: 1, y: 0 },
      ],
      shapes: [],
    };
    expect(check(dsl).errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });

  it('triangle center vertices accept point-like only', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 1 },
        { name: 'G', kind: 'centroid', vertices: ['A', 'B', 'C'] },
      ],
      shapes: [],
    };
    expect(check(dsl).errors).toEqual([]);
  });

  it('polygon.vertices accept point-like only', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 1 },
      ],
      shapes: [
        { name: 'L', kind: 'line', p1: 'A', p2: 'B' },
        // polygon mistakenly references line L instead of a point
        { name: 'T', kind: 'polygon', vertices: ['A', 'B', 'L'] },
      ],
    };
    expect(check(dsl).errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });
});
