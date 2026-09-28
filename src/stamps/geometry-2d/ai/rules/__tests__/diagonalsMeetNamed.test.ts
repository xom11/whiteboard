/** @jest-environment jsdom */
import { diagonalsMeetNamedRule } from '../diagonalsMeetNamed';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, dist, type XY } from '../../__tests__/helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const thangHang = (p: XY, a: XY, b: XY) =>
  Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) < 1e-9;

function intentsOf(problem: string) {
  return diagonalsMeetNamedRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents) as any[];
}

/** Đề thật trong docs/datasets/hinh-phang-tong-hop-2026-09.txt — đo toạ độ bằng JSXGraph thật. */
describe('diagonalsMeetNamed — giao hai đường chéo / hai cạnh bên', () => {
  it('#73 hình bình hành: O là trung điểm CẢ HAI đường chéo; trung điểm OB, OD dựng được', () => {
    const p = toaDoHinh('Cho hình bình hành ABCD, gọi O là giao điểm của hai đường chéo. Gọi P và Q lần lượt là trung điểm của OB, OD.');
    expect(dist(p.O, p.A)).toBeCloseTo(dist(p.O, p.C), 9);
    expect(dist(p.O, p.B)).toBeCloseTo(dist(p.O, p.D), 9);
    expect(dist(p.P, p.O)).toBeCloseTo(dist(p.O, p.B) / 2, 9);
  });

  it('#70 hình thang cân: O = AC ∩ BD, E = giao hai đường thẳng chứa cạnh bên AD, BC', () => {
    const p = toaDoHinh('Cho hình thang cân ABCD có AB // CD, O là giao điểm của hai đường chéo, E là giao điểm của hai đường thẳng chứa cạnh bên AD và BC.');
    expect(thangHang(p.O, p.A, p.C) && thangHang(p.O, p.B, p.D)).toBe(true);
    expect(thangHang(p.E, p.A, p.D) && thangHang(p.E, p.B, p.C)).toBe(true);
  });

  it('"hai đường chéo cắt nhau tại O" (không nêu tên đường chéo)', () => {
    const ints = intentsOf('Cho hình thoi ABCD có hai đường chéo cắt nhau tại O.');
    expect(ints.find((i) => i.name === 'O')?.constraint).toEqual({ kind: 'intersection', of: ['AC', 'BD'] });
  });

  it('#112 "E là giao điểm của các đường thẳng AB và CD"', () => {
    const ints = intentsOf('Cho tứ giác ABCD. Gọi E là giao điểm của các đường thẳng AB và CD.');
    expect(ints.find((i) => i.name === 'E')?.constraint).toEqual({ kind: 'intersection', of: ['AB', 'CD'] });
  });

  it.each([
    ['không có tứ giác đặt tên', 'Cho tam giác ABC, O là giao điểm của hai đường chéo.'],
    ['tên giao điểm trùng đỉnh', 'Cho hình bình hành ABCD, A là giao điểm của hai đường chéo.'],
    ['hai đường thẳng chung đầu mút', 'Gọi E là giao điểm của các đường thẳng AB và BC.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(de)).toEqual([]);
  });
});
