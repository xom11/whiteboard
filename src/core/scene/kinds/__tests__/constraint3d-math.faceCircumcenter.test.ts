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

describe('faceCircumcenter', () => {
  it('tam giác phẳng z=0 → tâm (1,1,0), R=√2', () => {
    const st = stateOf([freePt('a', 0, 0, 0), freePt('b', 2, 0, 0), freePt('c', 0, 2, 0)]);
    const w = constraintToWorld({ kind: 'faceCircumcenter', vertices: ['a', 'b', 'c'] } as any, st);
    expect(w[0]).toBeCloseTo(1, 9); expect(w[1]).toBeCloseTo(1, 9); expect(w[2]).toBeCloseTo(0, 9);
    const r = (p: number[]) => Math.hypot(w[0] - p[0], w[1] - p[1], w[2] - p[2]);
    for (const p of [[0, 0, 0], [2, 0, 0], [0, 2, 0]]) expect(r(p)).toBeCloseTo(Math.sqrt(2), 9);
  });
  it('tam giác nghiêng (mặt y=0) → tâm (1,0,1)', () => {
    const st = stateOf([freePt('a', 0, 0, 0), freePt('b', 2, 0, 0), freePt('c', 0, 0, 2)]);
    const w = constraintToWorld({ kind: 'faceCircumcenter', vertices: ['a', 'b', 'c'] } as any, st);
    expect(w[0]).toBeCloseTo(1, 9); expect(w[1]).toBeCloseTo(0, 9); expect(w[2]).toBeCloseTo(1, 9);
  });
  it('collinear → fallback centroid hữu hạn', () => {
    const st = stateOf([freePt('a', 0, 0, 0), freePt('b', 1, 0, 0), freePt('c', 2, 0, 0)]);
    const w = constraintToWorld({ kind: 'faceCircumcenter', vertices: ['a', 'b', 'c'] } as any, st);
    expect(w.every((n) => Number.isFinite(n))).toBe(true);
  });
});
