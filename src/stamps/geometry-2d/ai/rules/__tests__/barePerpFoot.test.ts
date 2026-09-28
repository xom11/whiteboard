/** @jest-environment jsdom */
import { barePerpFootRule } from '../barePerpFoot';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, dist, thuocDoan, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const dot = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);

function intentsOf(problem: string) {
  return barePerpFootRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents) as any[];
}

describe('barePerpFoot — "ME vuông góc với AB, MF vuông góc với AC" (không động từ)', () => {
  it('hinh-phang #20: E ∈ AB, F ∈ AC, ME ⊥ AB, MF ⊥ AC, ME = MF', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A, M là trung điểm của BC. ME vuông góc với AB, MF vuông góc với AC. Chứng minh: a) AM là trung trực của BC; b) ME = MF và AM là trung trực của EF; c) EF // BC.');
    expect(thuocDoan(p.E, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.F, p.A, p.C)).toBe(true);
    expect(dot(p.M, p.E, p.A, p.B)).toBeCloseTo(0, 9);
    expect(dot(p.M, p.F, p.A, p.C)).toBeCloseTo(0, 9);
    expect(dist(p.M, p.E)).toBeCloseTo(dist(p.M, p.F), 9);
  });

  it.each([
    ['mệnh đề không bắt đầu bằng cụm', 'Cho tam giác ABC có AB vuông góc với AC.'],
    ['chân đã có từ trước (phát biểu quan hệ, không dựng)', 'Cho tam giác ABC, M là trung điểm của BC. MA vuông góc với BC.'],
    ['điểm đầu chưa có', 'Cho tam giác ABC. ME vuông góc với AB.'],
    ['còn nội dung khác phía sau', 'Cho tam giác ABC, M là trung điểm của BC. ME vuông góc với AB cắt AC tại F.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(de)).toEqual([]);
  });
});
