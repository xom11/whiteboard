import { externalPointAtRadiusRule } from '../externalPointAtRadius';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return externalPointAtRadiusRule.match({ problem, clauses: segmentClauses(problem) });
}
function ctOf(problem: string, name: string) {
  return run(problem)
    .flatMap((m) => m.intents)
    .find((i: any) => i.name === name) as any;
}

describe('externalPointAtRadiusRule', () => {
  it('"điểm A sao cho OA = 3R" (O tâm) → A externalToCircle(O)', () => {
    const i = ctOf('Cho đường tròn (O) và một điểm A sao cho OA = 3R', 'A');
    expect(i.op).toBe('add-point');
    expect(i.constraint).toEqual({ kind: 'externalToCircle', circle: 'O' });
  });

  it('"OM =2R" (O tâm) → M external', () => {
    const i = ctOf('Cho đường tròn (O), M là điểm nằm ngoài sao cho OM =2R', 'M');
    expect(i.constraint).toEqual({ kind: 'externalToCircle', circle: 'O' });
  });

  it('thứ tự đảo "AO = 3R" vẫn nhận (O là tâm)', () => {
    const i = ctOf('Cho đường tròn tâm O. Lấy A sao cho AO = 3R', 'A');
    expect(i.constraint).toEqual({ kind: 'externalToCircle', circle: 'O' });
  });

  it('FAIL-SAFE: "AB = 2R" (cả A,B đều KHÔNG tâm) → bỏ qua', () => {
    expect(run('Cho tam giác ABC có AB = 2R')).toHaveLength(0);
  });

  it('FAIL-SAFE: "OA = R" (k=1, trên đường tròn) → bỏ qua', () => {
    expect(run('Cho đường tròn (O) và A với OA = R')).toHaveLength(0);
  });
});
