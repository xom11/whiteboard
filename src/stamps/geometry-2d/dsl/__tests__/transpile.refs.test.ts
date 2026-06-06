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

// ===== issue #43: registry-driven refSpecs cho kind mới =====
import { transpile } from '../index';

describe('validateRefs registry-driven — kind mới (issue #43)', () => {
  it('tangentPointExt.circle trỏ point → KIND_MISMATCH', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'T', kind: 'tangentPointExt', from: 'A', circle: 'B', which: 0 },
      ],
      shapes: [],
    };
    expect(check(dsl).errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });

  it('tangentPointExt.circle unknown → UNKNOWN_REF, transpile không throw', () => {
    const dsl = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'T', kind: 'tangentPointExt', from: 'A', circle: 'Z', which: 0 },
      ],
      shapes: [],
    };
    let r: ReturnType<typeof transpile> | undefined;
    expect(() => { r = transpile(dsl); }).not.toThrow();
    expect(r!.ok).toBe(false);
    if (!r!.ok) expect(r!.errors.some((e) => e.code === 'UNKNOWN_REF')).toBe(true);
  });

  it('circleIntersection.c1 trỏ point → KIND_MISMATCH', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'P', kind: 'circleIntersection', c1: 'A', c2: 'A', which: 0 },
      ],
      shapes: [],
    };
    expect(check(dsl).errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });

  it('secondIntersection.line trỏ point → KIND_MISMATCH', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 1 },
        { name: 'P', kind: 'secondIntersection', line: 'A', circle: 'A', other: 'B', which: 0 },
      ],
      shapes: [],
    };
    expect(check(dsl).errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });

  it('tangencyPoint.circle trỏ point → KIND_MISMATCH', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'P', kind: 'tangencyPoint', circle: 'A', onLine: 'B' },
      ],
      shapes: [],
    };
    expect(check(dsl).errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });

  it('circleCR.center trỏ shape → KIND_MISMATCH', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
      ],
      shapes: [
        { name: 's1', kind: 'segment', p1: 'A', p2: 'B' },
        { name: 'c1', kind: 'circleCR', center: 's1', radius: 2 },
      ],
    };
    expect(check(dsl).errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });

  it('incircle.vertices trỏ shape → KIND_MISMATCH', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
      ],
      shapes: [
        { name: 's1', kind: 'segment', p1: 'A', p2: 'B' },
        { name: 'ic', kind: 'incircle', vertices: ['A', 'B', 's1'] },
      ],
    };
    expect(check(dsl).errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });
});
