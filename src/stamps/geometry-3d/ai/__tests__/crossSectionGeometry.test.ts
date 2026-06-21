// __tests__/crossSectionGeometry.test.ts
import {
  planeFrame, signedDistance, edgePlaneCrossing, extractEdges, orderAroundPerimeter,
  type Vec3,
} from '../crossSectionGeometry';

const near = (a: number, b: number, t = 1e-9) => Math.abs(a - b) < t;

describe('extractEdges', () => {
  it('square-pyramid faces → 8 unique edges', () => {
    const faces = [[0,1,2,3],[0,1,4],[1,2,4],[2,3,4],[3,0,4]];
    expect(extractEdges(faces).length).toBe(8);
  });
  it('dedups shared edges regardless of direction', () => {
    expect(extractEdges([[0,1,2],[2,1,3]]).length).toBe(5); // 01,12,20,13,23 (12==21 deduped)
  });
});

describe('planeFrame + signedDistance', () => {
  it('z=0 plane: normal ∥ z, base points have distance 0, apex positive', () => {
    const f = planeFrame([0,0,0], [1,0,0], [0,1,0]);
    expect(near(Math.abs(f.normal[2]), 1)).toBe(true);
    expect(near(signedDistance([5,5,0], f), 0)).toBe(true);
    expect(signedDistance([0,0,2], f)).not.toBe(0);
  });
});

describe('edgePlaneCrossing', () => {
  const f = planeFrame([0,0,0], [1,0,0], [0,1,0]); // z=0
  it('edge crossing z=0 returns t in (0,1)', () => {
    expect(near(edgePlaneCrossing([0,0,-1], [0,0,1], f)!, 0.5)).toBe(true);
  });
  it('same-side edge returns null', () => {
    expect(edgePlaneCrossing([0,0,1], [0,0,2], f)).toBeNull();
  });
  it('endpoint on plane returns null (handled as a vertex, not a crossing)', () => {
    expect(edgePlaneCrossing([0,0,0], [0,0,2], f)).toBeNull();
  });
});

describe('orderAroundPerimeter', () => {
  it('returns a cyclic permutation of a square given in scrambled order', () => {
    const f = planeFrame([0,0,0], [1,0,0], [0,1,0]);
    const pts: Vec3[] = [[1,1,0],[-1,-1,0],[1,-1,0],[-1,1,0]];
    const order = orderAroundPerimeter(pts, f);
    expect(order.length).toBe(4);
    expect(new Set(order).size).toBe(4); // permutation
    // consecutive points in order share an edge of the square (differ in exactly one axis sign)
    const seq = order.map((i) => pts[i]);
    for (let i = 0; i < 4; i++) {
      const a = seq[i], b = seq[(i+1)%4];
      const diff = (a[0] !== b[0] ? 1 : 0) + (a[1] !== b[1] ? 1 : 0);
      expect(diff).toBe(1);
    }
  });
});
