// src/stamps/geometry-2d/ai/__tests__/validator.test.ts
import type { DslInputT } from '../../dsl/schema';
import { validateKindCoverage, buildRetryHint } from '../validator';

function dsl(points: DslInputT['points'], shapes: DslInputT['shapes'] = []): DslInputT {
  return { version: 1, points, shapes };
}

describe('validateKindCoverage — midpoint (case user reported)', () => {
  it('flags missing midpoint when prompt says "trung điểm BC" but DSL uses free coord', () => {
    const out = validateKindCoverage(
      'Tam giác ABC, M là trung điểm BC',
      dsl([
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 4, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 3 },
        { name: 'M', kind: 'free', x: 2, y: 1.5 },
      ]),
    );
    expect(out.ok).toBe(false);
    expect(out.missing).toHaveLength(1);
    expect(out.missing[0].expectedKind).toBe('midpoint');
    expect(out.missing[0].hint).toMatch(/midpoint/);
  });

  it('passes when DSL uses kind:"midpoint"', () => {
    const out = validateKindCoverage(
      'Tam giác ABC, M là trung điểm BC',
      dsl([
        { name: 'A', kind: 'free', x: 0, y: 3 },
        { name: 'B', kind: 'free', x: -2, y: 0 },
        { name: 'C', kind: 'free', x: 3, y: 0 },
        { name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' },
      ]),
    );
    expect(out.ok).toBe(true);
    expect(out.satisfied).toContain('midpoint');
  });
});

describe('validateKindCoverage — perpFoot', () => {
  it('flags missing perpFoot when "chân đường cao" but no perpFoot kind', () => {
    const out = validateKindCoverage(
      'Tam giác ABC, H là chân đường cao kẻ từ A xuống BC',
      dsl([
        { name: 'A', kind: 'free', x: 0, y: 3 },
        { name: 'B', kind: 'free', x: -2, y: 0 },
        { name: 'C', kind: 'free', x: 3, y: 0 },
        { name: 'H', kind: 'free', x: 0, y: 0 },
      ]),
    );
    expect(out.ok).toBe(false);
    expect(out.missing.some((m) => m.expectedKind === 'perpFoot')).toBe(true);
  });
});

