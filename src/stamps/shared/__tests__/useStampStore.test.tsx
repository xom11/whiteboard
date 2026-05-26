import { renderHook } from '@testing-library/react';
import { useStampStore } from '../useStampStore';
import { createEmptyState, type State } from '../../../core/scene';

describe('useStampStore', () => {
  test('creates store with empty state when no editingElement', () => {
    const parseInitial = jest.fn();
    const { result } = renderHook(() =>
      useStampStore('2d', null, parseInitial),
    );
    expect(parseInitial).not.toHaveBeenCalled();
    expect(Object.keys(result.current.getState().objects)).toHaveLength(0);
    expect(result.current.getState().meta.domain).toBe('2d');
  });

  test('calls parseInitial with editingElement.customData when present', () => {
    const customData = { kind: 'geometry', version: 1 };
    const parseInitial = jest.fn().mockReturnValue(null);
    renderHook(() =>
      useStampStore('2d', { id: 'el-1', customData }, parseInitial),
    );
    expect(parseInitial).toHaveBeenCalledTimes(1);
    expect(parseInitial).toHaveBeenCalledWith(customData);
  });

  test('uses parsed state when parseInitial returns non-null', () => {
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
    const parseInitial = jest.fn().mockReturnValue(seedState);
    const { result } = renderHook(() =>
      useStampStore('graph2d', { id: 'el', customData: {} }, parseInitial),
    );
    expect(result.current.getState().objects['foo']).toBeDefined();
  });

  test('falls back to empty state when parseInitial returns null', () => {
    const parseInitial = jest.fn().mockReturnValue(null);
    const { result } = renderHook(() =>
      useStampStore('3d', { id: 'el', customData: {} }, parseInitial),
    );
    expect(Object.keys(result.current.getState().objects)).toHaveLength(0);
    expect(result.current.getState().meta.domain).toBe('3d');
  });

  test('store identity is stable across re-renders', () => {
    const parseInitial = jest.fn().mockReturnValue(null);
    const { result, rerender } = renderHook(
      ({ el }) => useStampStore('2d', el, parseInitial),
      { initialProps: { el: null as { id: string; customData: unknown } | null } },
    );
    const firstStore = result.current;
    rerender({ el: null });
    rerender({ el: { id: 'x', customData: {} } });
    expect(result.current).toBe(firstStore);
  });

  test('parseInitial only called once (on first render)', () => {
    const parseInitial = jest.fn().mockReturnValue(null);
    const { rerender } = renderHook(() =>
      useStampStore('2d', { id: 'el', customData: { foo: 1 } }, parseInitial),
    );
    rerender();
    rerender();
    expect(parseInitial).toHaveBeenCalledTimes(1);
  });

  test('store supports dispatch + undo from initial state', () => {
    const parseInitial = jest.fn().mockReturnValue(null);
    const { result } = renderHook(() =>
      useStampStore('2d', null, parseInitial),
    );
    const store = result.current;
    expect(store.canUndo()).toBe(false);
    expect(typeof store.dispatch).toBe('function');
    expect(typeof store.subscribe).toBe('function');
  });
});
