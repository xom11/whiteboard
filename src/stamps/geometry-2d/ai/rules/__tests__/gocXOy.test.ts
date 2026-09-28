/** @jest-environment jsdom */
import { gocXOyRule } from '../gocXOy';
import { parallelPerpRule } from '../parallelPerp';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, dist, thuocDoan, thuocTia, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const goc = (a: XY, o: XY, b: XY) => {
  const u = [a[0] - o[0], a[1] - o[1]];
  const v = [b[0] - o[0], b[1] - o[1]];
  return (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))) * 180) / Math.PI;
};
const cheo = (a: XY, b: XY, p: XY) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

function intentsOf(rule: typeof gocXOyRule, problem: string) {
  return rule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents) as any[];
}

describe('gocXOy — đề xuất phát từ góc xOy (tia tên chữ thường)', () => {
  it('số đo góc: "góc xOy = 60°" → 60°, "góc vuông" → 90°, "góc tù" → 120°', () => {
    const a = toaDoHinh('Cho góc xOy = 60°. Vẽ tia phân giác Oz của góc xOy.');
    expect(goc(a.x, a.O, a.y)).toBeCloseTo(60, 9);
    expect(goc(a.x, a.O, a.z)).toBeCloseTo(30, 9);
    const b = toaDoHinh('Cho góc vuông xOy. Điểm M nằm trong góc đó. Vẽ điểm N sao cho tia Ox là đường trung trực của MN.');
    expect(goc(b.x, b.O, b.y)).toBeCloseTo(90, 9);
  });

  it('hinh-phang #55 "Trên tia phân giác của góc đó lấy M, từ M hạ các đường vuông góc MA, MB xuống cạnh Ox, Oy": A ∈ tia Ox, MA ⊥ Ox, MA = MB', () => {
    const p = toaDoHinh('Cho góc xOy. Trên tia phân giác của góc đó lấy một điểm M, từ M hạ các đường vuông góc MA, MB xuống cạnh Ox, Oy. Chứng minh: a) Tam giác MAO = tam giác MBO; b) AB vuông góc với OM.');
    expect(goc(p.x, p.O, p.M)).toBeCloseTo(goc(p.M, p.O, p.y), 9);
    expect(thuocTia(p.A, p.O, p.x)).toBe(true);
    expect(thuocTia(p.B, p.O, p.y)).toBe(true);
    expect(goc(p.M, p.A, p.O)).toBeCloseTo(90, 9);
    expect(goc(p.M, p.B, p.O)).toBeCloseTo(90, 9);
    expect(dist(p.M, p.A)).toBeCloseTo(dist(p.M, p.B), 9);
  });

  it('parallelPerp không còn vẽ thêm "đường ⊥ MA qua M" cho "hạ các đường vuông góc MA, MB"', () => {
    expect(intentsOf(parallelPerpRule as any, 'Cho góc xOy. Trên tia phân giác của góc đó lấy một điểm M, từ M hạ các đường vuông góc MA, MB xuống cạnh Ox, Oy.')).toEqual([]);
    // "vuông góc VỚI AB" qua A vẫn là đường hợp lệ
    expect(intentsOf(parallelPerpRule as any, 'Cho tam giác ABC. Qua A kẻ đường thẳng vuông góc với AB.')).toHaveLength(1);
  });

  it('hinh-phang #21 "Qua M vẽ đường thẳng a ⊥ Ox tại A, cắt Oy tại C và vẽ đường thẳng b ⊥ Oy tại B, cắt Ox tại D"', () => {
    const p = toaDoHinh('Cho góc xOy khác góc bẹt, Oz là tia phân giác của góc xOy. Gọi M là một điểm bất kì thuộc tia Oz. Qua M vẽ đường thẳng a vuông góc với Ox tại A, cắt Oy tại C và vẽ đường thẳng b vuông góc với Oy tại B, cắt Ox tại D.');
    expect(thuocTia(p.M, p.O, p.z)).toBe(true);
    expect(goc(p.x, p.O, p.z)).toBeCloseTo(goc(p.z, p.O, p.y), 9);
    expect(thuocTia(p.A, p.O, p.x)).toBe(true);
    expect(goc(p.M, p.A, p.O)).toBeCloseTo(90, 9);
    expect(thuocTia(p.C, p.O, p.y)).toBe(true);
    expect(Math.abs(cheo(p.M, p.A, p.C))).toBeLessThan(1e-9);
    expect(thuocTia(p.B, p.O, p.y)).toBe(true);
    expect(thuocTia(p.D, p.O, p.x)).toBe(true);
    expect(Math.abs(cheo(p.M, p.B, p.D))).toBeLessThan(1e-9);
    // hệ quả: OM là trung trực của CD ⇒ OC = OD
    expect(dist(p.O, p.C)).toBeCloseTo(dist(p.O, p.D), 9);
  });

  it('hinh-phang #14 "tia Ox là đường trung trực của MN và Oy là đường trung trực của MP": ON = OP, P, O, N thẳng hàng', () => {
    const p = toaDoHinh('Cho góc vuông xOy. Điểm M nằm trong góc đó. Vẽ điểm N và P sao cho tia Ox là đường trung trực của MN và Oy là đường trung trực của MP.');
    expect(goc(p.M, p.O, p.x)).toBeGreaterThan(1);
    expect(goc(p.M, p.O, p.y)).toBeGreaterThan(1);
    expect(dist(p.O, p.N)).toBeCloseTo(dist(p.O, p.P), 9);
    expect(dist(p.O, p.N)).toBeCloseTo(dist(p.O, p.M), 9);
    expect(thuocDoan(p.O, p.N, p.P)).toBe(true);
  });

  it('"Trên tia Ox lấy điểm A, trên tia Oy lấy điểm B sao cho OA = OB. Tia phân giác của góc xOy cắt AB tại C": C trung điểm AB', () => {
    const p = toaDoHinh('Cho góc nhọn xOy. Trên tia Ox lấy điểm A, trên tia Oy lấy điểm B sao cho OA = OB. Tia phân giác của góc xOy cắt AB tại C. Chứng minh C là trung điểm của AB.');
    expect(thuocTia(p.A, p.O, p.x)).toBe(true);
    expect(thuocTia(p.B, p.O, p.y)).toBe(true);
    expect(dist(p.O, p.A)).toBeCloseTo(dist(p.O, p.B), 9);
    expect(dist(p.A, p.C)).toBeCloseTo(dist(p.C, p.B), 9);
    expect(thuocDoan(p.C, p.A, p.B)).toBe(true);
  });

  it('"Trên tia Ox lấy hai điểm A và C, trên tia Oy lấy hai điểm B và D sao cho OA = OB, OC = OD": A giữa O và C', () => {
    const p = toaDoHinh('Cho góc xOy khác góc bẹt. Trên tia Ox lấy hai điểm A và C, trên tia Oy lấy hai điểm B và D sao cho OA = OB, OC = OD. Gọi E là giao điểm của AD và BC.');
    expect(thuocDoan(p.A, p.O, p.C)).toBe(true);
    expect(thuocDoan(p.B, p.O, p.D)).toBe(true);
    expect(dist(p.O, p.A)).toBeCloseTo(dist(p.O, p.B), 9);
    expect(dist(p.O, p.C)).toBeCloseTo(dist(p.O, p.D), 9);
    // E nằm trên phân giác (tam giác EAC = EBD)
    expect(goc(p.x, p.O, p.E)).toBeCloseTo(goc(p.E, p.O, p.y), 9);
  });

  it('hinh-phang #79 "Cho góc xOy và tia phân giác Oz. Từ điểm M thuộc Oz kẻ MA // Oy và MB // Ox (A ∈ Ox, B ∈ Oy)": OAMB là hình thoi', () => {
    const p = toaDoHinh('Cho góc xOy và tia phân giác Oz. Từ điểm M thuộc Oz kẻ MA // Oy và MB // Ox (với A ∈ Ox, B ∈ Oy). Chứng minh tứ giác OAMB là hình thoi.');
    expect(thuocTia(p.A, p.O, p.x)).toBe(true);
    expect(thuocTia(p.B, p.O, p.y)).toBe(true);
    expect(thuocTia(p.M, p.O, p.z)).toBe(true);
    const ss = (a: XY, b: XY, c: XY, d: XY) => Math.abs((b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]));
    expect(ss(p.M, p.A, p.O, p.y)).toBeLessThan(1e-9);
    expect(ss(p.M, p.B, p.O, p.x)).toBeLessThan(1e-9);
    // hình thoi: 4 cạnh bằng nhau
    expect(dist(p.O, p.A)).toBeCloseTo(dist(p.A, p.M), 9);
    expect(dist(p.A, p.M)).toBeCloseTo(dist(p.M, p.B), 9);
  });

  it.each([
    ['không có góc chữ thường', 'Cho tam giác ABC. Trên tia AB lấy điểm D.'],
    ['số đo không hợp lệ', 'Cho góc xOy = 200°. Vẽ tia phân giác Oz của góc xOy.'],
    ['góc vuông mà số đo khác 90', 'Cho góc vuông xOy = 60°. Vẽ tia phân giác Oz của góc xOy.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(gocXOyRule, de)).toEqual([]);
  });
});
