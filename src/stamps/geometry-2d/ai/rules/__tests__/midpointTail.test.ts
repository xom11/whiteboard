/** @jest-environment jsdom */
// "M, N lần lượt là trung điểm của AB, CD và I là trung điểm MN" — trung điểm thứ hai
// đứng SAU cụm phân phối trong cùng mệnh đề. Đo trên hình thật.
import { toaDoHinh, dist } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

it('I là trung điểm MN với M, N là trung điểm AB, CD ⇒ I = (A + B + C + D)/4', () => {
  const p = toaDoHinh('Cho tứ giác ABCD. Gọi M, N lần lượt là trung điểm của AB, CD và I là trung điểm MN. Chứng minh vectơ IA + vectơ IB + vectơ IC + vectơ ID = vectơ 0.');
  expect(dist(p.M, p.A)).toBeCloseTo(dist(p.M, p.B), 9);
  expect(dist(p.N, p.C)).toBeCloseTo(dist(p.N, p.D), 9);
  expect(p.I[0]).toBeCloseTo((p.A[0] + p.B[0] + p.C[0] + p.D[0]) / 4, 9);
  expect(p.I[1]).toBeCloseTo((p.A[1] + p.B[1] + p.C[1] + p.D[1]) / 4, 9);
});

