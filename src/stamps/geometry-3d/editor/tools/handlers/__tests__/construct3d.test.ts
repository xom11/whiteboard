// src/stamps/geometry-3d/editor/tools/handlers/__tests__/construct3d.test.ts
// Build-test cho ĐƯỜNG/MẶT phái sinh (tool → scene object construction).
import '../../../../../../core/scene/kinds'; // đăng ký mọi kind 3D (plane3d…)
import { createStore, createEmptyState } from '../../../../../../core/scene';
import { addPoint } from '../_ensurePoint';
import { buildPlanePlaneIntersection } from '../construct3d';
import type { CollectedArg } from '../../spec';
import type { Store, SceneObject } from '../../../../../../core/scene';
import type { Line3DAttrs } from '../../../../../../core/scene/kinds/line3d';

const objectStep = { type: 'object', kinds: ['plane'], hint: '' } as const;
const planeHit = (planeId: string): CollectedArg =>
  ({ step: objectStep as never, hit: { kind: 'onPlane', planeId, u: 0, v: 0, world: [0, 0, 0] } });

function addPlane(store: Store, id: string, p1: string, p2: string, p3: string): void {
  const obj = {
    id, kind: 'plane3d', label: id, visible: true, locked: false, layer: 'default',
    schemaVersion: 1, attrs: { p1, p2, p3 },
  } as unknown as SceneObject;
  store.dispatch({ type: 'ADD', payload: { obj } });
}

function withTwoPlanes(): Store {
  const store = createStore(createEmptyState('3d'));
  const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
  const b = addPoint(store, { kind: 'free', x: 1, y: 0, z: 0 });
  const c = addPoint(store, { kind: 'free', x: 0, y: 1, z: 0 });
  addPlane(store, 'pl1', a, b, c);
  const d = addPoint(store, { kind: 'free', x: 0, y: 0, z: 1 });
  addPlane(store, 'pl2', a, b, d);
  return store;
}

describe('buildPlanePlaneIntersection', () => {
  it('tạo line3d construction từ 2 mặt phẳng', () => {
    const store = withTwoPlanes();
    const id = buildPlanePlaneIntersection([planeHit('pl1'), planeHit('pl2')], store);
    expect(id).toBeTruthy();
    const obj = store.getState().objects[id!];
    expect(obj.kind).toBe('line3d');
    expect((obj.attrs as Line3DAttrs).construction).toEqual({
      kind: 'planePlaneIntersection', plane1: 'pl1', plane2: 'pl2',
    });
  });

  it('trả null nếu thiếu mặt phẳng thứ hai', () => {
    const store = withTwoPlanes();
    expect(buildPlanePlaneIntersection([planeHit('pl1')], store)).toBeNull();
  });

  it('trả null nếu chọn cùng 1 mặt phẳng 2 lần', () => {
    const store = withTwoPlanes();
    expect(buildPlanePlaneIntersection([planeHit('pl1'), planeHit('pl1')], store)).toBeNull();
  });
});
