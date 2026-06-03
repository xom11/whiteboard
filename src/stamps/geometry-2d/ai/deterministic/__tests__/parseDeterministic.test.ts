import { parseDeterministic } from '../index';
import { transpile } from '../../../dsl';

describe('parseDeterministic', () => {
  test('"Cho tam giác ABC, đường cao AH" → ok + confidence ≥ 0.85', () => {
    const r = parseDeterministic('Cho tam giác ABC, đường cao AH');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
    expect(r.dsl.points.map((p) => p.name).sort()).toEqual(['A', 'B', 'C', 'H']);
    const trans = transpile(r.dsl);
    expect(trans.ok).toBe(true);
  });

  test('"đường tròn Euler tam giác ABC" → low confidence, miss', () => {
    const r = parseDeterministic('vẽ đường tròn Euler của tam giác ABC');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.confidence).toBeLessThan(0.85);
    expect(r.reason).toBe('low-confidence');
  });

  test('threshold override 0.5 lets through partial coverage', () => {
    const r = parseDeterministic('vẽ đường tròn Euler của tam giác ABC', { threshold: 0.5 });
    expect(r.ok).toBe(true);
  });

  test('empty problem → miss with confidence 0', () => {
    const r = parseDeterministic('');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.confidence).toBe(0);
  });

  test('tangent from external named → tangent ext hit', () => {
    const r = parseDeterministic(
      'Cho đường tròn (O; R=3) và điểm A nằm ngoài (O). Từ A kẻ hai tiếp tuyến AB, AC (B, C là hai tiếp điểm).',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dsl.points.some((p) => p.kind === 'tangentPointExt')).toBe(true);
    expect(r.dsl.shapes.some((s) => s.kind === 'tangent')).toBe(true);
  });

  // Regression: false-positive "hình chiếu vuông góc" trên hình vuông —
  // validator.ts không parse phrasing "E, F lần lượt là hình chiếu của M lên
  // AB, AD" → ZERO point/shape derived emitted. Label 'altitude' KHÔNG được
  // push (không có perpFoot kind nào được add) → confidence thấp → miss.
  test('"hình vuông + hình chiếu vuông góc của M" — derived không recognize → miss', () => {
    const r = parseDeterministic(
      'Cho hình vuông ABCD. Trên đoạn BD lấy M không trùng với B,D. ' +
        'Gọi E,F lần lượt là hình chiếu vuông góc của M lên các cạnh AB, AD. ' +
        'Chứng minh rằng: 1. CM vuông góc EF 2. CM,BF,DE đồng quy',
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.confidence).toBeLessThan(0.85);
    expect(r.reason).toBe('low-confidence');
  });
});
