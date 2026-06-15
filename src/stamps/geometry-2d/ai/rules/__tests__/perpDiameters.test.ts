import { perpDiametersRule } from '../perpDiameters';
import { segmentClauses } from '../../deterministic/coverage';
import { SYMBOLIC_RADIUS } from '../circleRadius';

function intents(problem: string) {
  return perpDiametersRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('perpDiametersRule', () => {
  const P =
    'Cho đường tròn (O) bán kính R có hai đường kính AB và CD vuông góc với nhau.';

  it('emits circle O (centerRadius) + center O + 4 onCircle points', () => {
    const all = intents(P);
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'O',
      constraint: { kind: 'free' },
    });
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'O',
      spec: 'centerRadius',
      center: 'O',
      radius: SYMBOLIC_RADIUS,
    });
    const onCircle = all.filter((i) => i.constraint?.kind === 'onCircle');
    expect(onCircle.map((i) => i.name).sort()).toEqual(['A', 'B', 'C', 'D']);
    // AB trục ngang (0, π); CD trục dọc (π/2, 3π/2) ⇒ vuông góc.
    const byName = Object.fromEntries(onCircle.map((i) => [i.name, i.constraint.theta]));
    expect(byName.A).toBeCloseTo(0);
    expect(byName.B).toBeCloseTo(Math.PI);
    expect(byName.C).toBeCloseTo(Math.PI / 2);
    expect(byName.D).toBeCloseTo((3 * Math.PI) / 2);
  });

  it('claims the diameter clause', () => {
    const m = perpDiametersRule.match({ problem: P, clauses: segmentClauses(P) });
    expect(m).toHaveLength(1);
    expect(m[0].clauseIds.length).toBeGreaterThan(0);
  });

  it('fail-safe: chỉ một đường kính → không khớp', () => {
    expect(intents('Cho đường tròn (O) đường kính AB.')).toEqual([]);
  });

  // vao10:71 — ký hiệu ⊥ vừa là separator vừa là khẳng định vuông góc.
  it('"Cho (O;R) có hai đường kính AB ⊥ CD" (⊥ giữa 2 đường kính)', () => {
    const all = intents('Cho (O;R) có hai đường kính AB ⊥ CD.');
    const oncircle = all.filter((i) => i.constraint?.kind === 'onCircle').map((i) => i.name).sort();
    expect(oncircle).toEqual(['A', 'B', 'C', 'D']);
  });
});
