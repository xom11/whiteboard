import { act, renderHook } from '@testing-library/react';
import { useExcalidrawApi } from './useExcalidrawApi';

/** Flush queueMicrotask callbacks inside React act boundary */
const flushMicrotasks = () => act(async () => { await Promise.resolve(); });

describe('useExcalidrawApi', () => {
  it('starts với api=null + isDark=false', () => {
    const { result } = renderHook(() => useExcalidrawApi());
    expect(result.current.api).toBeNull();
    expect(result.current.isDark).toBe(false);
  });

  it('setApiFromExcalidraw bỏ qua nếu cùng instance (no rerender)', async () => {
    const onApi = jest.fn();
    const { result } = renderHook(() => useExcalidrawApi({ onApi }));
    const fakeApi = { id: 'a' };
    act(() => { result.current.setApiFromExcalidraw(fakeApi); });
    await flushMicrotasks();
    act(() => { result.current.setApiFromExcalidraw(fakeApi); });
    await flushMicrotasks();
    expect(onApi).toHaveBeenCalledTimes(1);
    expect(result.current.api).toBe(fakeApi);
  });

  it('syncThemeFromAppState handles undefined appState gracefully', async () => {
    const { result } = renderHook(() => useExcalidrawApi());
    expect(() => {
      act(() => { result.current.syncThemeFromAppState(undefined); });
    }).not.toThrow();
    await act(async () => { await Promise.resolve(); });
    expect(result.current.isDark).toBe(false);
  });

  it('syncThemeFromAppState chỉ trigger setState khi đổi', async () => {
    const { result } = renderHook(() => useExcalidrawApi());
    act(() => { result.current.syncThemeFromAppState({ theme: 'dark' }); });
    await flushMicrotasks();
    expect(result.current.isDark).toBe(true);
    act(() => { result.current.syncThemeFromAppState({ theme: 'dark' }); });
    await flushMicrotasks();
    expect(result.current.isDark).toBe(true);
  });
});
