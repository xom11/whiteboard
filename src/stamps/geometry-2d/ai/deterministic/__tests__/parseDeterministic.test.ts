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
    // 2 keyword (tam giác + đường tròn), chỉ triangle matched → conf 0.5.
    const r = parseDeterministic('vẽ đường tròn của tam giác ABC', { threshold: 0.5 });
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

});

describe('parseDeterministic — projection + onSegment patterns', () => {
  test('"Trên đoạn BC lấy M" emits segment BC + M onSegment', () => {
    const r = parseDeterministic('Cho tam giác ABC. Trên đoạn BC lấy M.');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Triangle skeleton already has BC segment
    expect(r.dsl.shapes.some((s) => s.name === 'BC' && s.kind === 'segment')).toBe(true);
    expect(r.dsl.points.some((p) => p.name === 'M' && p.kind === 'onSegment')).toBe(true);
  });

  test('"P thuộc đoạn AB" emits onSegment', () => {
    const r = parseDeterministic('Cho tam giác ABC. P thuộc đoạn AB.');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dsl.points.some((p) => p.name === 'P' && p.kind === 'onSegment')).toBe(true);
  });

  test('"E là hình chiếu vuông góc của M lên AB" emits perpFoot', () => {
    // Set up: triangle + M on BC + E projection
    const r = parseDeterministic(
      'Cho tam giác ABC. Trên đoạn BC lấy M. E là hình chiếu vuông góc của M lên AB.',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dsl.points.some((p) => p.name === 'E' && p.kind === 'perpFoot')).toBe(true);
  });

  test('"E, F lần lượt là hình chiếu vuông góc của M lên AB, AD" — pair', () => {
    const r = parseDeterministic(
      'Cho hình vuông ABCD. Trên đoạn BD lấy M. Gọi E, F lần lượt là hình chiếu vuông góc của M lên các cạnh AB, AD.',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const E = r.dsl.points.find((p) => p.name === 'E');
    const F = r.dsl.points.find((p) => p.name === 'F');
    const M = r.dsl.points.find((p) => p.name === 'M');
    expect(E?.kind).toBe('perpFoot');
    expect(F?.kind).toBe('perpFoot');
    expect(M?.kind).toBe('onSegment');
  });

  // Regression: user's full problem (the one that previously emitted only square)
  test('full user square problem now hits fast-path', () => {
    const r = parseDeterministic(
      'Cho hình vuông ABCD. Trên đoạn BD lấy M không trùng với B,D. ' +
        'Gọi E,F lần lượt là hình chiếu vuông góc của M lên các cạnh AB, AD. ' +
        'Chứng minh rằng: 1. CM vuông góc EF 2. CM,BF,DE đồng quy',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 7 points expected: A B C D + M E F
    const names = r.dsl.points.map((p) => p.name).sort();
    expect(names).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'M']);
  });

  test('acute triangle orthocenter midpoint perpendicular secant prompt hits fast-path', () => {
    const r = parseDeterministic(
      'Cho tam giác nhọn ABC có H là trực tâm và M là trung điểm BC. ' +
        'Kẻ đường thẳng qua H vuông góc với HM và cắt AB, AC lần lượt tại P và Q.',
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dsl.points.map((p) => p.name).sort()).toEqual(['A', 'B', 'C', 'H', 'M', 'P', 'Q']);
    expect(r.dsl.points.find((p) => p.name === 'H')).toMatchObject({
      kind: 'orthocenter',
      vertices: ['A', 'B', 'C'],
    });
    expect(r.dsl.points.find((p) => p.name === 'M')).toMatchObject({
      kind: 'midpoint',
      p1: 'B',
      p2: 'C',
    });
    expect(r.dsl.shapes.find((s) => s.name === 'PQ')).toMatchObject({
      kind: 'perpendicular',
      throughPoint: 'H',
      toLine: 'HM',
    });
    expect(r.dsl.points.find((p) => p.name === 'P')).toMatchObject({
      kind: 'intersection',
      ref1: 'PQ',
      ref2: 'AB',
    });
    expect(r.dsl.points.find((p) => p.name === 'Q')).toMatchObject({
      kind: 'intersection',
      ref1: 'PQ',
      ref2: 'AC',
    });
    const trans = transpile(r.dsl);
    expect(trans.ok).toBe(true);
  });

  test('altitude circumcenter orthocenter single perpendicular intersection prompt hits fast-path', () => {
    const r = parseDeterministic(
      'Cho tam giác nhọn ABC có AD là đường cao, O và H lần lượt là tâm đường tròn ngoại tiếp và ' +
        'trực tâm của tam giác ABC. Kẻ đường thẳng qua D và vuông góc với OD, cắt AB ở K.',
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dsl.points.map((p) => p.name).sort()).toEqual(['A', 'B', 'C', 'D', 'H', 'K', 'O']);
    expect(r.dsl.points.find((p) => p.name === 'D')).toMatchObject({
      kind: 'perpFoot',
      from: 'A',
      onLine: 'BC',
    });
    expect(r.dsl.points.find((p) => p.name === 'O')).toMatchObject({
      kind: 'circumcenter',
      vertices: ['A', 'B', 'C'],
    });
    expect(r.dsl.points.find((p) => p.name === 'H')).toMatchObject({
      kind: 'orthocenter',
      vertices: ['A', 'B', 'C'],
    });
    expect(r.dsl.shapes.find((s) => s.name === 'DK')).toMatchObject({
      kind: 'perpendicular',
      throughPoint: 'D',
      toLine: 'OD',
    });
    expect(r.dsl.points.find((p) => p.name === 'K')).toMatchObject({
      kind: 'intersection',
      ref1: 'DK',
      ref2: 'AB',
    });
    const trans = transpile(r.dsl);
    expect(trans.ok).toBe(true);
  });

  test('declarative line through point perpendicular intersection prompt hits fast-path', () => {
    const r = parseDeterministic(
      'Cho tam giác nhọn ABC có CD là đường cao, H là trực tâm và O là tâm ' +
        'đường tròn ngoại tiếp tam giác ABC. Một đường thẳng đi qua điểm D, vuông góc với OD và cắt BC tại E',
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dsl.points.map((p) => p.name).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'H', 'O']);
    expect(r.dsl.points.find((p) => p.name === 'D')).toMatchObject({
      kind: 'perpFoot',
      from: 'C',
      onLine: 'AB',
    });
    expect(r.dsl.shapes.find((s) => s.name === 'DE')).toMatchObject({
      kind: 'perpendicular',
      throughPoint: 'D',
      toLine: 'OD',
    });
    expect(r.dsl.points.find((p) => p.name === 'E')).toMatchObject({
      kind: 'intersection',
      ref1: 'DE',
      ref2: 'BC',
    });
    const trans = transpile(r.dsl);
    expect(trans.ok).toBe(true);
  });

  test('arc point paired perpendicular feet and line intersection prompt hits fast-path', () => {
    const r = parseDeterministic(
      'Cho tam giác ABC nhọn (AB < AC) nội tiếp đường tròn tâm O. Điểm M thuộc cung nhỏ BC. ' +
        'Vẽ M E, M F lần lượt vuông góc AC, AB tại E, F .Gọi H là trực tâm của tam giác ABC, đường thẳng EF cắt HM tại I.',
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dsl.points.map((p) => p.name).sort()).toEqual(['A', 'B', 'C', 'E', 'F', 'H', 'I', 'M', 'O']);
    expect(r.dsl.points.find((p) => p.name === 'O')).toMatchObject({
      kind: 'circumcenter',
      vertices: ['A', 'B', 'C'],
    });
    expect(r.dsl.points.find((p) => p.name === 'M')).toMatchObject({
      kind: 'onCircle',
      circleId: 'omega',
    });
    expect(r.dsl.points.find((p) => p.name === 'E')).toMatchObject({
      kind: 'perpFoot',
      from: 'M',
      onLine: 'AC',
    });
    expect(r.dsl.points.find((p) => p.name === 'F')).toMatchObject({
      kind: 'perpFoot',
      from: 'M',
      onLine: 'AB',
    });
    expect(r.dsl.points.find((p) => p.name === 'I')).toMatchObject({
      kind: 'intersection',
      ref1: 'EF',
      ref2: 'HM',
    });
    const trans = transpile(r.dsl);
    expect(trans.ok).toBe(true);
  });
});
