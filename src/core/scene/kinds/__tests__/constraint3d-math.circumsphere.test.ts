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

describe('circumsphereCenter', () => {
  it('tâm cách đều 4 đỉnh không đồng phẳng', () => {
    // (0,0,0),(2,0,0),(0,2,0),(0,0,2) → tâm (1,1,1), R=√3
    const st = stateOf([freePt('a', 0, 0, 0), freePt('b', 2, 0, 0), freePt('c', 0, 2, 0), freePt('d', 0, 0, 2)]);
    const w = constraintToWorld({ kind: 'circumsphereCenter', vertices: ['a', 'b', 'c', 'd'] } as any, st);
    expect(w[0]).toBeCloseTo(1, 9);
    expect(w[1]).toBeCloseTo(1, 9);
    expect(w[2]).toBeCloseTo(1, 9);
    const r = (p: number[]) => Math.hypot(w[0] - p[0], w[1] - p[1], w[2] - p[2]);
    for (const p of [[0, 0, 0], [2, 0, 0], [0, 2, 0], [0, 0, 2]]) expect(r(p)).toBeCloseTo(Math.sqrt(3), 9);
  });

  it('det suy biến (4 điểm đồng phẳng) → fail-soft hữu hạn', () => {
    const st = stateOf([freePt('a', 0, 0, 0), freePt('b', 2, 0, 0), freePt('c', 0, 2, 0), freePt('d', 2, 2, 0)]);
    const w = constraintToWorld({ kind: 'circumsphereCenter', vertices: ['a', 'b', 'c', 'd'] } as any, st);
    expect(w.every((n) => Number.isFinite(n))).toBe(true);
  });
});
