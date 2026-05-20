// src/core/scene/render/__tests__/JxgRenderer3D.test.ts
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import { JxgRenderer3D } from '../JxgRenderer3D';
import '../../kinds';
import type { SceneObject } from '../../types';

function mockView() {
  const created: any[] = [];
  const removed: any[] = [];
  let counter = 0;
  const view = {
    create: jest.fn((type: string, parents: any, attrs: any) => {
      const el = { type, parents, attrs, _id: `${type}_${counter++}`, remove: jest.fn() };
      created.push(el);
      return el;
    }),
    removeObject: jest.fn((el: any) => {
      removed.push(el);
    }),
  };
  return { view, created, removed };
}

const mkPoint = (id: string, x = 0, y = 0, z = 0): SceneObject => ({
  id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1,
  attrs: { constraint: { kind: 'free', x, y, z } },
});

const mkSegment = (id: string, p1: string, p2: string): SceneObject => ({
  id, kind: 'segment3d', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1,
  attrs: { p1, p2 },
});

describe('JxgRenderer3D', () => {
  test('ADD point → view.create("point3d", ...)', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, created } = mockView();
    new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 1, 2, 3) } });
    expect(created).toHaveLength(1);
    expect(created[0].type).toBe('point3d');
    expect(created[0].parents).toEqual([1, 2, 3]);
  });

  test('ADD segment sau 2 point → resolveRef giải đúng', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, created } = mockView();
    new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s1', 'A', 'B') } });
    expect(created).toHaveLength(3);
    const seg = created[2];
    expect(seg.type).toBe('line3d');
    expect(seg.parents[0]).toBe(created[0]);
    expect(seg.parents[1]).toBe(created[1]);
  });

  test('DELETE point cascade → segment cũng bị removeObject', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, removed } = mockView();
    new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s1', 'A', 'B') } });
    store.dispatch({ type: 'DELETE', payload: { id: 'A' } });
    expect(removed.length).toBeGreaterThanOrEqual(2); // A + s1 (cascade)
  });

  test('UPDATE_ATTRS với kind không có update() → remove + recreate', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, created, removed } = mockView();
    new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 0, 0, 0) } });
    store.dispatch({
      type: 'UPDATE_ATTRS',
      payload: { id: 'A', patch: { constraint: { kind: 'free', x: 1, y: 1, z: 1 } } },
    });
    // Remove old, create new
    expect(removed.length).toBeGreaterThanOrEqual(1);
    expect(created.length).toBeGreaterThanOrEqual(2);
  });

  test('LOAD state từ empty → tạo hết object', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, created } = mockView();
    new JxgRenderer3D(store, view as never);
    const loaded = {
      objects: {
        A: mkPoint('A'),
        B: mkPoint('B'),
        s1: mkSegment('s1', 'A', 'B'),
      },
      order: ['A', 'B', 's1'],
      counter: 3,
      meta: { domain: '3d' as const, version: 1 },
    };
    store.dispatch({ type: 'LOAD', payload: { state: loaded } });
    expect(created).toHaveLength(3);
  });

  test('dispose() → tất cả element bị remove, không gọi tiếp sau', () => {
    const store = createStore(createEmptyState('3d'));
    const { view, created, removed } = mockView();
    const renderer = new JxgRenderer3D(store, view as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    renderer.dispose();
    const removedAfterDispose = removed.length;
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    // After dispose, new dispatch should NOT create new elements
    expect(removed.length).toBe(removedAfterDispose);
    expect(created.length).toBe(1); // Only A was ever created
  });
});
