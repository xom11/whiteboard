/** @jest-environment jsdom */
import { oppositeRayAtLengthRule } from '../oppositeRayAtLength';
import { oppositeRayPointRule } from '../oppositeRayPoint';
import { segmentClauses } from '../../deterministic/coverage';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';
import { toaDoHinh, dist, thuocDoan } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

function intentsOf(rule: typeof oppositeRayAtLengthRule, problem: string) {
  return rule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents) as any[];
}

describe('oppositeRayAtLength — điểm trên tia đối có độ dài đề cho', () => {
  it('lớp 7 kinh điển "Trên tia đối của tia MA lấy điểm D sao cho MD = MA": M là trung điểm AD (trước đây MD tuỳ ý)', () => {
    const p = toaDoHinh('Cho tam giác ABC, M là trung điểm của BC. Trên tia đối của tia MA lấy điểm D sao cho MD = MA.');
    expect(thuocDoan(p.M, p.A, p.D)).toBe(true);
    expect(dist(p.M, p.D)).toBeCloseTo(dist(p.M, p.A), 9);
  });

  it('hinh-phang #25 "Trên tia đối của tia CB lấy điểm N sao cho BM = CN": C nằm giữa B và N, CN = BM', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A. Lấy điểm M trên cạnh BC. Trên tia đối của tia CB lấy điểm N sao cho BM = CN. Đường thẳng qua M vuông góc với BC cắt AB tại E. Đường thẳng qua N vuông góc với BC cắt AC tại F.');
    expect(thuocDoan(p.C, p.B, p.N)).toBe(true);
    expect(dist(p.C, p.N)).toBeCloseTo(dist(p.B, p.M), 9);
    // hệ quả đề bắt chứng minh: EM = FN
    expect(dist(p.E, p.M)).toBeCloseTo(dist(p.F, p.N), 9);
  });

  it('hinh-phang #47 "Trên tia đối của tia IH lấy điểm K sao cho HI = IK": I là trung điểm HK', () => {
    const p = toaDoHinh('Cho tam giác ABC, I là trung điểm của BC. Vẽ ra phía ngoài của tam giác ABC hai tam giác đều ABE và ACF. Gọi H là trực tâm của tam giác ABE. Trên tia đối của tia IH lấy điểm K sao cho HI = IK.');
    expect(thuocDoan(p.I, p.H, p.K)).toBe(true);
    expect(dist(p.I, p.K)).toBeCloseTo(dist(p.I, p.H), 9);
  });

  it('oppositeRayPoint KHÔNG còn đặt khoảng cách tuỳ ý khi có "sao cho"', () => {
    expect(intentsOf(oppositeRayPointRule, 'Cho tam giác ABC. Trên tia đối của tia AB lấy điểm D sao cho AD = AC.')).toEqual([]);
    // không có điều kiện → vẫn lấy điểm tuỳ ý trên tia đối như cũ
    expect(intentsOf(oppositeRayPointRule, 'Cho tam giác ABC. Trên tia đối của tia AB lấy điểm D.')).toHaveLength(1);
  });

  it('điều kiện không dựng được ("BD = AC" đo từ B, không từ gốc tia) → không vẽ đoán', () => {
    const r = tryDeterministicFigure('Cho tam giác ABC. Trên tia đối của tia AB lấy điểm D sao cho BD = AC.');
    expect(r.ok).toBe(false);
  });

  it.each([
    ['biểu thức tổng', 'Cho tam giác ABC. Trên tia đối của tia AB lấy điểm D sao cho AD = AB + AC.'],
    ['đoạn mới không đo từ gốc tia', 'Cho tam giác ABC. Trên tia đối của tia AB lấy điểm D sao cho BD = AC.'],
    ['vế kia chứa chính điểm mới', 'Cho tam giác ABC. Trên tia đối của tia AB lấy điểm D sao cho AD = DC.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(oppositeRayAtLengthRule, de)).toEqual([]);
  });
});
