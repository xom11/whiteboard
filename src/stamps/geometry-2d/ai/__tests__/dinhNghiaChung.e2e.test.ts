/** @jest-environment jsdom */
// Một điểm được nhiều rule định nghĩa: ràng buộc CHUNG ("dây CD" → C, D trên (O);
// "A, B thuộc (O)") không được đè ràng buộc CỤ THỂ (giao thứ hai, cát tuyến, cung).
import { toaDoHinh, dist, thuocDoan } from './helpers/toaDoHinh';
import { thangHang, trenDuongTron, cungPhia, khac } from './helpers/doHinh';
import { boDinhNghiaChung } from '../deterministic/runDeterministicIntents';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

describe('boDinhNghiaChung', () => {
  it('bỏ onCircle/free/onSegment của điểm đã có ràng buộc cụ thể, giữ điểm chỉ có ràng buộc chung', () => {
    const ra = boDinhNghiaChung([
      { op: 'add-point', name: 'C', constraint: { kind: 'onCircle', circle: 'O', theta: 2.3 } },
      { op: 'add-point', name: 'D', constraint: { kind: 'onCircle', circle: 'O', theta: 0.7 } },
      { op: 'add-point', name: 'C', constraint: { kind: 'secondIntersection', line: 'MD', circle: 'O', other: 'D' } },
    ] as never);
    expect(ra.map((i: any) => `${i.name}:${i.constraint.kind}`)).toEqual(['D:onCircle', 'C:secondIntersection']);
  });
});

describe('đề thật', () => {
  it('lop9 #14 (Hà Nam 2025): "dây CD" không đè C = giao thứ hai, D thuộc cung lớn AB', () => {
    const p = toaDoHinh(`Cho đường tròn (O, R) và điểm M nằm ngoài (O). Từ điểm M kẻ hai tiếp tuyến MA, MB (A và B là các tiếp điểm). Xét điểm D thuộc cung lớn AB (D không nằm chính giữa cung AB), đường thẳng MD cắt (O) tại điểm C. Gọi E là trung điểm của dây CD, tia BE cắt đường tròn (O) tại điểm F.
a) Chứng minh bốn điểm M, A, O, B cùng thuộc một đường tròn.`);
    const R = dist(p.O, p.A);
    expect(trenDuongTron(p.D, p.O, R) && trenDuongTron(p.C, p.O, R)).toBe(true);
    expect(cungPhia(p.A, p.B, p.D, p.O)).toBe(true); // cung lớn
    expect(thangHang(p.C, p.M, p.D) && khac(p.C, p.D)).toBe(true);
    expect(thuocDoan(p.C, p.M, p.D, 1e-7)).toBe(true); // C là giao gần
  });

  it('lop9 #43: "Vẽ cát tuyến MAB … A, B thuộc đường tròn (O), A nằm giữa M và B"', () => {
    const p = toaDoHinh(`Cho một điểm M nằm bên ngoài đường tròn (O; 6 cm). Kẻ hai tiếp tuyến MN, MP (N, P là hai tiếp điểm) của đường tròn (O). Vẽ cát tuyến MAB của đường tròn (O) sao cho đoạn thẳng AB = 6 cm với A, B thuộc đường tròn (O), A nằm giữa M và B.
b) Gọi H là trung điểm đoạn thẳng AB. So sánh góc MON và góc MHN.`);
    expect(thuocDoan(p.A, p.M, p.B, 1e-7)).toBe(true);
    const R = dist(p.O, p.N);
    expect(trenDuongTron(p.A, p.O, R) && trenDuongTron(p.B, p.O, R)).toBe(true);
  });
});
