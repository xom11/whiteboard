import { tangentFromPointAtRule } from '../tangentFromPointAt';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return tangentFromPointAtRule.match({ problem, clauses: segmentClauses(problem) });
}
function intents(problem: string) {
  return run(problem).flatMap((m) => m.intents as any[]);
}

describe('tangentFromPointAtRule', () => {
  it('"từ P kẻ tiếp tuyến tiếp xúc với (O) tại M" → tangentFromExt line + tangentPoint M (Bài 7)', () => {
    const problem = 'Lấy điểm P ngoài (O), từ P kẻ tiếp tuyến tiếp xúc với (O) tại M.';
    const out = intents(problem);
    expect(out).toContainEqual({
      op: 'draw-line',
      name: 't',
      kind: 'tangentFromExt',
      from: 'P',
      circle: 'O',
      which: 'first',
    });
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'tangentPoint', from: 'P', circle: 'O', which: 0 },
    });
  });

  it('biến thể "tiếp xúc đường tròn (O) tại M"', () => {
    const out = intents('Từ P kẻ tiếp tuyến tiếp xúc đường tròn (O) tại M.');
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'tangentPoint', from: 'P', circle: 'O', which: 0 },
    });
  });

  it('không match khi không có "tiếp xúc … tại"', () => {
    expect(intents('Kẻ hai tiếp tuyến từ P đến (O).')).toEqual([]);
  });
});
