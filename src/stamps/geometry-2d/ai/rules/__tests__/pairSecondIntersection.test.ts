import { pairSecondIntersectionRule } from '../pairSecondIntersection';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return pairSecondIntersectionRule.match({ problem, clauses: segmentClauses(problem) });
}

function intents(problem: string) {
  return run(problem).flatMap((m) => m.intents as any[]);
}

describe('pairSecondIntersectionRule', () => {
  it('Bài 18: "MA và MB thứ tự cắt đường tròn (O) tại C và D" → C,D secondIntersection on O', () => {
    const p =
      'Cho đường tròn (O) đường kính AB. MA và MB thứ tự cắt đường tròn (O) tại C và D.';
    const out = intents(p);
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'C',
      constraint: { kind: 'secondIntersection', line: 'MA', circle: 'O', other: 'A' },
    });
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'D',
      constraint: { kind: 'secondIntersection', line: 'MB', circle: 'O', other: 'B' },
    });
  });

  it('Bài 16: unnamed circle resolves to the unique diameter-circle kBD; other from prior intersection / diameter endpoint', () => {
    const p =
      'Cho tam giác ABC vuông ở A và một điểm D nằm giữa A và B. Đường tròn đường kính BD cắt BC tại E. Các đường thẳng CD, AE lần lượt cắt đường tròn tại F, G.';
    const out = intents(p);
    // CD → D is a diameter endpoint of BD → other = D
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'F',
      constraint: { kind: 'secondIntersection', line: 'CD', circle: 'kBD', other: 'D' },
    });
    // AE → E is a prior "cắt BC tại E" intersection on kBD → other = E
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'G',
      constraint: { kind: 'secondIntersection', line: 'AE', circle: 'kBD', other: 'E' },
    });
  });

  it('skips when unnamed circle is ambiguous (>1 diameter circle, no (X))', () => {
    const p =
      'Đường tròn đường kính AB và đường tròn đường kính CD. PQ, RS cắt đường tròn tại M, N.';
    expect(intents(p)).toEqual([]);
  });

  it('falls back to second letter of line when neither endpoint is a circle-member', () => {
    const p = 'Cho đường tròn (O). PA và QB lần lượt cắt đường tròn (O) tại M và N.';
    const out = intents(p);
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'secondIntersection', line: 'PA', circle: 'O', other: 'A' },
    });
    expect(out).toContainEqual({
      op: 'add-point',
      name: 'N',
      constraint: { kind: 'secondIntersection', line: 'QB', circle: 'O', other: 'B' },
    });
  });

  it('does not fire on single form "CM cắt (O) tại N"', () => {
    expect(intents('Cho đường tròn (O). CM cắt (O) tại N')).toEqual([]);
  });
});
