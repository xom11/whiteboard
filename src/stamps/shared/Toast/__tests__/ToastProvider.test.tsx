import React from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { ToastProvider } from '../ToastProvider';
import { useToast } from '../useToast';

function wrap(maxVisible?: number) {
  return ({ children }: { children: React.ReactNode }) => (
    <ToastProvider maxVisible={maxVisible}>{children}</ToastProvider>
  );
}

describe('ToastProvider + useToast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('showToast adds item to queue (via useToast)', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrap() });
    act(() => result.current.showToast('hello'));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].message).toBe('hello');
    expect(result.current.items[0].variant).toBe('info');
  });

  test('auto-dismiss after duration', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrap() });
    act(() => result.current.showToast('bye', { duration: 1000 }));
    expect(result.current.items).toHaveLength(1);
    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.items).toHaveLength(0);
  });

  test('duration=0 makes toast sticky', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrap() });
    act(() => result.current.showToast('stay', { duration: 0 }));
    act(() => { jest.advanceTimersByTime(10000); });
    expect(result.current.items).toHaveLength(1);
  });

  test('dismiss(id) removes immediately', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrap() });
    act(() => result.current.showToast('x', { id: 'a', duration: 0 }));
    act(() => result.current.dismiss('a'));
    expect(result.current.items).toHaveLength(0);
  });

  test('queue overflow drops oldest', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrap(2) });
    act(() => {
      result.current.showToast('1', { duration: 0 });
      result.current.showToast('2', { duration: 0 });
      result.current.showToast('3', { duration: 0 });
    });
    expect(result.current.items.map((i) => i.message)).toEqual(['2', '3']);
  });

  test('dedup by id resets timer instead of stacking', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrap() });
    act(() => result.current.showToast('first', { id: 'k', duration: 1000 }));
    act(() => { jest.advanceTimersByTime(500); });
    act(() => result.current.showToast('second', { id: 'k', duration: 1000 }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].message).toBe('second');
    act(() => { jest.advanceTimersByTime(700); });
    expect(result.current.items).toHaveLength(1);
    act(() => { jest.advanceTimersByTime(500); });
    expect(result.current.items).toHaveLength(0);
  });

  test('useToast outside provider throws', () => {
    const orig = console.error;
    console.error = () => {};
    try {
      expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/);
    } finally {
      console.error = orig;
    }
  });

  test('renders children unchanged', () => {
    const { getByText } = render(
      <ToastProvider><div>child</div></ToastProvider>,
    );
    expect(getByText('child')).toBeTruthy();
  });
});
