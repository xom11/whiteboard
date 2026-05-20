// src/stamps/graph-2d/editor/__tests__/useToolStateMachine.test.ts
import { renderHook, act } from '@testing-library/react';
import { useToolStateMachine } from '../useToolStateMachine';

describe('useToolStateMachine', () => {
  it('default tool = move', () => {
    const { result } = renderHook(() => useToolStateMachine('move'));
    expect(result.current.tool).toBe('move');
    expect(result.current.pendingIds).toEqual([]);
  });
  it('setTool clears pendingIds', () => {
    const { result } = renderHook(() => useToolStateMachine('move'));
    act(() => result.current.pushPending('p1'));
    expect(result.current.pendingIds).toEqual(['p1']);
    act(() => result.current.setTool('intersect'));
    expect(result.current.pendingIds).toEqual([]);
    expect(result.current.tool).toBe('intersect');
  });
  it('pushPending accumulates', () => {
    const { result } = renderHook(() => useToolStateMachine('intersect'));
    act(() => result.current.pushPending('a'));
    act(() => result.current.pushPending('b'));
    expect(result.current.pendingIds).toEqual(['a', 'b']);
  });
  it('clearPending resets', () => {
    const { result } = renderHook(() => useToolStateMachine('intersect'));
    act(() => result.current.pushPending('a'));
    act(() => result.current.clearPending());
    expect(result.current.pendingIds).toEqual([]);
  });
});
