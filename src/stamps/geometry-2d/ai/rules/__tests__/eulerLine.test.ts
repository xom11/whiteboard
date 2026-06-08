import { eulerLineRule } from '../eulerLine';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return eulerLineRule.match({ problem, clauses: segmentClauses(problem) });
}

function intents(problem: string) {
  return run(problem).flatMap((m) => m.intents as any[]);
}

describe('eulerLineRule (issue #47)', () => {
  it('"Cho tam giác ABC. Vẽ đường thẳng Euler." → centroid G + orthocenter H + circumcenter O + lineThrough[G,H,O]', () => {
    const all = intents('Cho tam giác ABC. Vẽ đường thẳng Euler.');
    expect(all).toHaveLength(4);

    const g = all.find((i) => i.op === 'add-point' && i.constraint.kind === 'centroid');
    const h = all.find((i) => i.op === 'add-point' && i.constraint.kind === 'orthocenter');
    const o = all.find((i) => i.op === 'add-point' && i.constraint.kind === 'circumcenter');
    expect(g).toEqual({ op: 'add-point', name: 'G', constraint: { kind: 'centroid', of: ['A', 'B', 'C'] } });
    expect(h).toEqual({ op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] } });
    expect(o).toEqual({ op: 'add-point', name: 'O', constraint: { kind: 'circumcenter', of: ['A', 'B', 'C'] } });

    const line = all.find((i) => i.op === 'draw-line' && i.kind === 'lineThrough');
    expect(line).toBeDefined();
    expect(line.points).toEqual(['G', 'H', 'O']);
    expect(line.name).toBe('eulerABC');
  });

  it('suy biến: "Cho tam giác đều ABC. Vẽ đường thẳng Euler." → KHÔNG emit (G≡H≡O)', () => {
    expect(run('Cho tam giác đều ABC. Vẽ đường thẳng Euler.')).toEqual([]);
  });

  it('không có tam giác: "Vẽ đường thẳng Euler." → KHÔNG emit', () => {
    expect(run('Vẽ đường thẳng Euler.')).toEqual([]);
  });

  it('nhập nhằng >1 tam giác: "Cho tam giác ABC và tam giác DEF. Vẽ đường thẳng Euler." → KHÔNG emit', () => {
    expect(run('Cho tam giác ABC và tam giác DEF. Vẽ đường thẳng Euler.')).toEqual([]);
  });

  it('"Cho tam giác ABC. Vẽ đường tròn Euler." → KHÔNG emit (regex loại "đường tròn Euler")', () => {
    expect(run('Cho tam giác ABC. Vẽ đường tròn Euler.')).toEqual([]);
  });
});
