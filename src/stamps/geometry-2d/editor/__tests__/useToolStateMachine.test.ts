// src/stamps/geometry-2d/editor/__tests__/useToolStateMachine.test.ts
import { renderHook, act } from '@testing-library/react';
import { useToolStateMachine } from '../useToolStateMachine';

describe('useToolStateMachine', () => {
  test('khởi tạo tool = move + pending = []', () => {
    const { result } = renderHook(() => useToolStateMachine('move'));
    expect(result.current.tool).toBe('move');
    expect(result.current.pendingIds).toEqual([]);
  });

  test('setTool clears pending', () => {
    const { result } = renderHook(() => useToolStateMachine('move'));
    act(() => {
      result.current.pushPending('p1');
    });
    expect(result.current.pendingIds).toEqual(['p1']);
    act(() => {
      result.current.setTool('segment');
    });
    expect(result.current.tool).toBe('segment');
    expect(result.current.pendingIds).toEqual([]);
  });

  test('pushPending append + clearPending reset', () => {
    const { result } = renderHook(() => useToolStateMachine('segment'));
    act(() => {
      result.current.pushPending('p1');
    });
    act(() => {
      result.current.pushPending('p2');
    });
    expect(result.current.pendingIds).toEqual(['p1', 'p2']);
    act(() => {
      result.current.clearPending();
    });
    expect(result.current.pendingIds).toEqual([]);
  });
});
