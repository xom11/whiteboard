/** @jest-environment jsdom */
import { midpointReflectRule } from '../midpointReflect';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, dist, thuocDoan, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const trungDiem = (m: XY, a: XY, b: XY) => Math.hypot(m[0] - (a[0] + b[0]) / 2, m[1] - (a[1] + b[1]) / 2) < 1e-9;

function intentsOf(problem: string) {
  return midpointReflectRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents) as any[];
}

describe('midpointReflect — "lấy điểm D sao cho C là trung điểm của AD"', () => {
  it('hinh-phang #27: C (đỉnh tam giác) giữ nguyên, D mới sao cho C là trung điểm AD; E trung điểm BD', () => {
    const p = toaDoHinh('Cho tam giác ABC. Trên cạnh BC lấy điểm G sao cho BG = 2GC. Vẽ điểm D sao cho C là trung điểm của AD. Gọi E là trung điểm của BD.');
    expect(trungDiem(p.C, p.A, p.D)).toBe(true);
    expect(trungDiem(p.E, p.B, p.D)).toBe(true);
    // tam giác ABC không suy biến (C không bị kéo thành trung điểm)
    expect(dist(p.A, p.C)).toBeGreaterThan(0.5);
    // đề bắt chứng minh A, G, E thẳng hàng ⇒ hình đúng thì thẳng hàng thật
    const cheo = (p.E[0] - p.A[0]) * (p.G[1] - p.A[1]) - (p.E[1] - p.A[1]) * (p.G[0] - p.A[0]);
    expect(Math.abs(cheo)).toBeLessThan(1e-9);
  });

  it('"Trên tia đối của tia MA lấy điểm D sao cho M là trung điểm của AD": D trên tia đối, MD = MA', () => {
    const p = toaDoHinh('Cho tam giác ABC, M là trung điểm của BC. Trên tia đối của tia MA lấy điểm D sao cho M là trung điểm của AD.');
    expect(trungDiem(p.M, p.A, p.D)).toBe(true);
    expect(thuocDoan(p.M, p.A, p.D)).toBe(true);
    expect(trungDiem(p.M, p.B, p.C)).toBe(true);
  });

  it.each([
    ['điểm mới không phải đầu mút', 'Cho tam giác ABC. Vẽ điểm D sao cho C là trung điểm của AB.'],
    ['tâm trùng đầu mút', 'Cho tam giác ABC. Vẽ điểm D sao cho D là trung điểm của AD.'],
    ['không có "sao cho"', 'Cho tam giác ABC. Gọi M là trung điểm của BC.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(de)).toEqual([]);
  });
});
