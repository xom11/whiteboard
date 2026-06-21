import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d } from '../intent';
import { verifyFigure3d } from '../verify3d';
import { allNamedEntities3DPresent } from '../deterministic/guards3d';
import { tryDeterministicFigure3d } from '../deterministic/tryDeterministicFigure3d';

const fig = intentToScene3d([
  solid({ flavor: 'pyramid', baseLabels: ['A', 'B', 'C', 'D'], baseVariant: 'square', apex: 'S', apexVariant: 'regular' }),
  addPoint3d('M', { kind: 'midpoint', p1: 'B', p2: 'C' }),
]);

describe('verifyFigure3d', () => {
  it('passes for a valid pyramid + midpoint', () => {
    expect(verifyFigure3d(fig).ok).toBe(true);
  });

  it('midpoint coords ≈ average of endpoints — issues list empty', () => {
    expect(verifyFigure3d(fig).issues).toEqual([]);
  });
});

describe('allNamedEntities3DPresent', () => {
  it('all vertices S,A,B,C,D + derived M present', () => {
    const r = allNamedEntities3DPresent('Cho hình chóp S.ABCD. Gọi M là trung điểm của BC.', fig);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('detects missing K when K is not in state', () => {
    const r = allNamedEntities3DPresent('Cho hình chóp S.ABCD. Gọi K là trung điểm của BC.', fig);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('K');
  });

  it("prism ABC.A'B'C': splitLabels keeps primes — A'/B'/C' expected and present in state", () => {
    // Empirical: prism rule produces top vertices labeled A', B', C'
    const prism = "Cho hình lăng trụ ABC.A'B'C' có đáy ABC là tam giác đều.";
    const r = tryDeterministicFigure3d(prism);
    // ok: true means the guard accepted A'/B'/C' present in state
    expect(r.ok).toBe(true);
    if (r.ok) {
      const labels = Object.values(r.state.objects)
        .filter((o) => o.kind === 'point3d')
        .map((o) => o.label)
        .sort();
      // Base AND top vertices must all be present
      expect(labels).toContain('A');
      expect(labels).toContain("A'");
      expect(labels).toContain("B'");
      expect(labels).toContain("C'");
    }
  });

  it("allNamedEntities3DPresent detects A' missing when not in state", () => {
    // Pyramid state (no primes) should NOT satisfy prism problem (expects A',B',C')
    const prismProblem = "Cho hình lăng trụ ABC.A'B'C' có đáy ABC là tam giác đều.";
    const r = allNamedEntities3DPresent(prismProblem, fig); // fig has A,B,C,D,S,M — no primes
    expect(r.ok).toBe(false);
    expect(r.missing.some((l) => l.includes("'"))).toBe(true);
  });
});
