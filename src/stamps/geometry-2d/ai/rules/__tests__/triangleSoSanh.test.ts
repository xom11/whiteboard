/** @jest-environment jsdom */
import { toaDoHinh, dist, type XY } from '../../__tests__/helpers/toaDoHinh';
import { triangleRule } from '../triangle';
import { segmentClauses } from '../../deterministic/coverage';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});
const vuong = (v: XY, p: XY, q: XY) => Math.abs((p[0] - v[0]) * (q[0] - v[0]) + (p[1] - v[1]) * (q[1] - v[1])) < 1e-9;

describe('tam giác theo so sánh cạnh / vuông cân (đề thật, đo toạ độ)', () => {
  it.each([
    ['lop8 #63 vuông tại A "(AB < AC)"', 'Cho tam giác ABC vuông tại A (AB < AC). Kẻ đường cao AH (H ∈ BC).', [['AB', 'AC']]],
    ['hinh-phang #118 nhọn "(AB < AC)"', 'Cho tam giác ABC nhọn (AB < AC). Các đường cao BN, CP cắt nhau tại H.', [['AB', 'AC']]],
    ['vao10 chuỗi "AB < AC < BC"', 'Cho tam giác ABC có AB < AC < BC và nội tiếp (O).', [['AB', 'AC'], ['AC', 'BC']]],
  ])('%s', (_t, de, ss) => {
    const p = toaDoHinh(de);
    for (const [n, d] of ss as string[][]) expect(dist(p[n[0]], p[n[1]])).toBeLessThan(dist(p[d[0]], p[d[1]]));
  });

  it('vuông tại A vẫn vuông sau khi đổi chiều cạnh', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A (AB < AC). Kẻ đường cao AH (H ∈ BC).');
    expect(vuong(p.A, p.B, p.C)).toBe(true);
  });

  it('hinh-phang #78 "vuông cân tại C": góc C vuông, CA = CB', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông cân tại C. Trên các cạnh AC, BC lấy lần lượt các điểm P, Q sao cho AP = CQ.');
    expect(vuong(p.C, p.A, p.B)).toBe(true);
    expect(dist(p.C, p.A)).toBeCloseTo(dist(p.C, p.B), 9);
  });

  it('vuông cân dựng trên cạnh hình khác → KHÔNG áp toạ độ vuông cân (cần dựng từ cạnh, chưa hỗ trợ)', () => {
    const de = 'Cho hình bình hành ABCD. Vẽ ra ngoài hình bình hành các tam giác ABM vuông cân tại A, tam giác BCN vuông cân tại C.';
    const tri = triangleRule.match({ problem: de, clauses: segmentClauses(de) }).flatMap((m) => m.intents) as any[];
    expect(tri.filter((i) => i.op === 'draw-shape' && i.explicitCoords?.A?.[1] === 2)).toEqual([]);
  });
});
