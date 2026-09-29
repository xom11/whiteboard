/** @jest-environment jsdom */
// Danh sách đường đặc biệt nối bằng "và": "AD và CE là hai đường cao", "phân giác BE và
// CF", "hai đường trung tuyến BD và CE" — đo chân đường trên hình thật.
import { toaDoHinh, dist, thuocDoan, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});
const dot = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);
const goc = (p: XY, q: XY, r: XY) => Math.atan2(Math.abs((p[0] - q[0]) * (r[1] - q[1]) - (p[1] - q[1]) * (r[0] - q[0])), dot(q, p, q, r));

it('lop10 #48 "AD và CE là hai đường cao": AD ⊥ BC, CE ⊥ AB', () => {
  const p = toaDoHinh('Cho tam giác ABC có góc B nhọn, AD và CE là hai đường cao. a) Chứng minh S_BDE/S_BAC = (BD.BE)/(BA.BC).');
  expect(dot(p.A, p.D, p.B, p.C)).toBeCloseTo(0, 9);
  expect(dot(p.C, p.E, p.A, p.B)).toBeCloseTo(0, 9);
});

it('vao10 #115 "phân giác BE và CF cắt nhau tại I": E ∈ AC, F ∈ AB, BE, CF chia đôi góc', () => {
  const p = toaDoHinh('Cho tam giác ABC vuông tại A có phân giác BE và CF cắt nhau tại I. Gọi K là trung điểm EF.');
  expect(thuocDoan(p.E, p.A, p.C)).toBe(true);
  expect(thuocDoan(p.F, p.A, p.B)).toBe(true);
  expect(goc(p.A, p.B, p.E)).toBeCloseTo(goc(p.E, p.B, p.C), 9);
  expect(goc(p.A, p.C, p.F)).toBeCloseTo(goc(p.F, p.C, p.B), 9);
});

it('hinh-phang #26 "hai đường trung tuyến BD và CE cắt nhau tại G"', () => {
  const p = toaDoHinh('Cho tam giác ABC cân tại A có hai đường trung tuyến BD và CE cắt nhau tại G.');
  expect(dist(p.D, p.A)).toBeCloseTo(dist(p.D, p.C), 9);
  expect(dist(p.E, p.A)).toBeCloseTo(dist(p.E, p.B), 9);
  expect(p.G[0]).toBeCloseTo((p.A[0] + p.B[0] + p.C[0]) / 3, 9);
});
