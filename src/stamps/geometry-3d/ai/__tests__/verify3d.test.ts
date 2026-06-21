import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d } from '../intent';
import { verifyFigure3d } from '../verify3d';
import { allNamedEntities3DPresent } from '../deterministic/guards3d';

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
});
