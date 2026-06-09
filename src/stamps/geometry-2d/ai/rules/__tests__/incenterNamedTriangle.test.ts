import { incenterNamedTriangleRule } from '../incenterNamedTriangle';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return incenterNamedTriangleRule.match({ problem, clauses: segmentClauses(problem) });
}

function intents(problem: string) {
  return run(problem).flatMap((m) => m.intents as any[]);
}

function findIncenter(problem: string, name: string) {
  return intents(problem).find(
    (i) => i.op === 'add-point' && i.constraint.kind === 'incenter' && i.name === name,
  );
}

describe('incenterNamedTriangleRule', () => {
  // === Bài 80 — distributive form ===========================================
  const BAI80 =
    'Cho tam giác ABC vuông tại A. Kẻ đường cao AH. Gọi I, K tương ứng là tâm các đường tròn nội tiếp tam giác ABH và tam giác ACH.';

  it('Bài 80: "I, K tương ứng là tâm ... nội tiếp tam giác ABH và tam giác ACH" → I=incenter(ABH), K=incenter(ACH)', () => {
    const i = findIncenter(BAI80, 'I');
    const k = findIncenter(BAI80, 'K');
    expect(i).toBeDefined();
    expect(i.constraint).toEqual({ kind: 'incenter', of: ['A', 'B', 'H'] });
    expect(k).toBeDefined();
    expect(k.constraint).toEqual({ kind: 'incenter', of: ['A', 'C', 'H'] });
  });

  it('Bài 80: claims the clause that contains "tâm ... nội tiếp"', () => {
    const matches = run(BAI80);
    expect(matches.length).toBeGreaterThan(0);
    const clauses = segmentClauses(BAI80);
    const incClause = clauses.find((c) => /nội\s*tiếp/u.test(c.text));
    expect(incClause).toBeDefined();
    const claimed = new Set(matches.flatMap((m) => m.clauseIds));
    expect(claimed.has(incClause!.id)).toBe(true);
  });

  it('distributive "lần lượt" variant', () => {
    const p =
      'Cho tam giác ABC. Gọi P, Q lần lượt là tâm đường tròn nội tiếp tam giác ABD và tam giác ACD.';
    expect(findIncenter(p, 'P').constraint).toEqual({ kind: 'incenter', of: ['A', 'B', 'D'] });
    expect(findIncenter(p, 'Q').constraint).toEqual({ kind: 'incenter', of: ['A', 'C', 'D'] });
  });

  // === single explicit in-clause triangle (multi-triangle problem) ==========
  it('single form with explicit in-clause triangle, problem has many triangles → no ambiguity', () => {
    const p =
      'Cho tam giác ABC vuông tại A. Kẻ đường cao AH. I là tâm đường tròn nội tiếp tam giác ABH.';
    const i = findIncenter(p, 'I');
    expect(i).toBeDefined();
    expect(i.constraint).toEqual({ kind: 'incenter', of: ['A', 'B', 'H'] });
  });

  // === fail-safe ============================================================
  it('no in-clause triangle for single form → no emit (defer to centers/escalate)', () => {
    expect(intents('Cho tam giác ABC. I là tâm đường tròn nội tiếp')).toEqual([]);
  });

  it('not an incenter clause → no emit', () => {
    expect(intents('Cho tam giác ABC. Gọi O là tâm đường tròn ngoại tiếp tam giác ABC')).toEqual(
      [],
    );
  });
});
