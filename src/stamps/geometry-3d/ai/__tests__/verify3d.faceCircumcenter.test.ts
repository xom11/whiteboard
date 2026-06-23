import { verifyFigure3d } from '../verify3d';
import type { State, SceneObject } from '../../../../core/scene';

function pt(id: string, c: any): SceneObject {
  return { id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { constraint: c } } as SceneObject;
}
function stateOf(pts: SceneObject[]): State {
  const objects: Record<string, SceneObject> = {};
  for (const p of pts) objects[p.id] = p;
  return { objects, order: pts.map((p) => p.id), counter: pts.length, meta: { domain: '3d' } } as unknown as State;
}

describe('verify3d faceCircumcenter', () => {
  it('tâm ngoại tiếp hợp lệ → ok', () => {
    const st = stateOf([
      pt('A', { kind: 'free', x: 0, y: 0, z: 0 }), pt('B', { kind: 'free', x: 2, y: 0, z: 0 }), pt('C', { kind: 'free', x: 0, y: 2, z: 0 }),
      pt('O', { kind: 'faceCircumcenter', vertices: ['A', 'B', 'C'] }),
    ]);
    expect(verifyFigure3d(st).ok).toBe(true);
  });
  it('collinear → fallback centroid không cách đều → báo issue', () => {
    const st = stateOf([
      pt('A', { kind: 'free', x: 0, y: 0, z: 0 }), pt('B', { kind: 'free', x: 1, y: 0, z: 0 }), pt('C', { kind: 'free', x: 2, y: 0, z: 0 }),
      pt('O', { kind: 'faceCircumcenter', vertices: ['A', 'B', 'C'] }),
    ]);
    const r = verifyFigure3d(st);
    expect(r.ok).toBe(false);
    expect(r.issues.join('\n')).toMatch(/không cách đều/);
  });
});
