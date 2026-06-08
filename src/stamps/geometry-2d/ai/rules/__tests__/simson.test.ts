import { simsonRule } from '../simson';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return simsonRule.match({ problem, clauses: segmentClauses(problem) });
}

function intents(problem: string) {
  return run(problem).flatMap((m) => m.intents as any[]);
}

describe('simsonRule (issue #47)', () => {
  it('"tam giác ABC nội tiếp (O), Simson của P" → onCircle P + 3 perpFoot + lineThrough', () => {
    const all = intents(
      'Cho tam giác ABC nội tiếp đường tròn (O). Vẽ đường thẳng Simson của P.',
    );
    expect(all).toHaveLength(5);

    const p = all.find((i) => i.op === 'add-point' && i.constraint.kind === 'onCircle');
    expect(p).toEqual({
      op: 'add-point',
      name: 'P',
      constraint: { kind: 'onCircle', circle: 'O', theta: 0.7 },
    });

    const feet = all.filter((i) => i.op === 'add-point' && i.constraint.kind === 'perpFoot');
    expect(feet).toHaveLength(3);
    expect(feet.map((f) => f.name).sort()).toEqual(['SABC1', 'SABC2', 'SABC3']);
    // 3 chân hạ xuống 3 cạnh BC / CA / AB.
    expect(feet.map((f) => f.constraint.onLine).sort()).toEqual(['AB', 'BC', 'CA']);
    for (const f of feet) expect(f.constraint.from).toBe('P');

    const line = all.find((i) => i.op === 'draw-line' && i.kind === 'lineThrough');
    expect(line).toBeDefined();
    expect(line.name).toBe('simsonP');
    expect(new Set(line.points)).toEqual(new Set(['SABC1', 'SABC2', 'SABC3']));
  });

  it('thiếu đường tròn ngoại tiếp: "Cho tam giác ABC. Vẽ đường thẳng Simson của P." → KHÔNG emit', () => {
    expect(run('Cho tam giác ABC. Vẽ đường thẳng Simson của P.')).toEqual([]);
  });

  it('nhập nhằng >1 tam giác → KHÔNG emit', () => {
    expect(
      run('Cho tam giác ABC nội tiếp (O) và tam giác DEF. Vẽ đường thẳng Simson của P.'),
    ).toEqual([]);
  });

  it('suy biến: P trùng đỉnh ("Simson của A") → KHÔNG emit', () => {
    expect(
      run('Cho tam giác ABC nội tiếp đường tròn (O). Vẽ đường thẳng Simson của A.'),
    ).toEqual([]);
  });
});
