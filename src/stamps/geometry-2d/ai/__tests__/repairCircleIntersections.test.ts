import { repairCircleIntersections } from '../repairCircleIntersections';
import type { DslPointT, DslShapeT } from '../../dsl/schema';

function dist(points: DslPointT[], a: string, b: string): number {
  const pa = points.find((p) => p.name === a) as Extract<DslPointT, { kind: 'free' }>;
  const pb = points.find((p) => p.name === b) as Extract<DslPointT, { kind: 'free' }>;
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}

describe('repairCircleIntersections', () => {
  it('repositions tangent circleCR centers so circles intersect at 2 points', () => {
    // O=(3,3), O'=(-3,3), both r=3 → distance 6 = r1+r2 → externally tangent.
    const points: DslPointT[] = [
      { name: 'O', kind: 'free', x: 3, y: 3 },
      { name: "O'", kind: 'free', x: -3, y: 3 },
      { name: 'A', kind: 'circleIntersection', c1: 'kO', c2: 'kOp', which: 0 },
      { name: 'B', kind: 'circleIntersection', c1: 'kO', c2: 'kOp', which: 1 },
    ];
    const shapes: DslShapeT[] = [
      { name: 'kO', kind: 'circleCR', center: 'O', radius: 3 },
      { name: 'kOp', kind: 'circleCR', center: "O'", radius: 3 },
    ];

    repairCircleIntersections(points, shapes);

    const d = dist(points, 'O', "O'");
    // Proper 2-point lens: |r1-r2| < d < r1+r2  → 0 < d < 6, and comfortably inside.
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(6 * 0.95);
  });

  it('leaves already-intersecting circles unchanged', () => {
    const points: DslPointT[] = [
      { name: 'O', kind: 'free', x: 0, y: 0 },
      { name: 'P', kind: 'free', x: 3, y: 0 },
      { name: 'A', kind: 'circleIntersection', c1: 'k1', c2: 'k2', which: 0 },
    ];
    const shapes: DslShapeT[] = [
      { name: 'k1', kind: 'circleCR', center: 'O', radius: 3 },
      { name: 'k2', kind: 'circleCR', center: 'P', radius: 3 },
    ];
    const before = JSON.stringify(points);
    repairCircleIntersections(points, shapes);
    expect(JSON.stringify(points)).toBe(before);
  });

  it('repositions disjoint circles (distance > r1+r2) to intersect', () => {
    // O=(0,0) r=2, P=(10,0) r=2 → far apart, disjoint.
    const points: DslPointT[] = [
      { name: 'O', kind: 'free', x: 0, y: 0 },
      { name: 'P', kind: 'free', x: 10, y: 0 },
      { name: 'A', kind: 'circleIntersection', c1: 'k1', c2: 'k2', which: 0 },
    ];
    const shapes: DslShapeT[] = [
      { name: 'k1', kind: 'circleCR', center: 'O', radius: 2 },
      { name: 'k2', kind: 'circleCR', center: 'P', radius: 2 },
    ];
    repairCircleIntersections(points, shapes);
    const d = dist(points, 'O', 'P');
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(4 * 0.95); // r1+r2 = 4
    // direction preserved (P stays to the +x side of O)
    const O = points.find((p) => p.name === 'O') as Extract<DslPointT, { kind: 'free' }>;
    const P = points.find((p) => p.name === 'P') as Extract<DslPointT, { kind: 'free' }>;
    expect(P.x).toBeGreaterThan(O.x);
  });

  it('does not touch a non-free center', () => {
    // c2 center is a midpoint (derived) — must not be repositioned.
    const points: DslPointT[] = [
      { name: 'O', kind: 'free', x: 0, y: 0 },
      { name: 'X', kind: 'free', x: 12, y: 0 },
      { name: 'Y', kind: 'free', x: 16, y: 0 },
      { name: 'M', kind: 'midpoint', p1: 'X', p2: 'Y' },
      { name: 'A', kind: 'circleIntersection', c1: 'k1', c2: 'k2', which: 0 },
    ];
    const shapes: DslShapeT[] = [
      { name: 'k1', kind: 'circleCR', center: 'O', radius: 2 },
      { name: 'k2', kind: 'circleCR', center: 'M', radius: 2 },
    ];
    repairCircleIntersections(points, shapes);
    // c1 center O is free → it should be moved toward M (which stays put).
    const O = points.find((p) => p.name === 'O') as Extract<DslPointT, { kind: 'free' }>;
    const M = points.find((p) => p.name === 'M');
    expect(M).toEqual({ name: 'M', kind: 'midpoint', p1: 'X', p2: 'Y' }); // unchanged
    // O moved toward M=(14,0): distance O→(14,0) now < 4
    expect(Math.hypot(O.x - 14, O.y - 0)).toBeLessThan(4 * 0.95);
  });
});
