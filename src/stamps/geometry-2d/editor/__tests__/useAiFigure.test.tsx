import { act, renderHook } from '@testing-library/react';
import { createEmptyState, type State } from '../../../../core/scene';
import type { GenerateGeometryFigure } from '../../../shared/types';
import { useAiFigure } from '../useAiFigure';

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

  it('partial render → trả state + set notice (to-do list), không phải error', async () => {
    const generator: GenerateGeometryFigure = jest.fn(async () => ({
      ok: true as const,
      state: generatedState('A'),
      partial: { message: '✏️ Bạn tự dựng nốt:\n• P (chưa dựng được)' },
    }));
    const { result } = renderHook(() => useAiFigure(generator));

    act(() => result.current.setPrompt('Cho tam giác ABC, P là điểm Fermat.'));
    let state: State | null = null;
    await act(async () => {
      state = await result.current.submit();
    });

    expect(state).not.toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.notice).toContain('P');
    expect(result.current.notice).toContain('tự dựng nốt');
  });

  it('full success (không partial) → notice vẫn null', async () => {
    const generator: GenerateGeometryFigure = jest.fn(async () => ({
      ok: true as const,
      state: generatedState('A'),
    }));
    const { result } = renderHook(() => useAiFigure(generator));

    act(() => result.current.setPrompt('Cho tam giác ABC.'));
    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.notice).toBeNull();
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
