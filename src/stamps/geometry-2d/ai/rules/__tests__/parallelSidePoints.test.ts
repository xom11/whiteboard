import { parallelSidePointsRule } from '../parallelSidePoints';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return parallelSidePointsRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents as any[]);
}

describe('parallelSidePointsRule', () => {
  // hinh9:59 / son123:44 — "Q,R lần lượt thuộc AC và AB sao cho PQ ∥ AB, PR ∥ AC".
  it('"Q,R lần lượt thuộc AC và AB sao cho PQ ∥ AB,PR ∥ AC" → Q,R = giao đường song song với cạnh', () => {
    const all = intents('Cho tam giác ABC. P trên BC. Q,R lần lượt thuộc AC và AB sao cho PQ ∥ AB,PR ∥ AC');
    const q = all.find((i) => i.op === 'add-point' && i.name === 'Q');
    const r = all.find((i) => i.op === 'add-point' && i.name === 'R');
    expect(q?.constraint.kind).toBe('intersection');
    expect(r?.constraint.kind).toBe('intersection');
    // Q nằm trên AC; R nằm trên AB (1 trong 2 ref của intersection).
    expect(q.constraint.of).toContain('AC');
    expect(r.constraint.of).toContain('AB');
    // có 2 đường song song qua P.
    const par = all.filter((i) => i.op === 'draw-line' && i.kind === 'parallelThrough');
    expect(par.length).toBe(2);
    expect(par.every((p) => p.through === 'P')).toBe(true);
  });

  it('không match khi thiếu "sao cho ... ∥ ..."', () => {
    expect(intents('Cho tam giác ABC. Q, R lần lượt thuộc AC và AB.')).toEqual([]);
  });

  it('không match khi anchor của 2 đoạn khác nhau (PQ ∥ AB, XR ∥ AC)', () => {
    expect(intents('Q,R lần lượt thuộc AC và AB sao cho PQ ∥ AB, XR ∥ AC')).toEqual([]);
  });
});
