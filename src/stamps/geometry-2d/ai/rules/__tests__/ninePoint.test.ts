import { ninePointRule } from '../ninePoint';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return ninePointRule.match({ problem, clauses: segmentClauses(problem) });
}

function intents(problem: string) {
  return run(problem).flatMap((m) => m.intents as any[]);
}

describe('ninePointRule (issue #47, construct 4)', () => {
  it('"đường tròn chín điểm của tam giác ABC" → 3 midpoint + circle3 through3', () => {
    const all = intents('Cho tam giác ABC. Vẽ đường tròn chín điểm của tam giác ABC.');
    expect(all).toHaveLength(4);

    // 3 trung điểm cạnh: MAB, MBC, MCA via of:'AB'/'BC'/'CA'.
    const mids = all.filter((i) => i.op === 'add-point' && i.constraint.kind === 'midpoint');
    expect(mids).toHaveLength(3);
    expect(mids.map((m) => m.name).sort()).toEqual(['MAB', 'MBC', 'MCA']);
    expect(mids.map((m) => m.constraint.of).sort()).toEqual(['AB', 'BC', 'CA']);

    // circle3 qua 3 trung điểm = đường tròn chín điểm.
    const circle = all.find((i) => i.op === 'draw-circle' && i.spec === 'through3');
    expect(circle).toBeDefined();
    expect(circle.name).toBe('N9');
    expect(new Set(circle.points)).toEqual(new Set(['MAB', 'MBC', 'MCA']));
  });

  it('"đường tròn Euler của tam giác ABC" (tên gọi khác) → cùng kết quả', () => {
    const all = intents('Cho tam giác ABC. Vẽ đường tròn Euler của tam giác ABC.');
    expect(all).toHaveLength(4);
    const circle = all.find((i) => i.op === 'draw-circle' && i.spec === 'through3');
    expect(circle).toBeDefined();
    expect(new Set(circle.points)).toEqual(new Set(['MAB', 'MBC', 'MCA']));
    expect(all.filter((i) => i.op === 'add-point' && i.constraint.kind === 'midpoint')).toHaveLength(3);
  });

  it('nhập nhằng >1 tam giác → KHÔNG emit', () => {
    expect(
      run('Cho tam giác ABC và tam giác DEF. Vẽ đường tròn chín điểm.'),
    ).toEqual([]);
  });

  it('"đường thẳng Euler" là đường THẲNG Euler (construct 1) → ninePoint KHÔNG claim', () => {
    expect(run('Cho tam giác ABC. Vẽ đường thẳng Euler.')).toEqual([]);
  });
});
