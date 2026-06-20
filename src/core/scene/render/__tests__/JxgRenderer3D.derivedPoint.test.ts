// src/core/scene/render/__tests__/JxgRenderer3D.derivedPoint.test.ts
// Render-dispatch test cho điểm PHÁI SINH 3D (midpoint…) qua JxgRenderer3D thật.
// Mock view cấp point3d.X()/Y()/Z() đọc functional parents → verify điểm phái sinh
// (1) KHÔNG rơi fallback [0,0,0] (bug-class derived-collapse), (2) đọc STATE SỐNG nên
// cập nhật khi điểm gốc đổi — chứng minh cơ chế live-update ở mức unit.
import { JxgRenderer3D } from '../JxgRenderer3D';
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import '../../kinds'; // đăng ký point3d + các kind 3D
import type { SceneObject } from '../../types';

function mockView() {
  const created: any[] = [];
  const view = {
    create: jest.fn((kind: string, parents: any, attrs: any) => {
      const el: any = { kind, parents, attrs, _id: `${kind}_${created.length}` };
      if (kind === 'point3d') {
        const ev = (i: number) => (typeof parents[i] === 'function' ? parents[i]() : parents[i]);
        el.X = () => ev(0);
        el.Y = () => ev(1);
        el.Z = () => ev(2);
      }
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
const derived = (id: string, constraint: unknown): SceneObject => ({
  id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: constraint as never },
});
const byName = (created: any[], name: string) => created.find((e) => e.attrs?.name === name);

describe('JxgRenderer3D render điểm phái sinh', () => {
  it('midpoint: M = (A+B)/2 live, KHÔNG (0,0,0)', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, created } = mockView();
    new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: free('A', 0, 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: free('B', 2, 4, 6) } });
    store.dispatch({ type: 'ADD', payload: { obj: derived('M', { kind: 'midpoint', p1: 'A', p2: 'B' }) } });
    const m = byName(created, 'M');
    expect(m).toBeDefined();
    expect(m.X()).toBeCloseTo(1, 9);
    expect(m.Y()).toBeCloseTo(2, 9);
    expect(m.Z()).toBeCloseTo(3, 9);
    expect(m.X() === 0 && m.Y() === 0 && m.Z() === 0).toBe(false);
    expect(m.attrs.needsRegularUpdate).toBe(true); // cờ live re-eval
  });

  it('midpoint cập nhật khi điểm gốc đổi (functional + getState sống)', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, created } = mockView();
    new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: free('A', 0, 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: free('B', 2, 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: derived('M', { kind: 'midpoint', p1: 'A', p2: 'B' }) } });
    const m = byName(created, 'M');
    expect(m.X()).toBeCloseTo(1, 9);
    // di chuyển B → (10,0,0); M.X() phải đọc state mới = 5
    store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: 'B', patch: { constraint: { kind: 'free', x: 10, y: 0, z: 0 } } } });
    expect(m.X()).toBeCloseTo(5, 9);
  });
});
