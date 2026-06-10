import { tangentPointsFromExtRule } from '../tangentPointsFromExt';
import { segmentClauses } from '../../deterministic/coverage';

describe('tangentPointsFromExtRule', () => {
  it('"Từ A kẻ tới đường tròn ngoại tiếp tam giác BIC các tiếp tuyến AP, AQ"', () => {
    const P = 'Từ A kẻ tới đường tròn ngoại tiếp tam giác BIC các tiếp tuyến AP, AQ (P, Q là các tiếp điểm)';
    const it = tangentPointsFromExtRule.match({ problem: P, clauses: segmentClauses(P) }).flatMap((m) => m.intents) as any[];
    expect(it.find((i) => i.name === 'P').constraint).toEqual({ kind: 'tangentPoint', from: 'A', circle: 'O', which: 0 });
    expect(it.find((i) => i.name === 'Q').constraint).toEqual({ kind: 'tangentPoint', from: 'A', circle: 'O', which: 1 });
  });
  it('với "(K)" tường minh → circle K', () => {
    const P = 'Từ A kẻ tới (K) các tiếp tuyến AP, AQ';
    const it = tangentPointsFromExtRule.match({ problem: P, clauses: segmentClauses(P) }).flatMap((m) => m.intents) as any[];
    expect(it.find((i) => i.name === 'P').constraint.circle).toBe('K');
  });
});
