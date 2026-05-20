// src/stamps/geometry-2d/editor/__tests__/useSceneStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useSceneStore } from '../useSceneStore';
import { createEmptyState } from '../../../../core/scene';

describe('useSceneStore', () => {
  test('khởi tạo store + state hiện tại', () => {
    const { result } = renderHook(() => useSceneStore(createEmptyState('2d')));
    expect(result.current.state.objects).toEqual({});
    expect(result.current.state.order).toEqual([]);
  });

  test('dispatch ADD point → state cập nhật + re-render', () => {
    const { result } = renderHook(() => useSceneStore(createEmptyState('2d')));
    act(() => {
      result.current.store.dispatch({
        type: 'ADD',
        payload: {
          obj: {
            id: 'p1',
            kind: 'point',
            label: 'A',
            visible: true,
            locked: false,
            layer: 'default',
            schemaVersion: 1,
            attrs: { constraint: { kind: 'free', x: 1, y: 2 } },
          },
        },
      });
    });
    expect(result.current.state.objects.p1?.label).toBe('A');
    expect(result.current.canUndo).toBe(true);
  });

  test('undo/redo flip canUndo/canRedo', () => {
    const { result } = renderHook(() => useSceneStore(createEmptyState('2d')));
    act(() => {
      result.current.store.dispatch({
        type: 'ADD',
        payload: {
          obj: {
            id: 'p1',
            kind: 'point',
            label: 'A',
            visible: true,
            locked: false,
            layer: 'default',
            schemaVersion: 1,
            attrs: { constraint: { kind: 'free', x: 0, y: 0 } },
          },
        },
      });
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    act(() => {
      result.current.store.undo();
    });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });
});
