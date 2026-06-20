import { multiDiameterCirclesRule } from '../multiDiameterCircles';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return multiDiameterCirclesRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('multiDiameterCirclesRule — arbelos phrasing', () => {
  // T4 (vxhung #34 / httcd:250 dạng SẠCH): "Nửa đường tròn đường kính BH, CH lần
  // lượt có tâm O, O'". RE hiện tại đã phủ ("lần lượt có" nằm trong bridge tâm).
  it('"đường kính BH, CH lần lượt có tâm O, O\'" → 2 nửa đtròn đường kính BH/CH', () => {
    const all = intents("Nửa đường tròn đường kính BH, CH lần lượt có tâm O, O'.");
    // 2 đường tròn đường kính trên 2 đoạn con.
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'draw-circle', spec: 'diameter', endpoints: ['B', 'H'] }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'draw-circle', spec: 'diameter', endpoints: ['C', 'H'] }),
    );
    // 2 tâm là trung điểm 2 đoạn — tên KHÁC nhau (O, O').
    const centerNames = all
      .filter((i) => i.op === 'add-point' && i.constraint?.kind === 'midpoint')
      .map((i) => i.name);
    expect(centerNames).toEqual(expect.arrayContaining(['O', "O'"]));
  });

  // Phrasing cũ "theo thứ tự là" (3 nửa đtròn) — không regress.
  it('"đường kính theo thứ tự là AB, AC, CB ... tâm theo thứ tự là O, I, K"', () => {
    const all = intents(
      'Vẽ các nửa đường tròn có đường kính theo thứ tự là AB, AC, CB và có tâm theo thứ tự là O, I, K.',
    );
    const diamEnds = all
      .filter((i) => i.op === 'draw-circle' && i.spec === 'diameter')
      .map((i) => i.endpoints.join(''));
    expect(diamEnds).toEqual(expect.arrayContaining(['AB', 'AC', 'CB']));
  });
});
