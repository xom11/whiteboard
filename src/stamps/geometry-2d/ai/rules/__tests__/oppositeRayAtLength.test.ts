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

  it('lop7 #28 tên-trước "Gọi A là điểm nằm trên tia đối của tia MB sao cho MA = MB": M trung điểm AB', () => {
    const p = toaDoHinh('Cho tam giác MBC vuông tại M có góc B = 60°. Gọi A là điểm nằm trên tia đối của tia MB sao cho MA = MB. Chứng minh rằng tam giác ABC là tam giác đều.');
    expect(thuocDoan(p.M, p.A, p.B)).toBe(true);
    expect(dist(p.M, p.A)).toBeCloseTo(dist(p.M, p.B), 9);
  });

  it('lop7 #24 phân phối "Trên tia đối của các tia BC và CB lấy thứ tự hai điểm D và E sao cho BD = CE" + "Từ B và C kẻ BH, CK theo thứ tự ⊥ AD và AE"', () => {
    const p = toaDoHinh('Cho tam giác ABC cân ở A. Trên tia đối của các tia BC và CB lấy thứ tự hai điểm D và E sao cho BD = CE.\na) Chứng minh tam giác ADE cân\nb) Gọi M là trung điểm của BC. Chứng minh AM là tia phân giác của góc DAE\nc) Từ B và C kẻ BH, CK theo thứ tự vuông góc với AD và AE (H ∈ AD, K ∈ AE). Chứng minh: BH = CK.\nd) Gọi I là giao điểm HB và KC. Chứng minh ba điểm A, M, I thẳng hàng');
    expect(thuocDoan(p.B, p.D, p.C)).toBe(true);
    expect(thuocDoan(p.C, p.B, p.E)).toBe(true);
    expect(dist(p.B, p.D)).toBeCloseTo(dist(p.C, p.E), 9);
    const dot = (a: number[], b: number[], c: number[], d: number[]) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);
    expect(dot(p.B, p.H, p.A, p.D)).toBeCloseTo(0, 9);
    expect(dot(p.C, p.K, p.A, p.E)).toBeCloseTo(0, 9);
    expect(dist(p.B, p.H)).toBeCloseTo(dist(p.C, p.K), 9);
    // A, M, I thẳng hàng (đúng kết luận ý d)
    const cheo = (p.I[0] - p.A[0]) * (p.M[1] - p.A[1]) - (p.I[1] - p.A[1]) * (p.M[0] - p.A[0]);
    expect(Math.abs(cheo)).toBeLessThan(1e-9);
  });

  it('lop7 #23 "Trên tia đối của tia AB và AC lần lượt lấy các điểm D, E sao cho AD = AE < AB"', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A (góc A > 90°). Trên tia đối của tia AB và AC lần lượt lấy các điểm D, E sao cho AD = AE < AB. Gọi O là giao điểm của hai đường thẳng BE và CD.');
    expect(thuocDoan(p.A, p.B, p.D)).toBe(true);
    expect(thuocDoan(p.A, p.C, p.E)).toBe(true);
    expect(dist(p.A, p.D)).toBeCloseTo(dist(p.A, p.E), 9);
    expect(dist(p.A, p.D)).toBeLessThan(dist(p.A, p.B));
  });

  it.each([
    ['phân phối: vế không đo từ gốc tia', 'Cho tam giác ABC. Trên tia đối của các tia BC và CB lấy thứ tự hai điểm D và E sao cho CD = BE.'],
    ['phân phối: so sánh ">"', 'Cho tam giác ABC. Trên tia đối của tia AB và AC lần lượt lấy các điểm D, E sao cho AD = AE > AB.'],
    ['biểu thức tổng', 'Cho tam giác ABC. Trên tia đối của tia AB lấy điểm D sao cho AD = AB + AC.'],
    ['đoạn mới không đo từ gốc tia', 'Cho tam giác ABC. Trên tia đối của tia AB lấy điểm D sao cho BD = AC.'],
    ['vế kia chứa chính điểm mới', 'Cho tam giác ABC. Trên tia đối của tia AB lấy điểm D sao cho AD = DC.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(oppositeRayAtLengthRule, de)).toEqual([]);
  });
});
