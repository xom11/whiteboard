// src/stamps/geometry-2d/ai/__tests__/prompt.test.ts
import { buildSystemPrompt } from '../prompt';

describe('buildSystemPrompt', () => {
  it('returns non-empty string', () => {
    const p = buildSystemPrompt();
    expect(typeof p).toBe('string');
    expect(p.length).toBeGreaterThan(1000);
  });

  it('contains all 10 fixture problem statements', () => {
    const p = buildSystemPrompt();
    const problems = [
      'Cho tam giác đều ABC cạnh 4',
      'trung điểm BC',
      'đường cao xuống BC',
      'trọng tâm',
      'trực tâm',
      'nội tiếp đường tròn tâm O',
      'tâm nội tiếp',
      'phân giác góc A',
      'Hình bình hành ABCD',
      'Hai đường tròn',
    ];
    for (const needle of problems) {
      expect(p).toContain(needle);
    }
  });

  it('lists all primitive kinds', () => {
    const p = buildSystemPrompt();
    const kinds = [
      'free', 'midpoint', 'onSegment', 'onLine', 'onCircle',
      'perpFoot', 'circumcenter', 'incenter', 'centroid', 'orthocenter',
      'intersection',
      'segment', 'line', 'ray', 'polygon',
      'perpendicular', 'parallel', 'perpBisector', 'angleBisector', 'tangent',
      'circleCP', 'circle3',
    ];
    for (const k of kinds) {
      expect(p).toContain(k);
    }
  });

  it('mentions envelope shape build / refuse', () => {
    const p = buildSystemPrompt();
    expect(p).toContain('"decision": "build"');
    expect(p).toContain('"decision": "refuse"');
  });

  it('is deterministic — 2 calls return identical string', () => {
    expect(buildSystemPrompt()).toBe(buildSystemPrompt());
  });

  // -----------------------------------------------------------------------
  // New: strengthened directives for keyword→kind mapping + anti-bias.
  // Khoá rule cứng để regression cảnh báo nếu ai xoá.
  // -----------------------------------------------------------------------

  it('contains MANDATORY keyword→kind mapping section', () => {
    const p = buildSystemPrompt();
    // Section heading should signal mandatory force.
    expect(p).toMatch(/BẮT BUỘC.+từ\s*khoá.+kind/i);
    // Concrete trigger words paired with kinds.
    const mappings: ReadonlyArray<[string, string]> = [
      ['trung điểm', 'midpoint'],
      ['chân đường cao', 'perpFoot'],
      ['trọng tâm', 'centroid'],
      ['trực tâm', 'orthocenter'],
      ['ngoại tiếp', 'circumcenter'],
      ['nội tiếp', 'incenter'],
      ['phân giác', 'angleBisector'],
      ['trung trực', 'perpBisector'],
      ['tiếp tuyến', 'tangent'],
      ['giao điểm', 'intersection'],
    ];
    for (const [keyword, kind] of mappings) {
      expect(p).toContain(keyword);
      expect(p).toContain(kind);
    }
  });

  it('contains anti-right-triangle-at-origin guidance', () => {
    const p = buildSystemPrompt();
    // Explicit warning về (0,0)/(a,0)/(0,b) pattern.
    expect(p).toMatch(/A\(0,\s*0\)/);
    expect(p).toMatch(/tam giác\s+(vuông|VUÔNG)/i);
    expect(p).toMatch(/scalene/i);
  });

  it('contains contrast WRONG vs CORRECT for midpoint/centroid/perpFoot', () => {
    const p = buildSystemPrompt();
    // Đảm bảo có cặp ❌ / ✅ làm contrast.
    expect(p).toContain('❌');
    expect(p).toContain('✅');
    // Concrete contrast cho midpoint case (user-reported).
    expect(p).toMatch(/kind:"midpoint"/);
    expect(p).toMatch(/kind:"centroid"/);
    expect(p).toMatch(/kind:"perpFoot"/);
  });

  it('explicitly forbids free-coord for derived points', () => {
    const p = buildSystemPrompt();
    expect(p).toMatch(/TUYỆT ĐỐI KHÔNG|KHÔNG được dùng kind:"free"/i);
  });
});
