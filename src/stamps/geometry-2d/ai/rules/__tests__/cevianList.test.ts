/** @jest-environment jsdom */
import { cevianListRule } from '../cevianList';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, dist, thuocDoan, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const goc = (a: XY, o: XY, b: XY) => {
  const u = [a[0] - o[0], a[1] - o[1]];
  const v = [b[0] - o[0], b[1] - o[1]];
  return Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1])));
};
const cheo = (a: XY, b: XY, p: XY) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

function intentsOf(problem: string) {
  return cevianListRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents) as any[];
}

describe('cevianList — danh sách trung tuyến/phân giác/đường cao nối bằng "và" hoặc tên-trước', () => {
  it('hinh-phang #26 "hai đường trung tuyến BD và CE cắt nhau tại G": D, E trung điểm, G trên cả BD lẫn CE', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A có hai đường trung tuyến BD và CE cắt nhau tại G. a) Chứng minh BD = CE.');
    expect(thuocDoan(p.D, p.A, p.C)).toBe(true);
    expect(dist(p.A, p.D)).toBeCloseTo(dist(p.D, p.C), 9);
    expect(thuocDoan(p.E, p.A, p.B)).toBe(true);
    expect(dist(p.A, p.E)).toBeCloseTo(dist(p.E, p.B), 9);
    expect(thuocDoan(p.G, p.B, p.D)).toBe(true);
    expect(thuocDoan(p.G, p.C, p.E)).toBe(true);
    // trọng tâm: BG = 2/3 BD
    expect(dist(p.B, p.G) / dist(p.B, p.D)).toBeCloseTo(2 / 3, 9);
  });

  it('hinh-phang #43 tên-trước "CP, BQ là các đường phân giác trong": P ∈ AB, Q ∈ AC, chia đôi góc', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A. CP, BQ là các đường phân giác trong của tam giác ABC (P ∈ AB, Q ∈ AC). Gọi O là giao điểm của CP và BQ.');
    expect(thuocDoan(p.P, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.Q, p.A, p.C)).toBe(true);
    expect(goc(p.A, p.C, p.P)).toBeCloseTo(goc(p.P, p.C, p.B), 9);
    expect(goc(p.A, p.B, p.Q)).toBeCloseTo(goc(p.Q, p.B, p.C), 9);
    expect(thuocDoan(p.O, p.C, p.P)).toBe(true);
  });

  it('"BD và CE là hai đường cao": chân vuông góc nằm trên cạnh đối diện', () => {
    const p = toaDoHinh('Cho tam giác nhọn ABC. BD và CE là hai đường cao của tam giác ABC.');
    expect(Math.abs(cheo(p.A, p.C, p.D))).toBeLessThan(1e-9);
    expect(Math.abs(cheo(p.A, p.B, p.E))).toBeLessThan(1e-9);
    expect(goc(p.B, p.D, p.C)).toBeCloseTo(Math.PI / 2, 9);
    expect(goc(p.C, p.E, p.B)).toBeCloseTo(Math.PI / 2, 9);
  });

  it.each([
    ['chỉ-phẩy tên-sau (việc của cevian)', 'Cho tam giác ABC có các trung tuyến AM, BN.'],
    ['chân trùng đỉnh', 'Cho tam giác ABC có hai đường cao AH và BC.'],
    ['hai cevian cùng một đỉnh', 'Cho tam giác ABC có hai đường trung tuyến AM và AN.'],
    ['phân giác ngoài', 'Cho tam giác ABC. BD, CE là các đường phân giác ngoài của tam giác ABC.'],
    ['không có tam giác', 'Hai đường trung tuyến BD và CE cắt nhau tại G.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(de)).toEqual([]);
  });
});
