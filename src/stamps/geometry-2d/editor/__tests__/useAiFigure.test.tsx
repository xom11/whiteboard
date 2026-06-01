import { act, renderHook } from '@testing-library/react';
import { createEmptyState, type State } from '../../../../core/scene';
import type { GenerateGeometryFigure } from '../../../shared/types';
import { useAiFigure } from '../useAiFigure';
import { transpile } from '../../dsl';
import type { DslInputT } from '../../dsl/schema';

function generatedState(label = 'A'): State {
  const empty = createEmptyState('2d');
  return {
    ...empty,
    objects: {
      p1: {
        id: 'p1',
        kind: 'point',
        label,
        visible: true,
        locked: false,
        layer: 'default',
        schemaVersion: 1,
        attrs: { constraint: { kind: 'free', x: 0, y: 0 } },
      },
    },
    order: ['p1'],
    counter: 1,
  };
}

describe('useAiFigure', () => {
  it('rejects an empty prompt without calling the generator', async () => {
    const generator: GenerateGeometryFigure = jest.fn();
    const { result } = renderHook(() => useAiFigure(generator));

    act(() => result.current.setPrompt('   '));
    let state: State | null = null;
    await act(async () => {
      state = await result.current.submit();
    });

    expect(state).toBeNull();
    expect(generator).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Nhập đề bài cần dựng hình.');
  });

  it('returns generated state and exposes loading while pending', async () => {
    let resolve: ((value: { ok: true; state: State }) => void) | undefined;
    const generator: GenerateGeometryFigure = jest.fn(
      () => new Promise((done) => { resolve = done; }),
    );
    const { result } = renderHook(() => useAiFigure(generator));

    act(() => result.current.setPrompt('  Cho tam giac ABC  '));
    let submitted: Promise<State | null>;
    act(() => {
      submitted = result.current.submit();
    });
    expect(result.current.isLoading).toBe(true);
    expect(generator).toHaveBeenCalledWith(
      'Cho tam giac ABC',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    await act(async () => {
      resolve?.({ ok: true, state: generatedState() });
      await submitted;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('surfaces the failure message returned by the generator', async () => {
    const generator: GenerateGeometryFigure = jest.fn(async () => ({
      ok: false,
      message: 'De bai ngoai pham vi.',
    }));
    const { result } = renderHook(() => useAiFigure(generator));

    act(() => result.current.setPrompt('Ve khoi chop'));
    await act(async () => {
      expect(await result.current.submit()).toBeNull();
    });

    expect(result.current.error).toBe('De bai ngoai pham vi.');
    expect(result.current.isLoading).toBe(false);
  });

  it('cancel() aborts the inflight request', async () => {
    const seenSignals: AbortSignal[] = [];
    const generator: GenerateGeometryFigure = jest.fn(
      (_problem, options) => {
        seenSignals.push(options.signal);
        return new Promise<{ ok: true; state: State }>((_resolve, reject) => {
          options.signal.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true },
          );
        });
      },
    );
    const { result } = renderHook(() => useAiFigure(generator));

    act(() => result.current.setPrompt('long prompt'));
    let pending: Promise<State | null>;
    act(() => { pending = result.current.submit(); });
    expect(result.current.isLoading).toBe(true);

    act(() => result.current.cancel());

    await act(async () => {
      const state = await pending;
      expect(state).toBeNull();
    });

    expect(seenSignals[0]?.aborted).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('cancel() is a no-op when no request is inflight', () => {
    const generator: GenerateGeometryFigure = jest.fn();
    const { result } = renderHook(() => useAiFigure(generator));

    expect(() => result.current.cancel()).not.toThrow();
    expect(generator).not.toHaveBeenCalled();
  });

  it('aborts an older request when a new submission starts', async () => {
    const seenSignals: AbortSignal[] = [];
    const generator: GenerateGeometryFigure = jest.fn((problem, options) => {
      seenSignals.push(options.signal);
      if (problem === 'first') {
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true },
          );
        });
      }
      return Promise.resolve({ ok: true, state: generatedState('B') });
    });
    const { result } = renderHook(() => useAiFigure(generator));

    act(() => result.current.setPrompt('first'));
    let first: Promise<State | null>;
    act(() => { first = result.current.submit(); });
    act(() => result.current.setPrompt('second'));
    let second: State | null = null;
    await act(async () => {
      second = await result.current.submit();
      await first;
    });

    expect(seenSignals[0]?.aborted).toBe(true);
    expect(second?.objects.p1?.label).toBe('B');
    expect(result.current.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fixture states built from transpile (real State objects)
// ---------------------------------------------------------------------------

const triangleDsl: DslInputT = {
  version: 1,
  points: [
    { name: 'A', kind: 'free', x: 0, y: 3 },
    { name: 'B', kind: 'free', x: -2, y: 0 },
    { name: 'C', kind: 'free', x: 3, y: 0 },
  ],
  shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
};

const triangleState: State = (() => {
  const r = transpile(triangleDsl);
  if (!r.ok) throw new Error('Failed to build triangleState fixture');
  return r.state;
})();

const emptyState: State = (() => {
  const r = transpile({ version: 1, points: [], shapes: [] });
  if (!r.ok) throw new Error('Failed to build emptyState fixture');
  return r.state;
})();

describe('useAiFigure — mode auto-detect', () => {
  it('empty state → mode=build', () => {
    const { result } = renderHook(() => useAiFigure(undefined, { currentState: emptyState }));
    expect(result.current.mode).toBe('build');
    expect(result.current.entityCount).toEqual({ points: 0, shapes: 0 });
  });

  it('state with triangle → mode=refine + correct counts', () => {
    const { result } = renderHook(() => useAiFigure(undefined, { currentState: triangleState }));
    expect(result.current.mode).toBe('refine');
    expect(result.current.entityCount.points).toBe(3);
    expect(result.current.entityCount.shapes).toBe(1);
    expect(result.current.hasUnsupported).toBe(false);
  });

  it('setMode toggles between build and refine', () => {
    const { result } = renderHook(() => useAiFigure(undefined, { currentState: triangleState }));
    act(() => result.current.setMode('build'));
    expect(result.current.mode).toBe('build');
    act(() => result.current.setMode('refine'));
    expect(result.current.mode).toBe('refine');
  });

  it('submit in mode=refine passes currentDsl to generator', async () => {
    const generator = jest.fn(async () => ({ ok: true as const, state: emptyState }));
    const { result } = renderHook(() =>
      useAiFigure(generator, { currentState: triangleState }),
    );
    act(() => result.current.setPrompt('thêm M là trung điểm BC'));
    await act(async () => {
      await result.current.submit();
    });
    expect(generator).toHaveBeenCalled();
    const opts = generator.mock.calls[0][1];
    expect(opts.currentDsl).toBeDefined();
    expect(opts.currentDsl.points).toHaveLength(3);
  });

  it('submit in mode=build does NOT pass currentDsl', async () => {
    const generator = jest.fn(async () => ({ ok: true as const, state: emptyState }));
    const { result } = renderHook(() =>
      useAiFigure(generator, { currentState: triangleState }),
    );
    act(() => result.current.setMode('build'));
    act(() => result.current.setPrompt('vẽ tam giác đều'));
    await act(async () => {
      await result.current.submit();
    });
    const opts = generator.mock.calls[0][1];
    expect(opts.currentDsl).toBeUndefined();
  });
});
