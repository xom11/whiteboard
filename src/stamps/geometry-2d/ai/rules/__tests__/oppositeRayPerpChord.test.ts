import { oppositeRayPointRule } from '../oppositeRayPoint';
import { perpChordAtFootRule } from '../perpChordAtFoot';
import { segmentClauses } from '../../deterministic/coverage';

function run(rule: any, problem: string) {
  return rule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m: any) => m.intents);
}

describe('oppositeRayPointRule', () => {
  it('"Trên tia đối của tia AB lấy điểm C" → C = pointAtDistance(from B, through A)', () => {
    const all = run(oppositeRayPointRule, 'Trên tia đối của tia AB lấy điểm C');
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      op: 'add-point',
      name: 'C',
      constraint: { kind: 'pointAtDistance', from: 'B', through: 'A', distance: { kind: 'literal' } },
    });
  });
});

describe('perpChordAtFootRule', () => {
  it('"Kẻ dây DE ⊥ AB tại H" → E=reflectLine(D,AB), H=perpFoot(D,AB), đoạn DE', () => {
    const all = run(perpChordAtFootRule, 'Kẻ dây DE ⊥ AB tại H');
    expect(all).toContainEqual({ op: 'add-point', name: 'E', constraint: { kind: 'reflectLine', of: 'D', through: 'AB' } });
    expect(all).toContainEqual({ op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'D', onLine: 'AB' } });
    expect(all).toContainEqual({ op: 'connect', from: 'D', to: 'E', style: 'segment' });
  });

  it('"dây MN vuông góc với d" không "tại" → vẫn E reflect, không H', () => {
    const all = run(perpChordAtFootRule, 'Kẻ dây MN vuông góc với BC');
    expect(all).toContainEqual({ op: 'add-point', name: 'N', constraint: { kind: 'reflectLine', of: 'M', through: 'BC' } });
    expect(all.some((i: any) => i.constraint?.kind === 'perpFoot')).toBe(false);
  });
});
