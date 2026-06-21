import { verifyFigure3d } from '../verify3d';
import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d, sphereIntent } from '../intent';
import type { State, SceneObject } from '../../../../core/scene';

describe('verify3d — sphere', () => {
  it('mặt cầu ngoại tiếp tứ diện đều hợp lệ → ok', () => {
    const st = intentToScene3d([
      solid({ flavor: 'tetrahedron', baseLabels: ['A', 'B', 'C'], baseVariant: 'equilateral-triangle', apex: 'D', apexVariant: 'regular' }),
      addPoint3d('O', { kind: 'circumsphereCenter', vertices: ['A', 'B', 'C', 'D'] }),
      sphereIntent({ center: 'O', surfacePoint: 'A' }),
    ]);
    const v = verifyFigure3d(st);
    expect(v.ok).toBe(true);
  });

  it('mặt cầu bán kính 0 (tâm ≡ surface) → fail', () => {
    const objects: Record<string, SceneObject> = {};
    const pt = (id: string, x: number, y: number, z: number) => {
      objects[id] = { id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { constraint: { kind: 'free', x, y, z } } } as SceneObject;
    };
    pt('a', 0, 0, 0);
    objects['s1'] = { id: 's1', kind: 'sphere3d', label: '', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { center: 'a', surfacePoint: 'a' } } as SceneObject;
    const st = { objects, order: Object.keys(objects), counter: 2, meta: { domain: '3d' } } as unknown as State;
    expect(verifyFigure3d(st).ok).toBe(false);
  });

  it('tâm circumsphereCenter bịa lệch (free sai vị trí) → tâm không cách đều', () => {
    // 4 đỉnh + tâm "O" free đặt sai (gốc) — không cách đều.
    const objects: Record<string, SceneObject> = {};
    const pt = (id: string, c: any) => {
      objects[id] = { id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { constraint: c } } as SceneObject;
    };
    pt('a', { kind: 'free', x: 0, y: 0, z: 0 });
    pt('b', { kind: 'free', x: 2, y: 0, z: 0 });
    pt('c', { kind: 'free', x: 0, y: 2, z: 0 });
    pt('d', { kind: 'free', x: 0, y: 0, z: 2 });
    // tâm khai báo circumsphereCenter nhưng vertices CHỈ 3 (path <4 trả P[0]=a → lệch khỏi cách-đều 4)
    pt('o', { kind: 'circumsphereCenter', vertices: ['a', 'b', 'c'] });
    objects['s1'] = { id: 's1', kind: 'sphere3d', label: '', visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: { center: 'o', surfacePoint: 'a' } } as SceneObject;
    // verify circumsphereCenter check chạy với 3 vertices: w = P[0] = a = (0,0,0); cách đều a/b/c? r(a)=0, r(b)=2 → khác → fail
    const st = { objects, order: Object.keys(objects), counter: 6, meta: { domain: '3d' } } as unknown as State;
    expect(verifyFigure3d(st).ok).toBe(false);
  });
});
