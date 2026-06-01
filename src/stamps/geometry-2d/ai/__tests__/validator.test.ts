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
