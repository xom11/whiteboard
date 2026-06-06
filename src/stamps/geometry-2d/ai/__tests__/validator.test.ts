// src/stamps/geometry-2d/ai/__tests__/validator.test.ts
import type { DslInputT } from '../../dsl/schema';
import {
  validateKindCoverage,
  buildRetryHint,
  applyDeterministicCompletion,
} from '../validator';

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

  it('"B, C là tiếp điểm" expects tangentPointExt', () => {
    const out = validateKindCoverage(
      'Từ điểm A nằm ngoài (O), vẽ tiếp tuyến AB, AC (B, C là tiếp điểm).',
      dsl(
        [
          { name: 'O', kind: 'free', x: 0, y: 0 },
          { name: 'A', kind: 'free', x: 5, y: 0 },
          { name: 'B', kind: 'free', x: 1, y: 1 },
          { name: 'C', kind: 'free', x: 1, y: -1 },
        ],
        [{ name: 'k', kind: 'circleCR', center: 'O', radius: 3 }],
      ),
    );
    expect(out.missing.some((m) => m.expectedKind === 'tangentPointExt')).toBe(true);
  });

  it('"đường tròn nội tiếp tiếp xúc BC tại D" KHÔNG expect tangentPointExt (incircle, not external)', () => {
    const out = validateKindCoverage(
      'Cho ΔABC. Đường tròn (I) nội tiếp tiếp xúc BC tại D, CA tại E, AB tại F.',
      dsl(
        [
          { name: 'A', kind: 'free', x: 0, y: 3 },
          { name: 'B', kind: 'free', x: -2, y: 0 },
          { name: 'C', kind: 'free', x: 3, y: 0 },
          { name: 'I', kind: 'incenter', vertices: ['A', 'B', 'C'] },
          { name: 'D', kind: 'tangencyPoint', circle: 'inc', onLine: 'BC' },
        ],
        [
          { name: 'inc', kind: 'incircle', vertices: ['A', 'B', 'C'] },
          { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
        ],
      ),
    );
    expect(out.missing.some((m) => m.expectedKind === 'tangentPointExt')).toBe(false);
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

// ---------------------------------------------------------------------------
// extractRequirements + stub hint (Hướng A)
// ---------------------------------------------------------------------------

import { extractRequirements } from '../validator';

describe('extractRequirements — midpoint', () => {
  it('extracts midpoint stub for "M là trung điểm BC"', () => {
    const ex = extractRequirements('Tam giác ABC, M là trung điểm BC, vẽ AM');
    const m = ex.points.find((p) => p.kind === 'midpoint');
    expect(m).toBeDefined();
    expect(m).toMatchObject({
      name: 'M',
      kind: 'midpoint',
      fields: { p1: 'B', p2: 'C' },
    });
  });

  it('extracts midpoint with "trung điểm của BC"', () => {
    const ex = extractRequirements('Tam giác ABC, N là trung điểm của AC');
    const m = ex.points.find((p) => p.kind === 'midpoint');
    expect(m).toMatchObject({ name: 'N', fields: { p1: 'A', p2: 'C' } });
  });
});

describe('extractRequirements — perpFoot', () => {
  it('extracts perpFoot + segment BC stub for "H là chân đường cao kẻ từ A xuống BC"', () => {
    const ex = extractRequirements(
      'Tam giác ABC, H là chân đường cao kẻ từ A xuống BC',
    );
    const h = ex.points.find((p) => p.kind === 'perpFoot');
    expect(h).toMatchObject({
      name: 'H',
      kind: 'perpFoot',
      fields: { from: 'A', onLine: 'BC' },
    });
    const bc = ex.shapes.find((s) => s.name === 'BC');
    expect(bc).toMatchObject({
      kind: 'segment',
      fields: { p1: 'B', p2: 'C' },
    });
  });

  it('also matches "hình chiếu vuông góc từ A đến BC" — wait, current regex requires "chân đường"', () => {
    // Sanity: regex hiện chỉ match "chân đường cao/vuông góc". Đề "hình
    // chiếu vuông góc" sẽ không match — đây là TODO future-iter.
    const ex = extractRequirements('Tam giác ABC, H là hình chiếu vuông góc từ A đến BC');
    expect(ex.points.find((p) => p.kind === 'perpFoot')).toBeUndefined();
  });
});

describe('extractRequirements — centroid / orthocenter', () => {
  it('extracts centroid stub for "G là trọng tâm"', () => {
    const ex = extractRequirements('Tam giác ABC, G là trọng tâm');
    const g = ex.points.find((p) => p.kind === 'centroid');
    expect(g).toMatchObject({
      name: 'G',
      kind: 'centroid',
      fields: { vertices: ['A', 'B', 'C'] },
    });
  });

  it('defaults name to G if "dựng trọng tâm" without name', () => {
    const ex = extractRequirements('Cho tam giác ABC. Dựng trọng tâm.');
    expect(ex.points.find((p) => p.kind === 'centroid')?.name).toBe('G');
  });

  it('extracts orthocenter for "trực tâm"', () => {
    const ex = extractRequirements('Tam giác XYZ, H là trực tâm');
    const h = ex.points.find((p) => p.kind === 'orthocenter');
    expect(h).toMatchObject({
      name: 'H',
      fields: { vertices: ['X', 'Y', 'Z'] },
    });
  });
});

describe('extractRequirements — circumcenter / incenter (disambiguation)', () => {
  it('extracts circumcenter + circle3 stub for "tam giác ABC nội tiếp đường tròn tâm O"', () => {
    const ex = extractRequirements('Tam giác ABC nội tiếp đường tròn tâm O');
    const o = ex.points.find((p) => p.kind === 'circumcenter');
    expect(o).toMatchObject({ name: 'O', fields: { vertices: ['A', 'B', 'C'] } });
    const k = ex.shapes.find((s) => s.kind === 'circle3');
    expect(k).toMatchObject({ fields: { p1: 'A', p2: 'B', p3: 'C' } });
    // Quan trọng: KHÔNG được lẫn sang incenter dù có chữ "nội tiếp".
    expect(ex.points.find((p) => p.kind === 'incenter')).toBeUndefined();
  });

  it('extracts incenter for "đường tròn nội tiếp tam giác ABC tâm I" (incircle)', () => {
    const ex = extractRequirements('Đường tròn nội tiếp tam giác ABC tâm I');
    const i = ex.points.find((p) => p.kind === 'incenter');
    expect(i).toMatchObject({ name: 'I', fields: { vertices: ['A', 'B', 'C'] } });
    expect(ex.points.find((p) => p.kind === 'circumcenter')).toBeUndefined();
  });

  it('extracts circumcenter for "đường tròn ngoại tiếp tam giác ABC tâm O"', () => {
    const ex = extractRequirements('Đường tròn ngoại tiếp tam giác ABC tâm O');
    expect(ex.points.find((p) => p.kind === 'circumcenter')).toMatchObject({
      name: 'O',
    });
    expect(ex.points.find((p) => p.kind === 'incenter')).toBeUndefined();
  });
});

describe('extractRequirements — circle3 standalone', () => {
  it('extracts circle3 for "đường tròn qua 3 điểm A, B, C"', () => {
    const ex = extractRequirements('Vẽ đường tròn đi qua 3 điểm A, B, C');
    const k = ex.shapes.find((s) => s.kind === 'circle3');
    expect(k).toMatchObject({ fields: { p1: 'A', p2: 'B', p3: 'C' } });
  });
});

describe('buildRetryHint with extraction (DSL stub)', () => {
  it('embeds JSON stub for missing midpoint', () => {
    const ex = extractRequirements('Tam giác ABC, M là trung điểm BC');
    const txt = buildRetryHint(
      [{ ruleId: 'midpoint', expectedKind: 'midpoint', hint: 'fallback' }],
      ex,
    );
    expect(txt).toContain('CÁC ELEMENT BẮT BUỘC');
    expect(txt).toContain('"name":"M"');
    expect(txt).toContain('"kind":"midpoint"');
    expect(txt).toContain('"p1":"B"');
    expect(txt).toContain('"p2":"C"');
  });

  it('embeds perpFoot point + BC segment as 2 stubs', () => {
    const ex = extractRequirements(
      'Tam giác ABC, H là chân đường cao kẻ từ A xuống BC',
    );
    const txt = buildRetryHint(
      [{ ruleId: 'perp-foot', expectedKind: 'perpFoot', hint: 'fallback' }],
      ex,
    );
    expect(txt).toContain('"name":"H"');
    expect(txt).toContain('"kind":"perpFoot"');
    expect(txt).toContain('"onLine":"BC"');
    expect(txt).toContain('"name":"BC"');
    expect(txt).toContain('"kind":"segment"');
  });

  it('falls back to generic hint when extraction has no stub for missing kind', () => {
    const txt = buildRetryHint(
      [{ ruleId: 'tangent', expectedKind: 'tangent', hint: 'Dùng tangent kind' }],
      { points: [], shapes: [] },
    );
    expect(txt).toContain('Ngoài ra');
    expect(txt).toContain('Dùng tangent kind');
  });
});

// ---------------------------------------------------------------------------
// applyDeterministicCompletion (Hướng B)
// ---------------------------------------------------------------------------

describe('applyDeterministicCompletion — add missing element', () => {
  it('adds G centroid khi LLM hoàn toàn quên (cứu các case kind missing)', () => {
    const out = applyDeterministicCompletion(
      'Tam giác ABC, G là trọng tâm',
      dsl(
        [
          { name: 'A', kind: 'free', x: 0, y: 3 },
          { name: 'B', kind: 'free', x: -2, y: 0 },
          { name: 'C', kind: 'free', x: 3, y: 0 },
        ],
        [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
      ),
    );
    const g = out.dsl.points.find((p) => p.name === 'G');
    expect(g).toMatchObject({ kind: 'centroid' });
    expect(out.actions).toContainEqual({
      target: 'point',
      name: 'G',
      kind: 'centroid',
      action: 'added',
    });
  });

  it('adds segment BC khi LLM emit perpFoot nhưng quên dependency shape', () => {
    const out = applyDeterministicCompletion(
      'Tam giác ABC, H là chân đường cao kẻ từ A xuống BC',
      dsl(
        [
          { name: 'A', kind: 'free', x: 0, y: 3 },
          { name: 'B', kind: 'free', x: -2, y: 0 },
          { name: 'C', kind: 'free', x: 3, y: 0 },
        ],
        [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
      ),
    );
    expect(out.dsl.points.find((p) => p.name === 'H')).toMatchObject({
      kind: 'perpFoot',
    });
    expect(out.dsl.shapes.find((s) => s.name === 'BC')).toMatchObject({
      kind: 'segment',
    });
  });
});

describe('applyDeterministicCompletion — replace wrong kind', () => {
  it('replaces G:intersection (LLM bịa) với G:centroid (đúng theo đề)', () => {
    const out = applyDeterministicCompletion(
      'Tam giác ABC, G là trọng tâm',
      dsl(
        [
          { name: 'A', kind: 'free', x: 0, y: 3 },
          { name: 'B', kind: 'free', x: -2, y: 0 },
          { name: 'C', kind: 'free', x: 3, y: 0 },
          { name: 'G', kind: 'intersection', ref1: 'AB', ref2: 'AC' },
        ],
        [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
      ),
    );
    const g = out.dsl.points.find((p) => p.name === 'G');
    expect(g).toMatchObject({
      kind: 'centroid',
      vertices: ['A', 'B', 'C'],
    });
    // Quan trọng: G CŨ với kind intersection phải bị thay (không append).
    expect(out.dsl.points.filter((p) => p.name === 'G')).toHaveLength(1);
    expect(out.actions).toContainEqual({
      target: 'point',
      name: 'G',
      kind: 'centroid',
      action: 'replaced',
    });
  });

  it('replaces M:free với M:midpoint (case user nhắc)', () => {
    const out = applyDeterministicCompletion(
      'Tam giác ABC, M là trung điểm BC',
      dsl([
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 4, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 3 },
        { name: 'M', kind: 'free', x: 2, y: 1.5 },
      ]),
    );
    const m = out.dsl.points.find((p) => p.name === 'M');
    expect(m).toMatchObject({ kind: 'midpoint', p1: 'B', p2: 'C' });
  });
});

describe('applyDeterministicCompletion — no-op khi đã đúng', () => {
  it('keeps M:midpoint nếu LLM đã emit đúng', () => {
    const inputDsl = dsl([
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' },
    ]);
    const out = applyDeterministicCompletion(
      'Tam giác ABC, M là trung điểm BC',
      inputDsl,
    );
    expect(out.dsl.points.find((p) => p.name === 'M')).toMatchObject({
      kind: 'midpoint',
    });
    const mAction = out.actions.find((a) => a.name === 'M');
    expect(mAction?.action).toBe('kept');
  });

  it('keeps mọi point khi prompt không có keyword (no extraction)', () => {
    const inputDsl = dsl([
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 1, y: 0 },
    ]);
    const out = applyDeterministicCompletion('Cho hai điểm A, B', inputDsl);
    expect(out.actions).toHaveLength(0);
    expect(out.dsl).toEqual(inputDsl);
  });
});

describe('applyDeterministicCompletion — input không bị mutate', () => {
  it('input DSL points array không bị thay đổi', () => {
    const inputDsl = dsl([
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 4, y: 0 },
      { name: 'C', kind: 'free', x: 0, y: 3 },
    ]);
    const beforeLen = inputDsl.points.length;
    applyDeterministicCompletion('Tam giác ABC, G là trọng tâm', inputDsl);
    expect(inputDsl.points.length).toBe(beforeLen);
  });
});

// ---------------------------------------------------------------------------
// Named-cevian patterns (real-world phrasing: "đường cao AH", "AM là trung
// tuyến", "vẽ phân giác AD"). Đảm bảo segment vertex→foot (visible cevian)
// được auto-add.
// ---------------------------------------------------------------------------

describe('extractRequirements — altitude named-pair patterns', () => {
  it('"đường cao AH" → H perpFoot + segment AH + segment BC', () => {
    const ex = extractRequirements('Cho tam giác ABC, vẽ đường cao AH');
    expect(ex.points.find((p) => p.name === 'H')).toMatchObject({
      kind: 'perpFoot',
      fields: { from: 'A', onLine: 'BC' },
    });
    expect(ex.shapes.find((s) => s.name === 'AH')).toMatchObject({
      kind: 'segment',
      fields: { p1: 'A', p2: 'H' },
    });
    expect(ex.shapes.find((s) => s.name === 'BC')).toMatchObject({
      kind: 'segment',
    });
  });

  it('"hạ đường cao AH" — user case nhắc trực tiếp', () => {
    const ex = extractRequirements('Cho tam giác ABC, hạ đường cao AH');
    expect(ex.points.find((p) => p.kind === 'perpFoot')).toMatchObject({
      name: 'H',
    });
    expect(ex.shapes.find((s) => s.name === 'AH')).toBeDefined();
  });

  it('"AH là đường cao của tam giác"', () => {
    const ex = extractRequirements('Tam giác ABC, AH là đường cao');
    expect(ex.points.find((p) => p.name === 'H')?.kind).toBe('perpFoot');
    expect(ex.shapes.find((s) => s.name === 'AH')).toBeDefined();
  });

  it('"H là chân đường cao kẻ từ A xuống BC" cũng cần thêm segment AH', () => {
    const ex = extractRequirements(
      'Tam giác ABC, H là chân đường cao kẻ từ A xuống BC',
    );
    expect(ex.points.find((p) => p.name === 'H')?.kind).toBe('perpFoot');
    expect(ex.shapes.find((s) => s.name === 'AH')).toMatchObject({
      kind: 'segment',
      fields: { p1: 'A', p2: 'H' },
    });
  });
});

describe('extractRequirements — median named-pair patterns', () => {
  it('"AM là trung tuyến" → M midpoint + segment AM', () => {
    const ex = extractRequirements('Tam giác ABC, AM là trung tuyến');
    expect(ex.points.find((p) => p.name === 'M')).toMatchObject({
      kind: 'midpoint',
      fields: { p1: 'B', p2: 'C' },
    });
    expect(ex.shapes.find((s) => s.name === 'AM')).toMatchObject({
      kind: 'segment',
      fields: { p1: 'A', p2: 'M' },
    });
  });

  it('"vẽ trung tuyến BM" (vertex B → opposite AC)', () => {
    const ex = extractRequirements('Tam giác ABC, vẽ trung tuyến BM');
    expect(ex.points.find((p) => p.name === 'M')).toMatchObject({
      kind: 'midpoint',
      fields: { p1: 'A', p2: 'C' },
    });
    expect(ex.shapes.find((s) => s.name === 'BM')).toBeDefined();
  });
});

describe('extractRequirements — bisector named-pair patterns', () => {
  it('"vẽ phân giác AD" → D intersection + segment AD + bisA line', () => {
    const ex = extractRequirements('Tam giác ABC, vẽ phân giác AD');
    expect(ex.points.find((p) => p.name === 'D')).toMatchObject({
      kind: 'intersection',
    });
    expect(ex.shapes.find((s) => s.name === 'AD')).toMatchObject({
      kind: 'segment',
      fields: { p1: 'A', p2: 'D' },
    });
    expect(ex.shapes.find((s) => s.kind === 'angleBisector')).toBeDefined();
    expect(ex.shapes.find((s) => s.name === 'BC')).toBeDefined();
  });

  it('"AD là phân giác góc A" (đã có ở eval cũ)', () => {
    const ex = extractRequirements(
      'Tam giác ABC, AD là phân giác góc A (D thuộc BC)',
    );
    expect(ex.points.find((p) => p.name === 'D')?.kind).toBe('intersection');
    expect(ex.shapes.find((s) => s.name === 'AD')?.kind).toBe('segment');
  });
});

describe('extractRequirements — no false positive', () => {
  it('"hình bình hành ABCD" không bị match cevian (BD/AC là đường chéo)', () => {
    // Triangle-vertices detection: "ABCD" — regex `tam\s*giác\s+ABC` không
    // match vì đề không có "tam giác". Nhưng "hình bình hành ABCD" cũng
    // KHÔNG có triangle context → cevian skip.
    const ex = extractRequirements(
      'Hình bình hành ABCD, hai đường chéo AC, BD cắt nhau tại O',
    );
    expect(ex.points.find((p) => p.kind === 'perpFoot')).toBeUndefined();
    expect(ex.shapes.find((s) => s.kind === 'segment' && (s.name === 'AC' || s.name === 'BD'))).toBeUndefined();
  });
});

describe('applyDeterministicCompletion + cevian (integration)', () => {
  it('User case "hạ đường cao AH" → DSL có H + AH + BC ngay cả khi LLM chỉ emit polygon', () => {
    const out = applyDeterministicCompletion(
      'Cho tam giác ABC, hạ đường cao AH',
      dsl(
        [
          { name: 'A', kind: 'free', x: 1, y: 3 },
          { name: 'B', kind: 'free', x: -2, y: 0 },
          { name: 'C', kind: 'free', x: 3, y: 0 },
        ],
        [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
      ),
    );
    expect(out.dsl.points.find((p) => p.name === 'H')?.kind).toBe('perpFoot');
    expect(out.dsl.shapes.find((s) => s.name === 'AH')?.kind).toBe('segment');
    expect(out.dsl.shapes.find((s) => s.name === 'BC')?.kind).toBe('segment');
  });
});

// ---------------------------------------------------------------------------
// Tangent-from-external pattern ("B, C là tiếp điểm")
//
// Real-world phrasing user nhắc: "Từ điểm A nằm bên ngoài đường tròn (O),
// kẻ hai tiếp tuyến AB, AC với (O) (B, C là hai tiếp điểm)". LLM (cả Claude
// lẫn Gemma) không tự suy ra B, C phải là tangentPointExt → deterministic
// completion phải kick in.
// ---------------------------------------------------------------------------

describe('extractRequirements — tangent from external point', () => {
  const userPrompt =
    'Từ điểm A nằm bên ngoài đường tròn (O), kẻ hai tiếp tuyến AB, AC với đường tròn (O) (B, C là hai tiếp điểm).';

  it('extracts B + C as tangentPointExt with which=0/1, same circle ref', () => {
    const ex = extractRequirements(userPrompt);
    const b = ex.points.find((p) => p.name === 'B');
    const c = ex.points.find((p) => p.name === 'C');
    expect(b).toMatchObject({
      kind: 'tangentPointExt',
      fields: { from: 'A', which: 0 },
    });
    expect(c).toMatchObject({
      kind: 'tangentPointExt',
      fields: { from: 'A', which: 1 },
    });
    expect(b!.fields.circle).toBe(c!.fields.circle);
  });

  it('emits circleCR (center=O) + 2 tangent line shapes for end-to-end render', () => {
    const ex = extractRequirements(userPrompt);
    const circle = ex.shapes.find((s) => s.kind === 'circleCR');
    expect(circle).toBeDefined();
    expect(circle!.fields).toMatchObject({ center: 'O' });
    expect(typeof circle!.fields.radius).toBe('number');

    const tangents = ex.shapes.filter((s) => s.kind === 'tangent');
    expect(tangents).toHaveLength(2);
    for (const t of tangents) {
      expect(t.fields).toMatchObject({ throughPoint: 'A' });
    }
    const branches = tangents.map((t) => t.fields.branch).sort();
    expect(branches).toEqual([0, 1]);
  });

  it('respects explicit radius "(O; R=5)" instead of default', () => {
    const ex = extractRequirements(
      'Cho (O; R=5) và điểm A ngoài (O). Vẽ 2 tiếp tuyến AB, AC tới (O) (B, C là tiếp điểm).',
    );
    const circle = ex.shapes.find((s) => s.kind === 'circleCR');
    expect(circle!.fields.radius).toBe(5);
  });

  it('no false positive when prompt has no "tiếp điểm" phrase', () => {
    const ex = extractRequirements(
      'Cho (O) và điểm A nằm trên đường tròn. Vẽ tiếp tuyến tại A.',
    );
    expect(ex.points.find((p) => p.kind === 'tangentPointExt')).toBeUndefined();
  });
});

describe('applyDeterministicCompletion + tangent-from-external (integration)', () => {
  const userPrompt =
    'Từ điểm A nằm bên ngoài đường tròn (O), kẻ hai tiếp tuyến AB, AC với đường tròn (O) (B, C là hai tiếp điểm).';

  it('rescues case where LLM emit only O+A: adds B, C, circle, 2 tangent lines', () => {
    const out = applyDeterministicCompletion(
      userPrompt,
      dsl(
        [
          { name: 'O', kind: 'free', x: 0, y: 0 },
          { name: 'A', kind: 'free', x: 5, y: 0 },
        ],
        [],
      ),
    );
    const b = out.dsl.points.find((p) => p.name === 'B');
    const c = out.dsl.points.find((p) => p.name === 'C');
    expect(b?.kind).toBe('tangentPointExt');
    expect(c?.kind).toBe('tangentPointExt');
    expect((b as { from: string }).from).toBe('A');
    expect((c as { from: string }).from).toBe('A');
    expect((b as { which: 0 | 1 }).which).toBe(0);
    expect((c as { which: 0 | 1 }).which).toBe(1);

    const circle = out.dsl.shapes.find((s) => s.kind === 'circleCR');
    expect(circle).toBeDefined();
    expect((circle as { center: string }).center).toBe('O');

    const tangents = out.dsl.shapes.filter((s) => s.kind === 'tangent');
    expect(tangents).toHaveLength(2);
  });

  it('does not duplicate when LLM already emit correct circle + tangents (canonical names)', () => {
    const out = applyDeterministicCompletion(
      userPrompt,
      dsl(
        [
          { name: 'O', kind: 'free', x: 0, y: 0 },
          { name: 'A', kind: 'free', x: 5, y: 0 },
        ],
        [
          { name: 'k', kind: 'circleCR', center: 'O', radius: 3 },
          { name: 'tAB', kind: 'tangent', throughPoint: 'A', toCircle: 'k', branch: 0 },
          { name: 'tAC', kind: 'tangent', throughPoint: 'A', toCircle: 'k', branch: 1 },
        ],
      ),
    );
    expect(out.dsl.shapes.filter((s) => s.kind === 'circleCR')).toHaveLength(1);
    expect(out.dsl.shapes.filter((s) => s.kind === 'tangent')).toHaveLength(2);
    expect(out.dsl.points.find((p) => p.name === 'B')?.kind).toBe('tangentPointExt');
    expect(out.dsl.points.find((p) => p.name === 'C')?.kind).toBe('tangentPointExt');
  });

  it('replaces wrong-kind B (LLM emit free) with tangentPointExt', () => {
    const out = applyDeterministicCompletion(
      userPrompt,
      dsl(
        [
          { name: 'O', kind: 'free', x: 0, y: 0 },
          { name: 'A', kind: 'free', x: 5, y: 0 },
          { name: 'B', kind: 'free', x: 1.8, y: 2.4 },
          { name: 'C', kind: 'free', x: 1.8, y: -2.4 },
        ],
        [],
      ),
    );
    const b = out.dsl.points.find((p) => p.name === 'B');
    const c = out.dsl.points.find((p) => p.name === 'C');
    expect(b?.kind).toBe('tangentPointExt');
    expect(c?.kind).toBe('tangentPointExt');
  });

  it('removes orphan helper point P (LLM legacy circleCP-style)', () => {
    // LLM hay emit helper free point P kèm circleCP để định nghĩa đường tròn,
    // nhưng completion thay bằng circleCR (center + radius) → P trở thành
    // orphan (không có shape nào reference). Nó hiển thị trên canvas như
    // chấm thừa → cần xoá khi đề không nhắc P.
    const out = applyDeterministicCompletion(
      userPrompt,
      dsl(
        [
          { name: 'O', kind: 'free', x: 0, y: 0 },
          { name: 'P', kind: 'free', x: 2, y: 0 },
          { name: 'A', kind: 'free', x: 5, y: 0 },
        ],
        [],
      ),
    );
    expect(out.dsl.points.find((p) => p.name === 'P')).toBeUndefined();
    expect(out.dsl.points.find((p) => p.name === 'O')).toBeDefined();
    expect(out.dsl.points.find((p) => p.name === 'A')).toBeDefined();
    expect(out.dsl.points.find((p) => p.name === 'B')).toBeDefined();
    expect(out.dsl.points.find((p) => p.name === 'C')).toBeDefined();
  });

  it('keeps free points mentioned in prompt even if orphan', () => {
    // Edge: nếu đề thật sự đề cập tới điểm phụ (vd "Lấy P trên (O)"), không
    // xoá. Hiện tại đề mẫu KHÔNG có chữ P → orphan removal an toàn.
    // Test này verify nguyên tắc: chỉ xoá free point không trong prompt.
    const out = applyDeterministicCompletion(
      'Từ điểm A nằm bên ngoài đường tròn (O), kẻ hai tiếp tuyến AB, AC với đường tròn (O) (B,C là hai tiếp điểm). Lấy P trên đoạn OA.',
      dsl(
        [
          { name: 'O', kind: 'free', x: 0, y: 0 },
          { name: 'P', kind: 'free', x: 2, y: 0 },
          { name: 'A', kind: 'free', x: 5, y: 0 },
        ],
        [],
      ),
    );
    // P xuất hiện trong prompt → giữ lại dù orphan
    expect(out.dsl.points.find((p) => p.name === 'P')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// extractRequirements Cụm A — arcMidpoint / excenter / reflect
// ---------------------------------------------------------------------------

describe('extractRequirements Cụm A', () => {
  it('trung điểm cung BC không chứa A → arcMidpoint + circumcircle omega', () => {
    const r = extractRequirements('Cho tam giác ABC. M là trung điểm cung BC không chứa A.');
    const m = r.points.find((p) => p.name === 'M');
    expect(m).toMatchObject({
      kind: 'arcMidpoint',
      fields: { circle: 'omega', a: 'B', b: 'C', notContaining: 'A' },
    });
    expect(r.shapes.some((s) => s.name === 'omega' && s.kind === 'circle3')).toBe(true);
  });

  it('tâm bàng tiếp góc A → excenter', () => {
    const r = extractRequirements('Cho tam giác ABC, J là tâm bàng tiếp góc A.');
    expect(r.points.find((p) => p.name === 'J')).toMatchObject({
      kind: 'excenter', fields: { vertices: ['A', 'B', 'C'], opposite: 'A' },
    });
  });

  it('D đối xứng H qua BC → reflectLine + segment BC', () => {
    const r = extractRequirements('Cho tam giác ABC trực tâm H. D đối xứng với H qua BC.');
    expect(r.points.find((p) => p.name === 'D')).toMatchObject({
      kind: 'reflectLine', fields: { of: 'H', through: 'BC' },
    });
    expect(r.shapes.some((s) => s.name === 'BC' && s.kind === 'segment')).toBe(true);
  });

  it('Q đối xứng P qua điểm M → reflectPoint', () => {
    const r = extractRequirements('Q là điểm đối xứng của P qua M.');
    expect(r.points.find((p) => p.name === 'Q')).toMatchObject({
      kind: 'reflectPoint', fields: { of: 'P', through: 'M' },
    });
  });
});
