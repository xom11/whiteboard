import { renderHook, act } from '@testing-library/react';
import { useToolStateMachine } from '../useToolStateMachine';

type GeomTool = 'move' | 'segment' | 'circle';
type GraphTool = 'move' | 'intersect';

describe('useToolStateMachine (shared, generic)', () => {
  test('khởi tạo theo initial + pending rỗng', () => {
    const { result } = renderHook(() => useToolStateMachine<GeomTool>('move'));
    expect(result.current.tool).toBe('move');
    expect(result.current.pendingIds).toEqual([]);
  });

  test('setTool clears pending', () => {
    const { result } = renderHook(() => useToolStateMachine<GeomTool>('move'));
    act(() => { result.current.pushPending('p1'); });
    expect(result.current.pendingIds).toEqual(['p1']);
    act(() => { result.current.setTool('segment'); });
    expect(result.current.tool).toBe('segment');
    expect(result.current.pendingIds).toEqual([]);
  });

  test('pushPending append + clearPending reset', () => {
    const { result } = renderHook(() => useToolStateMachine<GeomTool>('segment'));
    act(() => { result.current.pushPending('p1'); });
    act(() => { result.current.pushPending('p2'); });
    expect(result.current.pendingIds).toEqual(['p1', 'p2']);
    act(() => { result.current.clearPending(); });
    expect(result.current.pendingIds).toEqual([]);
  });

  test('hoạt động với union type khác (GraphTool)', () => {
    const { result } = renderHook(() => useToolStateMachine<GraphTool>('move'));
    act(() => { result.current.setTool('intersect'); });
    expect(result.current.tool).toBe('intersect');
  });

  test('toolRef + pendingIdsRef sync với state', () => {
    const { result } = renderHook(() => useToolStateMachine<GeomTool>('move'));
    act(() => { result.current.setTool('circle'); result.current.pushPending('p1'); });
    expect(result.current.toolRef.current).toBe('circle');
    expect(result.current.pendingIdsRef.current).toEqual(['p1']);
  });
});
