import { diameterCircleSecantRule } from '../diameterCircleSecant';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return diameterCircleSecantRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents as any[]);
}

describe('diameterCircleSecantRule', () => {
  it('"vẽ đường tròn đường kính MC. BM cắt đường tròn tại D. AD cắt đường tròn tại S"', () => {
    const all = run(
      'Trên cạnh AC lấy điểm M và vẽ đường tròn đường kính MC. Kẻ BM cắt đường tròn tại D. Đường thẳng AD cắt đường tròn tại S',
    );
    // circle kMC theo 2 đầu mút.
    expect(all).toContainEqual(expect.objectContaining({ op: 'draw-circle', name: 'kMC', spec: 'diameter' }));
    // D: giao BM với kMC, other=M (M ∈ đường tròn đường kính MC).
    expect(all).toContainEqual({ op: 'add-point', name: 'D', constraint: { kind: 'secondIntersection', line: 'BM', circle: 'kMC', other: 'M' } });
    // S: giao AD với kMC, other=D (D vừa dựng trên đường tròn).
    expect(all).toContainEqual({ op: 'add-point', name: 'S', constraint: { kind: 'secondIntersection', line: 'AD', circle: 'kMC', other: 'D' } });
  });

  it('KHÔNG đụng "(O) đường kính AB" (có tên tâm → circleDiameter sở hữu)', () => {
    const all = run('Cho đường tròn (O) đường kính AB');
    expect(all).toHaveLength(0);
  });
});
