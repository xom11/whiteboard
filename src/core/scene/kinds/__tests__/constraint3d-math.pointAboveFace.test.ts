import type { State, SceneObject } from '../../types';
import { constraintToWorld } from '../constraint3d-math';

function freePt(id: string, x: number, y: number, z: number): SceneObject {
  return {
    id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs: { constraint: { kind: 'free', x, y, z } },
  } as SceneObject;
}
function derivedPt(id: string, constraint: unknown): SceneObject {
  return {
    id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs: { constraint },
  } as SceneObject;
}
function stateOf(pts: SceneObject[]): State {
  const objects: Record<string, SceneObject> = {};
  for (const p of pts) objects[p.id] = p;
  return { objects, order: pts.map((p) => p.id), counter: pts.length, meta: { domain: '3d' } } as unknown as State;
}

describe('pointAboveFace', () => {
  // Mặt BCD trên z=0; đỉnh A ở (1,1,5). base = centroid(BCD). topCenter = (Gx, Gy, 5).
  it('topCenter trên trục ⊥ mặt, đúng chiều cao = dist(apex, mặt)', () => {
    const st = stateOf([
      freePt('A', 1, 1, 5),
      freePt('B', 0, 0, 0), freePt('C', 2, 0, 0), freePt('D', 1, 2, 0),
      derivedPt('O', { kind: 'centroid', vertices: ['B', 'C', 'D'] }),
    ]);
    const G = constraintToWorld({ kind: 'centroid', vertices: ['B', 'C', 'D'] } as any, st);
    const w = constraintToWorld({ kind: 'pointAboveFace', base: 'O', apex: 'A', vertices: ['B', 'C', 'D'] } as any, st);
    expect(w[0]).toBeCloseTo(G[0], 9);
    expect(w[1]).toBeCloseTo(G[1], 9);
    expect(w[2]).toBeCloseTo(5, 9);
  });

  it('mặt nghiêng (y=0): apex (1,4,1) → topCenter offset dọc +y một đoạn 4', () => {
    const st = stateOf([
      freePt('A', 1, 4, 1),
      freePt('B', 0, 0, 0), freePt('C', 2, 0, 0), freePt('D', 0, 0, 2),
      derivedPt('O', { kind: 'centroid', vertices: ['B', 'C', 'D'] }),
    ]);
    const G = constraintToWorld({ kind: 'centroid', vertices: ['B', 'C', 'D'] } as any, st);
    const w = constraintToWorld({ kind: 'pointAboveFace', base: 'O', apex: 'A', vertices: ['B', 'C', 'D'] } as any, st);
    expect(w[0]).toBeCloseTo(G[0], 9);
    expect(w[1]).toBeCloseTo(4, 9);
    expect(w[2]).toBeCloseTo(G[2], 9);
  });

  it('suy biến (apex trên mặt, h≈0) → trùng base (hữu hạn)', () => {
    const st = stateOf([
      freePt('A', 5, 0, 0),
      freePt('B', 0, 0, 0), freePt('C', 2, 0, 0), freePt('D', 0, 0, 2),
      derivedPt('O', { kind: 'centroid', vertices: ['B', 'C', 'D'] }),
    ]);
    const G = constraintToWorld({ kind: 'centroid', vertices: ['B', 'C', 'D'] } as any, st);
    const w = constraintToWorld({ kind: 'pointAboveFace', base: 'O', apex: 'A', vertices: ['B', 'C', 'D'] } as any, st);
    expect(w.every((n) => Number.isFinite(n))).toBe(true);
    expect(w[0]).toBeCloseTo(G[0], 9); expect(w[1]).toBeCloseTo(G[1], 9); expect(w[2]).toBeCloseTo(G[2], 9);
  });
});
