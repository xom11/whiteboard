// src/core/scene/__tests__/store.test.ts
import { createStore } from '../store';
import { registerKind, __clearRegistryForTests } from '../registry';
import { createEmptyState } from '../types';
import type { SceneObject, KindDef } from '../types';

const pointDef: KindDef = {
  type: 'point', schemaVersion: 1, migrate: {},
  dependsOn: () => [], describe: () => '', render: () => null,
};

const mkPoint = (id: string): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { x: 0, y: 0 },
});

describe('store', () => {
  beforeEach(() => {
    __clearRegistryForTests();
    registerKind(pointDef);
  });

  test('dispatch ADD → getState phản ánh thay đổi', () => {
    const store = createStore(createEmptyState('3d'));
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    expect(store.getState().objects.p1).toBeDefined();
  });

  test('subscribe được gọi với (next, prev, action)', () => {
    const store = createStore(createEmptyState('3d'));
    const listener = jest.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    expect(listener).toHaveBeenCalledTimes(1);
    const [next, prev, action] = listener.mock.calls[0];
    expect(prev.objects.p1).toBeUndefined();
    expect(next.objects.p1).toBeDefined();
    expect(action.type).toBe('ADD');
  });

  test('subscribe unsubscribe', () => {
    const store = createStore(createEmptyState('3d'));
    const listener = jest.fn();
    const off = store.subscribe(listener);
    off();
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    expect(listener).not.toHaveBeenCalled();
  });

  test('undo/redo round-trip', () => {
    const store = createStore(createEmptyState('3d'));
    expect(store.canUndo()).toBe(false);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    expect(store.canUndo()).toBe(true);
    store.undo();
    expect(store.getState().objects.p1).toBeUndefined();
    expect(store.canRedo()).toBe(true);
    store.redo();
    expect(store.getState().objects.p1).toBeDefined();
  });

  test('redo bị xoá khi dispatch action mới', () => {
    const store = createStore(createEmptyState('3d'));
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    store.undo();
    expect(store.canRedo()).toBe(true);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p2') } });
    expect(store.canRedo()).toBe(false);
  });

  test('transaction gộp nhiều dispatch thành 1 undo entry', () => {
    const store = createStore(createEmptyState('3d'));
    store.transaction((d) => {
      d({ type: 'ADD', payload: { obj: mkPoint('p1') } });
      d({ type: 'ADD', payload: { obj: mkPoint('p2') } });
    });
    expect(Object.keys(store.getState().objects)).toHaveLength(2);
    store.undo();
    expect(Object.keys(store.getState().objects)).toHaveLength(0);
  });

  test('withoutHistory skip snapshot', () => {
    const store = createStore(createEmptyState('3d'));
    store.withoutHistory(() => {
      store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    });
    expect(store.canUndo()).toBe(false);
    expect(store.getState().objects.p1).toBeDefined();
  });

  test('historyLimit shift cũ nhất khi tràn', () => {
    const store = createStore(createEmptyState('3d'), { historyLimit: 2 });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p2') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p3') } });
    // history chỉ giữ 2 → undo 2 lần là hết (vẫn còn p1)
    store.undo();
    store.undo();
    expect(store.canUndo()).toBe(false);
    expect(store.getState().objects.p1).toBeDefined();
  });

  test('dispatch bên trong subscriber throw', () => {
    const store = createStore(createEmptyState('3d'));
    store.subscribe(() => {
      store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p2') } });
    });
    expect(() => store.dispatch({ type: 'ADD', payload: { obj: mkPoint('p1') } }))
      .toThrow(/dispatch/i);
  });
});
