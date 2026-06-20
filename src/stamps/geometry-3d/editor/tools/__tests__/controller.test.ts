// src/stamps/geometry-3d/editor/tools/__tests__/controller.test.ts
// Test luồng ToolController cho bước 'object' (chọn đối tượng — mặt phẳng) —
// tiền đề cho construct chân ⊥ xuống mặt / giao đường ∩ mặt.
import '../../../../../core/scene/kinds'; // side-effect: đăng ký mọi kind 3D (plane3d…)
import { createStore, createEmptyState } from '../../../../../core/scene';
import type { SceneObject } from '../../../../../core/scene';
import { addPoint } from '../handlers/_ensurePoint';
import { ToolController } from '../controller';
import type { SceneHit } from '../../hitTest/hitTest';
import type { Point3DAttrs } from '../../../../../core/scene/kinds/point3d';

type Store = ReturnType<typeof createStore>;

function addPlane(store: Store, p1: string, p2: string, p3: string): string {
  const id = 'pl';
  const obj = {
    id,
    kind: 'plane3d',
    label: 'mp',
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs: { p1, p2, p3 },
  } as unknown as SceneObject;
  store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}

const existingPoint = (pointId: string): SceneHit => ({ kind: 'existingPoint', pointId });
const onPlane = (planeId: string): SceneHit => ({ kind: 'onPlane', planeId, u: 0, v: 0, world: [0, 0, 0] });

describe('ToolController — bước object (chọn mặt phẳng)', () => {
  function setup(): { store: Store; ctrl: ToolController; from: string } {
    const store = createStore(createEmptyState('3d'));
    const q = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    const r = addPoint(store, { kind: 'free', x: 1, y: 0, z: 0 });
    const s = addPoint(store, { kind: 'free', x: 0, y: 1, z: 0 });
    addPlane(store, q, r, s);
    const from = addPoint(store, { kind: 'free', x: 1, y: 2, z: 3 });
    return { store, ctrl: new ToolController(store), from };
  }

  it('perpFootPlane: nhận điểm rồi nhận mặt phẳng → dựng chân ⊥', () => {
    const { store, ctrl, from } = setup();
    ctrl.selectTool('perpFootPlane');
    expect(ctrl.consumeHit(existingPoint(from))).toBe(true); // bước point (from)
    expect(ctrl.consumeHit(onPlane('pl'))).toBe(true); // bước object (plane) → build
    const foot = Object.values(store.getState().objects).find(
      (o) => o.kind === 'point3d' && (o.attrs as Point3DAttrs).constraint.kind === 'perpFootPlane',
    );
    expect(foot).toBeDefined();
    expect((foot!.attrs as Point3DAttrs).constraint).toEqual({ kind: 'perpFootPlane', from, plane: 'pl' });
  });

  it('bước object KHÔNG nhận hit là điểm (existingPoint)', () => {
    const { ctrl, from } = setup();
    ctrl.selectTool('perpFootPlane');
    expect(ctrl.consumeHit(existingPoint(from))).toBe(true); // bước point
    // bước object đang chờ mặt phẳng → hit điểm bị từ chối, controller giữ nguyên bước
    expect(ctrl.consumeHit(existingPoint(from))).toBe(false);
    expect(ctrl.consumeHit(onPlane('pl'))).toBe(true); // vẫn dựng được sau đó
  });

  it('bước object từ chối onPlane sai kind không nằm trong step.kinds', () => {
    // intersectionLinePlane.kinds = ['plane']; onSphere không khớp.
    const { store, ctrl } = setup();
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: -1 });
    const b = addPoint(store, { kind: 'free', x: 0, y: 0, z: 1 });
    ctrl.selectTool('intersectionLinePlane');
    expect(ctrl.consumeHit(existingPoint(a))).toBe(true);
    expect(ctrl.consumeHit(existingPoint(b))).toBe(true);
    const onSphere: SceneHit = { kind: 'onSphere', sphereId: 'sp', theta: 0, phi: 0, world: [0, 0, 0] };
    expect(ctrl.consumeHit(onSphere)).toBe(false); // sphere ∉ kinds:['plane']
    expect(ctrl.consumeHit(onPlane('pl'))).toBe(true);
  });
});
