import { renderHook } from '@testing-library/react';
import { useStampStore } from '../useStampStore';
import type { State } from '../../../core/scene';

describe('useStampStore', () => {
  test('tạo store rỗng khi không truyền thunk', () => {
    const { result } = renderHook(() => useStampStore('2d'));
    expect(Object.keys(result.current.getState().objects)).toHaveLength(0);
    expect(result.current.getState().meta.domain).toBe('2d');
  });

  test('dùng state do thunk trả về', () => {
    const seedState: State = {
      objects: {
        foo: {
          id: 'foo',
          kind: 'function2d',
          label: 'foo',
          visible: true,
          locked: false,
          layer: 'default',
          schemaVersion: 1,

          attrs: { expression: 'x', color: '#000', visible: true } as any,
        },
      },
      order: ['foo'],
      counter: 1,
      meta: { domain: 'graph2d', version: 1 },
    };
    const { result } = renderHook(() => useStampStore('graph2d', () => seedState));
    expect(result.current.getState().objects['foo']).toBeDefined();
  });

  test('fallback về state rỗng khi thunk trả null', () => {
    const { result } = renderHook(() => useStampStore('3d', () => null));
    expect(Object.keys(result.current.getState().objects)).toHaveLength(0);
    expect(result.current.getState().meta.domain).toBe('3d');
  });

  test('store identity ổn định qua re-render', () => {
    const { result, rerender } = renderHook(() => useStampStore('2d', () => null));
    const firstStore = result.current;
    rerender();
    rerender();
    expect(result.current).toBe(firstStore);
  });

  test('thunk CHỈ được gọi một lần (bất biến lười)', () => {
    const makeInitial = jest.fn().mockReturnValue(null);
    const { rerender } = renderHook(() => useStampStore('2d', makeInitial));
    rerender();
    rerender();
    expect(makeInitial).toHaveBeenCalledTimes(1);
  });

  test('store hỗ trợ dispatch + undo từ state ban đầu', () => {
    const { result } = renderHook(() => useStampStore('2d'));
    const store = result.current;
    expect(store.canUndo()).toBe(false);
    expect(typeof store.dispatch).toBe('function');
    expect(typeof store.subscribe).toBe('function');
  });
});
