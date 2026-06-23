import type { State, SceneObject } from '../../../../core/scene/types';
import { verifyFigure3d } from '../verify3d';

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

// verify branch = re-derive độc lập (planeFrame normal) cross-check toạ độ từ constraintToWorld
// ⟹ bắt impl-drift (math sai normal/base) + NaN. Hình lệch thật = MCP visual gate (Task 4).
describe('verify3d pointAboveFace', () => {
  it('pointAboveFace hợp lệ (mặt nghiêng) → KHÔNG issue', () => {
    const st = stateOf([
      freePt('A', 1, 1, 5),
      freePt('B', 0, 0, 0), freePt('C', 2, 0, 0), freePt('D', 1, 2, 0),
      derivedPt('O', { kind: 'centroid', vertices: ['B', 'C', 'D'] }),
      derivedPt('T', { kind: 'pointAboveFace', base: 'O', apex: 'A', vertices: ['B', 'C', 'D'] }),
    ]);
    const { issues } = verifyFigure3d(st);
    expect(issues.filter((i) => i.includes('pointAboveFace'))).toEqual([]);
  });

  it('apex trên mặt (h≈0) → w=base, hữu hạn, KHÔNG báo sai chiều cao', () => {
    const st = stateOf([
      freePt('A', 5, 0, 0),
      freePt('B', 0, 0, 0), freePt('C', 2, 0, 0), freePt('D', 0, 0, 2),
      derivedPt('O', { kind: 'centroid', vertices: ['B', 'C', 'D'] }),
      derivedPt('T', { kind: 'pointAboveFace', base: 'O', apex: 'A', vertices: ['B', 'C', 'D'] }),
    ]);
    const { issues } = verifyFigure3d(st);
    expect(issues.filter((i) => i.includes('pointAboveFace'))).toEqual([]);
  });
});
