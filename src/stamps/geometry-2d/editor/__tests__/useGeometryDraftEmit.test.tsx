import { act, renderHook } from '@testing-library/react';
import { useGeometryDraftEmit } from '../useGeometryDraftEmit';

// Mock heavy async dependencies
jest.mock('../../render', () => ({
  renderGeometrySvgFromState: jest.fn(),
}));
jest.mock('../../serialize', () => ({
  serializeBoard: jest.fn(),
}));

import { renderGeometrySvgFromState } from '../../render';
import { serializeBoard } from '../../serialize';

const mockRender = renderGeometrySvgFromState as jest.MockedFunction<typeof renderGeometrySvgFromState>;
const mockSerialize = serializeBoard as jest.MockedFunction<typeof serializeBoard>;

function makeFakeStore(objectCount = 1) {
  const listeners = new Set<() => void>();
  const store = {
    subscribe: jest.fn((cb: () => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }),
    notify: () => listeners.forEach((cb) => cb()),
    getState: jest.fn(() => ({
      objects: objectCount > 0
        ? Object.fromEntries(Array.from({ length: objectCount }, (_, i) => [`id${i}`, {}]))
        : {},
      meta: { domain: '2d' as const, version: 1, view: { bbox: [-5, 5, 5, -5] as [number, number, number, number], showAxis: true, showGrid: true } },
      order: [],
      counter: 0,
    })),
  };
  return store;
}

function makeFakeHandle(objectCount = 1) {
  return {
    current: {
      getState: jest.fn(() => ({
        objects: objectCount > 0
          ? Object.fromEntries(Array.from({ length: objectCount }, (_, i) => [`id${i}`, {}]))
          : {},
        meta: { domain: '2d' as const, version: 1, view: { bbox: [-5, 5, 5, -5] as [number, number, number, number], showAxis: true, showGrid: true } },
        order: [],
        counter: 0,
      })),
      getBbox: jest.fn(() => [-5, 5, 5, -5] as [number, number, number, number]),
    },
  };
}

const SVG_FIXTURE = '<svg width="100" height="60"></svg>';

beforeEach(() => {
  jest.useFakeTimers();
  mockRender.mockResolvedValue(SVG_FIXTURE);
  mockSerialize.mockReturnValue('serialized-state-v1');
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('useGeometryDraftEmit', () => {
  it('(a) store change → after debounce → onGeometryDraft called with draft + seq increments', async () => {
    const store = makeFakeStore(1);
    const handleRef = makeFakeHandle(1);
    const onGeometryDraft = jest.fn();

    renderHook(() =>
      useGeometryDraftEmit({
        store,
        handleRef,
        api: undefined,
        showAxis: true,
        showGrid: false,
        onGeometryDraft,
        debounceMs: 200,
      }),
    );

    // Trigger first store change
    act(() => store.notify());
    expect(onGeometryDraft).not.toHaveBeenCalled();

    // Fast-forward debounce
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(onGeometryDraft).toHaveBeenCalledTimes(1);
    const draft1 = onGeometryDraft.mock.calls[0][0];
    expect(draft1).not.toBeNull();
    expect(draft1.seq).toBe(1);
    expect(draft1.width).toBe(100);
    expect(draft1.height).toBe(60);

    // Trigger second change with new serialized state
    mockSerialize.mockReturnValueOnce('serialized-state-v2');
    act(() => store.notify());
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(onGeometryDraft).toHaveBeenCalledTimes(2);
    expect(onGeometryDraft.mock.calls[1][0].seq).toBe(2);
  });

  it('(b) empty objects → onGeometryDraft(null)', async () => {
    const store = makeFakeStore(0);
    const handleRef = makeFakeHandle(0);
    const onGeometryDraft = jest.fn();

    // Seed seen.last with something so the null path fires
    // We achieve this by first rendering with 1 object, emitting once, then switching to 0
    const storeWithObj = makeFakeStore(1);
    const handleWithObj = makeFakeHandle(1);

    const { rerender } = renderHook(
      (props) =>
        useGeometryDraftEmit({
          store: props.store,
          handleRef: props.handleRef,
          api: undefined,
          showAxis: true,
          showGrid: false,
          onGeometryDraft,
          debounceMs: 100,
        }),
      { initialProps: { store: storeWithObj, handleRef: handleWithObj } },
    );

    // First emit to populate seenRef
    act(() => storeWithObj.notify());
    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(onGeometryDraft).toHaveBeenCalledWith(expect.objectContaining({ seq: 1 }));
    onGeometryDraft.mockClear();

    // Switch to empty store
    rerender({ store, handleRef });
    act(() => store.notify());
    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(onGeometryDraft).toHaveBeenCalledWith(null);
  });

  it('(c) unmount → onGeometryDraft(null)', () => {
    const store = makeFakeStore(1);
    const handleRef = makeFakeHandle(1);
    const onGeometryDraft = jest.fn();

    const { unmount } = renderHook(() =>
      useGeometryDraftEmit({
        store,
        handleRef,
        api: undefined,
        showAxis: true,
        showGrid: false,
        onGeometryDraft,
        debounceMs: 200,
      }),
    );

    // Don't emit anything — just unmount
    unmount();
    expect(onGeometryDraft).toHaveBeenCalledWith(null);
  });
});
