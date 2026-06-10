import { secantRule } from '../secant';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return secantRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents as any[]);
}

describe('secantRule', () => {
  it('"đường thẳng d đi qua A cắt đường tròn tại D và E" → D onCircle, E secondIntersection(AD)', () => {
    const all = run('Cho đường tròn (O). Một đường thẳng d đi qua A cắt đường tròn tại D và E');
    expect(all).toContainEqual(expect.objectContaining({ op: 'add-point', name: 'D', constraint: expect.objectContaining({ kind: 'onCircle' }) }));
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'E',
      constraint: { kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'D' },
    });
  });

  it('"cát tuyến ADE" → A ngoài, D gần (onCircle), E xa (secondIntersection AD)', () => {
    const all = run('Cho đường tròn (O). Từ A kẻ cát tuyến ADE');
    expect(all).toContainEqual(expect.objectContaining({ op: 'add-point', name: 'D', constraint: expect.objectContaining({ kind: 'onCircle' }) }));
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'E',
      constraint: { kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'D' },
    });
  });

  it('"cát tuyến ACD" → C gần, D xa', () => {
    const all = run('Cho đường tròn (O). Kẻ tiếp tuyến AB và cát tuyến ACD');
    expect(all.find((i) => i.name === 'C')?.constraint.kind).toBe('onCircle');
    expect(all.find((i) => i.name === 'D')?.constraint).toEqual({
      kind: 'secondIntersection',
      line: 'AC',
      circle: 'O',
      other: 'C',
    });
  });
});
