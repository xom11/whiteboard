import { circleDiameterRule } from '../circleDiameter';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return circleDiameterRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

function matches(problem: string) {
  return circleDiameterRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('circleDiameterRule', () => {
  it('"Cho đường tròn (O) đường kính AB" → endpoints + center midpoint + diameter circle', () => {
    const all = intents('Cho đường tròn (O) đường kính AB cố định.');
    expect(all).toEqual([
      { op: 'add-point', name: 'A', constraint: { kind: 'free' } },
      { op: 'add-point', name: 'B', constraint: { kind: 'free' } },
      { op: 'add-point', name: 'O', constraint: { kind: 'midpoint', of: 'AB' } },
      { op: 'connect', from: 'A', to: 'B', style: 'segment' },
      { op: 'draw-circle', name: 'O_c', spec: 'diameter', endpoints: ['A', 'B'] },
    ]);
  });

  it('"Cho (O;R) đường kính AB" compact notation', () => {
    const all = intents('Cho (O;R) đường kính AB cố định.');
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'O_c',
      spec: 'diameter',
      endpoints: ['A', 'B'],
    });
    expect(all).toContainEqual({ op: 'add-point', name: 'O', constraint: { kind: 'midpoint', of: 'AB' } });
  });

  it('compact "(O; R)" claim cả clause chứa tâm và clause chứa đường kính', () => {
    const m = matches('Cho đường tròn (O; R) đường kính AB.');
    expect(m).toHaveLength(1);
    expect(m[0].clauseIds).toEqual([0, 1]);
  });

  it('"Cho nửa đường tròn (O) đường kính AB" uses the support circle', () => {
    const all = intents('Cho nửa đường tròn (O) đường kính AB.');
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'O_c',
      spec: 'diameter',
      endpoints: ['A', 'B'],
    });
  });

  it('fail-safe: thiếu tâm → không claim', () => {
    expect(intents('Cho đường tròn đường kính AB.')).toEqual([]);
  });

  it('fail-safe: tâm trùng đầu mút → không claim', () => {
    expect(intents('Cho đường tròn (A) đường kính AB.')).toEqual([]);
  });
});
