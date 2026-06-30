import { collinearPointsRule } from '../collinearPoints';
import { segmentClauses } from '../../deterministic/coverage';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';

function intents(problem: string) {
  return collinearPointsRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('collinearPointsRule', () => {
  it('"Cho 4 điểm A, B, C, D cùng thuộc một đường thẳng" → đầu/cuối free, giữa onSegment', () => {
    const all = intents('Cho 4 điểm A, B, C, D cùng thuộc một đường thẳng.');
    expect(all.find((i) => i.name === 'A')?.constraint.kind).toBe('free');
    expect(all.find((i) => i.name === 'D')?.constraint.kind).toBe('free');
    expect(all.find((i) => i.name === 'B')?.constraint).toMatchObject({ kind: 'onSegment', of: 'AD' });
    expect(all.find((i) => i.name === 'C')?.constraint).toMatchObject({ kind: 'onSegment', of: 'AD' });
  });

  it('"Cho ba điểm A, B, C thẳng hàng" → 3 điểm', () => {
    const all = intents('Cho ba điểm A, B, C thẳng hàng.');
    expect(all.filter((i) => i.op === 'add-point').map((i) => i.name).sort()).toEqual(['A', 'B', 'C']);
  });

  it('end-to-end: hình hợp lệ với 4 điểm', () => {
    const r = tryDeterministicFigure('Cho 4 điểm A, B, C, D cùng thuộc một đường thẳng.');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const names = (r as any).figure.dsl.points.map((p: any) => p.name);
    expect(names).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D']));
  });

  it('bỏ qua khi <3 điểm', () => {
    expect(intents('Cho 2 điểm A, B thuộc một đường thẳng.')).toHaveLength(0);
  });

  it('clause "thẳng hàng" ĐỨNG RIÊNG là geo-clause (vocab) → A,B,C dựng dù có hình khác (C41)', () => {
    // Gate hasGeometry trước đây = false cho "Cho 3 điểm A,B,C thẳng hàng theo
    // thứ tự" (không keyword) → clause bị lọc khỏi rule engine → A,B,C KHÔNG dựng
    // → cascade làm sụp tiếp tuyến/trung điểm. "thẳng hàng" giờ là geo-keyword.
    const r = tryDeterministicFigure(
      'Cho 3 điểm A, B, C thẳng hàng theo thứ tự. Đường tròn (O) đi qua B và C. ' +
        'Từ A kẻ tiếp tuyến AM, AN với (O). Gọi I là trung điểm của BC.',
    );
    // Có thể chưa FULL (đường tròn qua 2 điểm là gap khác) nhưng A,B,C PHẢI có mặt.
    const figure = r.ok ? (r as any).figure : null;
    if (figure) {
      const names = figure.dsl.points.map((p: any) => p.name);
      expect(names).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    }
    // Dù không full, ít nhất clause thẳng hàng phải là geo (collinear rule thấy nó).
    const collinearClause = segmentClauses(
      'Cho 3 điểm A, B, C thẳng hàng theo thứ tự.',
    ).find((c) => /thẳng\s+hàng/u.test(c.text));
    expect(collinearClause?.hasGeometry).toBe(true);
  });
});
