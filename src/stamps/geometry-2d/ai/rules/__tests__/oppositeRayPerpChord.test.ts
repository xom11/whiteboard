import { oppositeRayPointRule } from '../oppositeRayPoint';
import { perpChordAtFootRule } from '../perpChordAtFoot';
import { segmentClauses } from '../../deterministic/coverage';

function run(rule: any, problem: string) {
  return rule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m: any) => m.intents);
}

describe('oppositeRayPointRule', () => {
  // vao10: tên đứng TRƯỚC — "Lấy điểm A trên tia đối của tia CB".
  it('"Lấy điểm A trên tia đối của tia CB" → A = pointAtDistance(from B, through C)', () => {
    const all = run(oppositeRayPointRule, 'Lấy điểm A trên tia đối của tia CB');
    const i = all[0] as any;
    expect(i.name).toBe('A');
    expect(i.constraint).toMatchObject({ kind: 'pointAtDistance', from: 'B', through: 'C' });
  });

  it('"Trên tia đối của tia AB lấy điểm C" → C = pointAtDistance(from B, through A)', () => {
    const all = run(oppositeRayPointRule, 'Trên tia đối của tia AB lấy điểm C');
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      op: 'add-point',
      name: 'C',
      constraint: { kind: 'pointAtDistance', from: 'B', through: 'A', distance: { kind: 'literal' } },
    });
  });

  // vxhung:11 "trên tia đối của BA lấy điểm C" — thiếu "tia" thứ 2 + lowercase.
  it('thiếu "tia" thứ 2: "trên tia đối của BA lấy điểm C" → C = pointAtDistance(from A, through B)', () => {
    const all = run(oppositeRayPointRule, 'trên tia đối của BA lấy điểm C');
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      op: 'add-point',
      name: 'C',
      constraint: { kind: 'pointAtDistance', from: 'A', through: 'B' },
    });
  });

  // httcd:148 "Trên tia đối của tia AB lấy một điểm M" — "một điểm" xen giữa.
  it('"Trên tia đối của tia AB lấy một điểm M" → M = pointAtDistance(from B, through A)', () => {
    const all = run(oppositeRayPointRule, 'Trên tia đối của tia AB lấy một điểm M');
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'pointAtDistance', from: 'B', through: 'A' },
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
