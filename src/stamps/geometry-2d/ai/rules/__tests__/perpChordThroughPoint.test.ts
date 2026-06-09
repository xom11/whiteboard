import { perpChordThroughPointRule } from '../perpChordThroughPoint';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return perpChordThroughPointRule.match({ problem, clauses: segmentClauses(problem) });
}

function intents(problem: string): any[] {
  return run(problem).flatMap((m) => m.intents);
}

const BASE = 'Cho đường tròn (O) đường kính AC. Gọi M là trung điểm của đoạn AB. ';

describe('perpChordThroughPointRule', () => {
  it('"Qua M kẻ dây cung DE vuông góc với AB" → perpThrough line + D,E giao với (O) + đoạn DE', () => {
    const all = intents(BASE + 'Qua M kẻ dây cung DE vuông góc với AB.');

    // 1) đường vuông góc qua M tới AB.
    const line = all.find((i) => i.op === 'draw-line');
    expect(line).toBeDefined();
    expect(line.kind).toBe('perpThrough');
    expect(line.through).toBe('M');
    expect(line.to).toBe('AB');

    // 2) D,E = giao đường ⊥ với đường tròn đường kính (O_c), 2 nhánh khác nhau.
    const pts = all.filter((i) => i.op === 'add-point' && i.constraint.kind === 'intersection');
    expect(pts.map((i) => i.name).sort()).toEqual(['D', 'E']);
    for (const p of pts) {
      expect(p.constraint.of[0]).toBe(line.name);
      expect(p.constraint.of[1]).toBe('O_c'); // resolve tên đường tròn đường kính
    }
    expect(pts[0].constraint.branch).not.toBe(pts[1].constraint.branch);

    // 3) đoạn DE (dây).
    expect(all).toContainEqual({ op: 'connect', from: 'D', to: 'E', style: 'segment' });
  });

  it('không match khi không có đường tròn đường kính trong đề', () => {
    expect(intents('Gọi M là trung điểm BC. Qua M kẻ dây cung DE vuông góc với BC.')).toEqual([]);
  });

  it('không match khi clause không có "vuông góc"', () => {
    expect(intents(BASE + 'Qua M kẻ dây cung DE.')).toEqual([]);
  });

  it('claim clause chứa "dây cung DE vuông góc" (coverage)', () => {
    const problem = BASE + 'Qua M kẻ dây cung DE vuông góc với AB.';
    const clauses = segmentClauses(problem);
    const matches = perpChordThroughPointRule.match({ problem, clauses });
    const claimed = new Set<number>();
    for (const m of matches) for (const id of m.clauseIds) claimed.add(id);
    const target = clauses.find((c) => /dây\s+cung\s+DE/u.test(c.text));
    expect(target).toBeDefined();
    expect(claimed.has(target!.id)).toBe(true);
  });
});