describe('validateKindCoverage — centroid / orthocenter', () => {
  it('flags missing centroid for "trọng tâm"', () => {
    const out = validateKindCoverage(
      'Tam giác ABC, G là trọng tâm',
      dsl([
        { name: 'A', kind: 'free', x: 0, y: 3 },
        { name: 'B', kind: 'free', x: -2, y: 0 },
        { name: 'C', kind: 'free', x: 3, y: 0 },
        { name: 'G', kind: 'free', x: 0.33, y: 1 },
      ]),
    );
    expect(out.ok).toBe(false);
    expect(out.missing.some((m) => m.expectedKind === 'centroid')).toBe(true);
  });

  it('flags missing orthocenter for "trực tâm"', () => {
    const out = validateKindCoverage(
      'Tam giác ABC, H là trực tâm',
      dsl([
        { name: 'A', kind: 'free', x: 0, y: 3 },
        { name: 'B', kind: 'free', x: -2, y: 0 },
        { name: 'C', kind: 'free', x: 3, y: 0 },
        { name: 'H', kind: 'free', x: 0, y: 0.5 },
      ]),
    );
    expect(out.ok).toBe(false);
    expect(out.missing.some((m) => m.expectedKind === 'orthocenter')).toBe(true);
  });

  it('does NOT flag "trực tâm" for "trung trực" keyword (no false positive)', () => {
    const out = validateKindCoverage(
      'Cho đoạn AB, dựng đường trung trực d của AB',
      dsl(
        [
          { name: 'A', kind: 'free', x: 0, y: 0 },
          { name: 'B', kind: 'free', x: 4, y: 0 },
        ],
        [
          { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
          { name: 'd', kind: 'perpBisector', p1: 'A', p2: 'B' },
        ],
      ),
    );
    expect(out.ok).toBe(true);
    expect(out.satisfied).toContain('perpBisector');
    expect(out.missing.find((m) => m.expectedKind === 'orthocenter')).toBeUndefined();
  });
});

describe('validateKindCoverage — angleBisector / perpBisector disambiguation', () => {
  it('"phân giác" requires angleBisector', () => {
    const out = validateKindCoverage(
      'Tam giác ABC, AD là phân giác góc A',
      dsl(
        [
          { name: 'A', kind: 'free', x: 0, y: 3 },
          { name: 'B', kind: 'free', x: -2, y: 0 },
          { name: 'C', kind: 'free', x: 3, y: 0 },
          { name: 'D', kind: 'free', x: 1, y: 0 },
        ],
        [
          { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
          { name: 'AD', kind: 'segment', p1: 'A', p2: 'D' },
        ],
      ),
    );
    expect(out.missing.some((m) => m.expectedKind === 'angleBisector')).toBe(true);
  });

  it('"trung trực" requires perpBisector, not midpoint (closest substring)', () => {
    const out = validateKindCoverage(
      'Dựng đường trung trực của đoạn AB',
      dsl(
        [
          { name: 'A', kind: 'free', x: 0, y: 0 },
          { name: 'B', kind: 'free', x: 4, y: 0 },
        ],
        [{ name: 'AB', kind: 'segment', p1: 'A', p2: 'B' }],
      ),
    );
    expect(out.missing.some((m) => m.expectedKind === 'perpBisector')).toBe(true);
    // trung trực has "trung" inside but should NOT trigger midpoint rule
    expect(out.missing.some((m) => m.expectedKind === 'midpoint')).toBe(false);
  });
});

describe('validateKindCoverage — circumcenter / circle3', () => {
  it('"ngoại tiếp tam giác" expects circumcenter + circle3', () => {
    const out = validateKindCoverage(
      'Đường tròn ngoại tiếp tam giác ABC tâm O',
      dsl(
        [
          { name: 'A', kind: 'free', x: 0, y: 3 },
          { name: 'B', kind: 'free', x: -2, y: 0 },
          { name: 'C', kind: 'free', x: 3, y: 0 },
          { name: 'O', kind: 'free', x: 0.5, y: 0.5 },
        ],
        [{ name: 'k', kind: 'circleCP', center: 'O', surfacePoint: 'A' }],
      ),
    );
    expect(out.missing.some((m) => m.expectedKind === 'circumcenter')).toBe(true);
    expect(out.missing.some((m) => m.expectedKind === 'circle3')).toBe(true);
  });
});

describe('validateKindCoverage — intersection / tangent', () => {
  it('"cắt nhau tại" expects intersection', () => {
    const out = validateKindCoverage(
      'Hai đường tròn (O) và (I) cắt nhau tại M và N',
      dsl(
        [
          { name: 'O', kind: 'free', x: 0, y: 0 },
          { name: 'O_', kind: 'free', x: 2, y: 0 },
          { name: 'I', kind: 'free', x: 4, y: 0 },
          { name: 'I_', kind: 'free', x: 6, y: 0 },
          { name: 'M', kind: 'free', x: 3, y: 1 },
          { name: 'N', kind: 'free', x: 3, y: -1 },
        ],
        [
          { name: 'c1', kind: 'circleCP', center: 'O', surfacePoint: 'O_' },
          { name: 'c2', kind: 'circleCP', center: 'I', surfacePoint: 'I_' },
        ],
      ),
    );
    expect(out.missing.some((m) => m.expectedKind === 'intersection')).toBe(true);
  });

  it('"tiếp tuyến" expects tangent', () => {
    const out = validateKindCoverage(
      'Cho (O) và điểm T trên đường tròn, vẽ tiếp tuyến d tại T',
      dsl(
        [
          { name: 'O', kind: 'free', x: 0, y: 0 },
          { name: 'A', kind: 'free', x: 2, y: 0 },
          { name: 'T', kind: 'onCircle', circleId: 'c', theta: 1 },
        ],
        [
          { name: 'c', kind: 'circleCP', center: 'O', surfacePoint: 'A' },
          { name: 'd', kind: 'line', p1: 'T', p2: 'A' },
        ],
      ),
    );
    expect(out.missing.some((m) => m.expectedKind === 'tangent')).toBe(true);
  });
});

describe('validateKindCoverage — no false positives', () => {
  it('passes when no relational keyword in prompt', () => {
    const out = validateKindCoverage(
      'Cho ba điểm A, B, C',
      dsl([
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 1 },
      ]),
    );
    expect(out.ok).toBe(true);
    expect(out.missing).toHaveLength(0);
  });

  it('passes "tam giác đều" without false-positive (no derived keyword)', () => {
    const out = validateKindCoverage(
      'Cho tam giác đều ABC cạnh 4',
      dsl(
        [
          { name: 'A', kind: 'free', x: 0, y: 0 },
          { name: 'B', kind: 'free', x: 4, y: 0 },
          { name: 'C', kind: 'free', x: 2, y: 3.464 },
        ],
        [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
      ),
    );
    expect(out.ok).toBe(true);
  });
});

describe('buildRetryHint', () => {
  it('returns empty string for no missing', () => {
    expect(buildRetryHint([])).toBe('');
  });

  it('formats numbered list with all hints', () => {
    const txt = buildRetryHint([
      { ruleId: 'midpoint', expectedKind: 'midpoint', hint: 'Dùng midpoint kind' },
      { ruleId: 'centroid', expectedKind: 'centroid', hint: 'Dùng centroid kind' },
    ]);
    expect(txt).toContain('SỬA LẠI');
    expect(txt).toContain('1. Dùng midpoint kind');
    expect(txt).toContain('2. Dùng centroid kind');
  });
});
