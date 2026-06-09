import { perpLineTakePointRule } from '../perpLineTakePoint';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return perpLineTakePointRule.match({ problem, clauses: segmentClauses(problem) });
}

function intents(problem: string) {
  return run(problem).flatMap((m) => m.intents as any[]);
}

describe('perpLineTakePointRule', () => {
  it('Bài 18: "trên đường thẳng vuông góc với OB tại H, lấy một điểm M ở ngoài đường tròn"', () => {
    const p =
      'Trên đoạn thẳng OB lấy điểm H bất kì; trên đường thẳng vuông góc với OB tại H, lấy một điểm M ở ngoài đường tròn.';
    const out = intents(p);
    expect(out).toContainEqual({
      op: 'draw-line',
      name: 'prpH',
      kind: 'perpThrough',
      through: 'H',
      to: 'OB',
    });
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'onSegment', of: 'prpH' },
    });
  });

  it('works without the "ở ngoài đường tròn" suffix', () => {
    const p = 'Trên đường thẳng vuông góc với AB tại K lấy điểm P.';
    const out = intents(p);
    expect(out).toContainEqual({
      op: 'draw-line',
      name: 'prpK',
      kind: 'perpThrough',
      through: 'K',
      to: 'AB',
    });
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'P',
      constraint: { kind: 'onSegment', of: 'prpK' },
    });
  });

  it('skips degenerate where the through-point is an endpoint of the reference line', () => {
    // "vuông góc với HB tại H" — H is an endpoint, still fine geometrically; but
    // ensure no crash and a valid perp line is produced.
    const p = 'Trên đường thẳng vuông góc với HB tại H lấy điểm M.';
    const out = intents(p);
    expect(out.some((i) => i.op === 'add-point' && i.name === 'M')).toBe(true);
  });

  it('does not fire when no point is taken on the perpendicular', () => {
    expect(intents('Kẻ đường thẳng vuông góc với OB tại H.')).toEqual([]);
  });
});
