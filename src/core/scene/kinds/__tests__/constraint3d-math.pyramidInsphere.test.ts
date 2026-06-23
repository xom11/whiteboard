import type { State, SceneObject } from '../../types';
import { constraintToWorld } from '../constraint3d-math';

function freePt(id: string, x: number, y: number, z: number): SceneObject {
  return {
    id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs: { constraint: { kind: 'free', x, y, z } },
  } as SceneObject;
}
function stateOf(pts: SceneObject[]): State {
  const objects: Record<string, SceneObject> = {};
  for (const p of pts) objects[p.id] = p;
  return { objects, order: pts.map((p) => p.id), counter: pts.length, meta: { domain: '3d' } } as unknown as State;
}
// Khoảng cách điểm P tới mặt phẳng (a,b,c).
function planeDist(P: number[], a: number[], b: number[], cc: number[]): number {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2 = [cc[0] - a[0], cc[1] - a[1], cc[2] - a[2]];
  const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  const nn = Math.hypot(n[0], n[1], n[2]) || 1;
  return Math.abs(((P[0] - a[0]) * n[0] + (P[1] - a[1]) * n[1] + (P[2] - a[2]) * n[2]) / nn);
}

describe('pyramidInsphereCenter', () => {
  it('chóp vuông đều: tâm trên trục, cách đều đáy + 4 mặt bên', () => {
    // base square side 2 at z=0, apex (0,0,2). Insphere center (0,0,(√5−1)/2≈0.618).
    const A = [1, 1, 0], B = [-1, 1, 0], C = [-1, -1, 0], D = [1, -1, 0], S = [0, 0, 2];
    const st = stateOf([
      freePt('A', 1, 1, 0), freePt('B', -1, 1, 0), freePt('C', -1, -1, 0), freePt('D', 1, -1, 0), freePt('S', 0, 0, 2),
    ]);
    const w = constraintToWorld({ kind: 'pyramidInsphereCenter', apex: 'S', vertices: ['A', 'B', 'C', 'D'] } as any, st);
    expect(w[0]).toBeCloseTo(0, 6);
    expect(w[1]).toBeCloseTo(0, 6);
    expect(w[2]).toBeCloseTo((Math.sqrt(5) - 1) / 2, 4); // ≈0.618
    const rBase = w[2]; // dist tâm→đáy (z) = bán kính insphere
    for (const [p, q] of [[A, B], [B, C], [C, D], [D, A]]) {
      expect(planeDist([w[0], w[1], w[2]], S, p, q)).toBeCloseTo(rBase, 4);
    }
  });

  it('tam giác đáy + apex lệch → vẫn hữu hạn', () => {
    const st = stateOf([freePt('A', 0, 0, 0), freePt('B', 2, 0, 0), freePt('C', 1, 2, 0), freePt('S', 5, 5, 3)]);
    const w = constraintToWorld({ kind: 'pyramidInsphereCenter', apex: 'S', vertices: ['A', 'B', 'C'] } as any, st);
    expect(w.every((n) => Number.isFinite(n))).toBe(true);
  });
});
