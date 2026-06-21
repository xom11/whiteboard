// src/core/scene/render/__tests__/JxgRenderer3D.derivedPlane.test.ts
// Render-dispatch test cho MẶT PHÁI SINH 3D (construction-variant) qua
// JxgRenderer3D thật + mockView. Verify plane3d construction: 3 parents là HÀM
// trả toạ độ tính + needsRegularUpdate + đọc STATE SỐNG (live-update).
import { JxgRenderer3D } from '../JxgRenderer3D';
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import '../../kinds';
import type { SceneObject } from '../../types';

function mockView() {
  const created: any[] = [];
  const view = {
    create: jest.fn((kind: string, parents: any, attrs: any) => {
      const el: any = { kind, parents, attrs, _id: `${kind}_${created.length}` };
      created.push(el);
      return el;
    }),
    removeObject: jest.fn(),
    update: jest.fn(),
  };
  return { view, created };
}

const free = (id: string, x: number, y: number, z: number): SceneObject => ({
  id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: { kind: 'free', x, y, z } },
});
const plane = (id: string, p1: string, p2: string, p3: string): SceneObject => ({
  id, kind: 'plane3d', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { p1, p2, p3 } as never,
});
const derivedPlane = (id: string, construction: unknown): SceneObject => ({
  id, kind: 'plane3d', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { construction } as never,
});
const ev = (fn: unknown): number[] => (typeof fn === 'function' ? (fn as () => number[])() : (fn as number[]));

describe('JxgRenderer3D render mặt phái sinh (planeParallelThrough)', () => {
  function setup() {
    const store = createStore(createEmptyState('3d'));
    const { view, created } = mockView();
    new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: free('A', 0, 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: free('B', 1, 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: free('C', 0, 1, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: plane('xy', 'A', 'B', 'C') } });
    store.dispatch({ type: 'ADD', payload: { obj: free('P', 0, 0, 5) } });
    store.dispatch({ type: 'ADD', payload: { obj: derivedPlane('mp', { kind: 'planeParallelThrough', point: 'P', refPlane: 'xy' }) } });
    // mặt construction = plane3d có needsRegularUpdate (mặt xy gốc thì không).
    const derived = created.find((e) => e.kind === 'plane3d' && e.attrs?.needsRegularUpdate);
    return { store, derived };
  }

  // JSXGraph plane3d nhận [point, direction1, direction2] (directions = HIỆU
  // điểm, verify Playwright). Renderer truyền point=P + 2 hướng (p2−p1, p3−p1).
  it('parents = point + 2 hướng (mặt z=5 ∥ xy), needsRegularUpdate bật', () => {
    const { derived } = setup();
    expect(derived).toBeDefined();
    expect(derived.parents.every((p: unknown) => typeof p === 'function')).toBe(true);
    const point = ev(derived.parents[0]);
    const dir1 = ev(derived.parents[1]);
    const dir2 = ev(derived.parents[2]);
    expect(point).toEqual([0, 0, 5]); // qua P
    // pháp tuyến = dir1 × dir2 phải ∥ z (mặt song song xy)
    const n = [
      dir1[1] * dir2[2] - dir1[2] * dir2[1],
      dir1[2] * dir2[0] - dir1[0] * dir2[2],
      dir1[0] * dir2[1] - dir1[1] * dir2[0],
    ];
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    expect(Math.abs(n[0] / len)).toBeCloseTo(0, 9);
    expect(Math.abs(n[1] / len)).toBeCloseTo(0, 9);
    expect(Math.abs(n[2] / len)).toBeCloseTo(1, 9);
    expect([point, dir1, dir2].every((p) => p.every(Number.isFinite))).toBe(true);
    expect(derived.attrs.needsRegularUpdate).toBe(true);
  });

  it('live-update: kéo P lên z=8 → point của mặt phái sinh lên z=8', () => {
    const { store, derived } = setup();
    expect(ev(derived.parents[0])[2]).toBeCloseTo(5, 9);
    store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: 'P', patch: { constraint: { kind: 'free', x: 0, y: 0, z: 8 } } } });
    expect(ev(derived.parents[0])[2]).toBeCloseTo(8, 9);
  });
});
