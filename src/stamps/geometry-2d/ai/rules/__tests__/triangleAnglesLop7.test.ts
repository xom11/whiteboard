import { gocDeCho, batDangThucCanh, tiSoCanh, toaDoTamGiacTheoGoc } from '../triangleAngles';
import { triangleCanonical } from '../../intent-builders/shared';
import { triangleRule } from '../triangle';
import { segmentClauses } from '../../deterministic/coverage';

const L = ['A', 'B', 'C'] as const;

describe('triangleAngles (lớp 7) — góc / bất đẳng thức / tỉ số cạnh', () => {
  it('đọc "góc A = 90°", "góc ABC = 60°", "góc BAC là góc tù"', () => {
    expect([...gocDeCho('Cho tam giác ABC có góc A = 90°; góc ABC = 60°.', L)!]).toEqual([['A', 90], ['B', 60]]);
    expect(gocDeCho('Cho tam giác ABC có góc BAC là góc tù.', L)!.get('A')).toBe(115);
  });

  it('mâu thuẫn → không dựng theo góc', () => {
    expect(gocDeCho('góc A = 90°. góc A = 60°.', L)).toBeNull();
    expect(toaDoTamGiacTheoGoc(L, 'any', 'Cho tam giác ABC có góc A = 100°, góc B = 90°.', triangleCanonical('any'))).toBeUndefined();
    expect(toaDoTamGiacTheoGoc(L, 'right-at-A', 'Cho tam giác ABC vuông tại A có góc A = 60°.', triangleCanonical('right-at-A'))).toBeUndefined();
  });

  it('bất đẳng thức / tỉ số chỉ lấy cạnh của tam giác', () => {
    expect(batDangThucCanh('Cho tam giác ABC (AB < AC), DE > MN.', L)).toEqual([['AB', 'AC']]);
    expect([...tiSoCanh('tam giác ABC có AB = AC/2', L)]).toEqual([['AB', 0.5], ['AC', 1]]);
    expect(tiSoCanh('tam giác ABC có AB = AC', L).size).toBe(0);
  });

  it('"góc D = 90°" chỉ áp cho tam giác CHỨA đỉnh D (DEF), không đụng ABC', () => {
    const de = 'Cho tam giác ABC và tam giác DEF có góc D = 90°.';
    const ints = triangleRule.match({ problem: de, clauses: segmentClauses(de) }).flatMap((m) => m.intents) as any[];
    const abc = ints.find((i) => i.labels?.join('') === 'ABC');
    const def = ints.find((i) => i.labels?.join('') === 'DEF');
    expect(abc.explicitCoords).toBeUndefined();
    const [D, E, F] = ['D', 'E', 'F'].map((k) => def.explicitCoords[k]);
    expect((E[0] - D[0]) * (F[0] - D[0]) + (E[1] - D[1]) * (F[1] - D[1])).toBeCloseTo(0, 9);
  });
});
