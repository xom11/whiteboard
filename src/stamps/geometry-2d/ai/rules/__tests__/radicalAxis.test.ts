import { radicalAxisRule } from '../radicalAxis';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return radicalAxisRule.match({ problem, clauses: segmentClauses(problem) });
}

function intents(problem: string) {
  return run(problem).flatMap((m) => m.intents as any[]);
}

describe('radicalAxisRule (issue #47, construct 2)', () => {
  it('"Cho hai đường tròn (O; 3) và (I; 2). Vẽ trục đẳng phương." → 1 draw-line radicalAxis {circle1:O, circle2:I}', () => {
    const all = intents('Cho hai đường tròn (O; 3) và (I; 2). Vẽ trục đẳng phương.');
    expect(all).toHaveLength(1);
    const rad = all.find((i) => i.op === 'draw-line' && i.kind === 'radicalAxis');
    expect(rad).toBeDefined();
    expect(rad.circle1).toBe('O');
    expect(rad.circle2).toBe('I');
    expect(rad.name).toBe('radOI');
  });

  it('suy biến đồng tâm: "(O; 3) và (O; 5)" → KHÔNG emit (1 center phân biệt)', () => {
    expect(run('Cho hai đường tròn đồng tâm (O; 3) và (O; 5). Vẽ trục đẳng phương.')).toEqual([]);
  });

  it('chỉ 1 đường tròn: "(O; 3)" → KHÔNG emit (không đủ 2)', () => {
    expect(run('Cho đường tròn (O; 3). Vẽ trục đẳng phương.')).toEqual([]);
  });

  it('>2 đường tròn → nhập nhằng → KHÔNG emit', () => {
    expect(
      run('Cho ba đường tròn (O; 3), (I; 2) và (K; 4). Vẽ trục đẳng phương.'),
    ).toEqual([]);
  });
});
