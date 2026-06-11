// Test rule lineConcurrency: điểm đồng quy của bộ đường tam giác.
import { lineConcurrencyRule } from '../lineConcurrency';
import { segmentClauses } from '../../deterministic/coverage';
import type { RuleContext } from '../_types';

function ctxOf(problem: string): RuleContext {
  return { problem, clauses: segmentClauses(problem) };
}

/** Gom mọi add-point intent của rule cho 1 đề. */
function pointsOf(problem: string): Array<{ name: string; kind: string; of?: unknown }> {
  const matches = lineConcurrencyRule.match(ctxOf(problem));
  const out: Array<{ name: string; kind: string; of?: unknown }> = [];
  for (const m of matches) {
    for (const i of m.intents as any[]) {
      if (i.op === 'add-point') out.push({ name: i.name, kind: i.constraint.kind, of: i.constraint.of });
    }
  }
  return out;
}

describe('lineConcurrency — unnamed bundle → center kind', () => {
  it('ba đường cao đồng quy → orthocenter', () => {
    const pts = pointsOf('Cho tam giác ABC. Ba đường cao của tam giác ABC đồng quy tại H.');
    expect(pts).toEqual([{ name: 'H', kind: 'orthocenter', of: ['A', 'B', 'C'] }]);
  });

  it('ba đường phân giác cắt nhau → incenter', () => {
    const pts = pointsOf('Cho tam giác ABC. Ba đường phân giác của tam giác ABC cắt nhau tại I.');
    expect(pts).toEqual([{ name: 'I', kind: 'incenter', of: ['A', 'B', 'C'] }]);
  });

  it('ba đường trung tuyến đồng quy → centroid', () => {
    const pts = pointsOf('Cho tam giác ABC. Ba đường trung tuyến của tam giác ABC đồng quy tại G.');
    expect(pts).toEqual([{ name: 'G', kind: 'centroid', of: ['A', 'B', 'C'] }]);
  });

  it('ba đường trung trực cắt nhau → circumcenter', () => {
    const pts = pointsOf('Cho tam giác ABC. Ba đường trung trực của tam giác ABC cắt nhau tại O.');
    expect(pts).toEqual([{ name: 'O', kind: 'circumcenter', of: ['A', 'B', 'C'] }]);
  });

  it('verb "cùng đi qua" vẫn emit (vá silent-bug)', () => {
    const pts = pointsOf('Cho tam giác ABC. Ba đường cao của tam giác ABC cùng đi qua H.');
    expect(pts).toEqual([{ name: 'H', kind: 'orthocenter', of: ['A', 'B', 'C'] }]);
  });

  it('verb "gặp nhau" vẫn emit', () => {
    const pts = pointsOf('Cho tam giác ABC. Ba đường phân giác của tam giác ABC gặp nhau tại I.');
    expect(pts).toEqual([{ name: 'I', kind: 'incenter', of: ['A', 'B', 'C'] }]);
  });

  it('tam giác fallback toàn đề khi clause không nêu', () => {
    const pts = pointsOf('Cho tam giác MNP. Ba đường cao đồng quy tại H.');
    expect(pts).toEqual([{ name: 'H', kind: 'orthocenter', of: ['M', 'N', 'P'] }]);
  });
});

describe('lineConcurrency — guard named-skip (giữ path cũ)', () => {
  it('đường cao AD, BE, CF đặt tên → KHÔNG emit (nhường rule cũ)', () => {
    const pts = pointsOf('Cho tam giác ABC. Các đường cao AD, BE, CF của tam giác ABC cắt nhau tại H.');
    expect(pts).toEqual([]);
  });

  it('phân giác AD, BE, CF đặt tên → KHÔNG emit', () => {
    const pts = pointsOf('Cho tam giác ABC. Các đường phân giác AD, BE, CF của tam giác ABC cắt nhau tại I.');
    expect(pts).toEqual([]);
  });

  it('trung tuyến AM, BN, CP đặt tên → KHÔNG emit', () => {
    const pts = pointsOf('Cho tam giác ABC. Các đường trung tuyến AM, BN, CP của tam giác ABC đồng quy tại G.');
    expect(pts).toEqual([]);
  });
});

describe('lineConcurrency — trung trực miễn guard + suy đỉnh từ cạnh', () => {
  it('trung trực của AB, BC, CA → circumcenter (suy đỉnh)', () => {
    const pts = pointsOf('Cho tam giác ABC. Đường trung trực của AB, BC, CA đồng quy tại O.');
    expect(pts).toEqual([{ name: 'O', kind: 'circumcenter', of: ['A', 'B', 'C'] }]);
  });

  it('trung trực của AB và BC cắt nhau tại O → circumcenter', () => {
    const pts = pointsOf('Cho tam giác ABC. Đường trung trực của AB và BC cắt nhau tại O.');
    expect(pts).toEqual([{ name: 'O', kind: 'circumcenter', of: ['A', 'B', 'C'] }]);
  });
});

describe('lineConcurrency — fail-safe', () => {
  it('không có tam giác → []', () => {
    const pts = pointsOf('Cho đường thẳng d. Ba đường cao đồng quy tại H.');
    expect(pts).toEqual([]);
  });

  it('phân giác ngoài → không nhận (defer)', () => {
    const pts = pointsOf('Cho tam giác ABC. Ba đường phân giác ngoài của tam giác ABC cắt nhau tại J.');
    expect(pts).toEqual([]);
  });
});
