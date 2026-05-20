import { renderHook, act } from '@testing-library/react';
import { useActionRecorder } from '../useActionRecorder';
import { createStore } from '../../store';
import { registerKind, getKind } from '../../registry';
import type { State } from '../../types';

const FAKE = 'recorder_kind';
try { getKind(FAKE); } catch {
  registerKind({
    type: FAKE,
    schemaVersion: 1,
    migrate: {},
    dependsOn: () => [],
    describe: (o) => o.label,
    render: () => ({}),
  });
}

function emptyState(): State {
  return { objects: {}, order: [], counter: 0, meta: { domain: '2d', version: 1 } };
}

function makeObj(id: string) {
  return {
    id, kind: FAKE, label: id, visible: true, locked: false,
    layer: 'default', schemaVersion: 1, attrs: {},
  };
}

describe('useActionRecorder', () => {
  it('starts with empty history', () => {
    const store = createStore(emptyState());
    const { result } = renderHook(() => useActionRecorder(store));
    expect(result.current.history).toHaveLength(0);
  });

  it('captures action after dispatch', () => {
    const store = createStore(emptyState());
    const { result } = renderHook(() => useActionRecorder(store));
    act(() => {
      store.dispatch({ type: 'ADD', payload: { obj: makeObj('A') } });
    });
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].action.type).toBe('ADD');
    expect(typeof result.current.history[0].at).toBe('number');
  });

  it('clear() empties history', () => {
    const store = createStore(emptyState());
    const { result } = renderHook(() => useActionRecorder(store));
    act(() => {
      store.dispatch({ type: 'ADD', payload: { obj: makeObj('A') } });
      result.current.clear();
    });
    expect(result.current.history).toHaveLength(0);
  });

  it('stop() pauses recording, record() resumes', () => {
    const store = createStore(emptyState());
    const { result } = renderHook(() => useActionRecorder(store));
    act(() => {
      result.current.stop();
      store.dispatch({ type: 'ADD', payload: { obj: makeObj('A') } });
    });
    expect(result.current.history).toHaveLength(0);
    act(() => {
      result.current.record();
      store.dispatch({ type: 'ADD', payload: { obj: makeObj('B') } });
    });
    expect(result.current.history).toHaveLength(1);
  });

  it('replay reproduces final state identical to recorded sequence', async () => {
    const store = createStore(emptyState());
    const { result } = renderHook(() => useActionRecorder(store));
    act(() => {
      store.dispatch({ type: 'ADD', payload: { obj: makeObj('A') } });
      store.dispatch({ type: 'ADD', payload: { obj: makeObj('B') } });
      store.dispatch({ type: 'DELETE', payload: { id: 'A' } });
    });
    const expectedSnapshot = store.getState();
    expect(Object.keys(expectedSnapshot.objects)).toEqual(['B']);

    await act(async () => {
      await result.current.replay(0);
    });

    const after = store.getState();
    expect(Object.keys(after.objects)).toEqual(['B']);
    expect(after.counter).toBe(expectedSnapshot.counter);
  });

  it('replay does not double-record', async () => {
    const store = createStore(emptyState());
    const { result } = renderHook(() => useActionRecorder(store));
    act(() => {
      store.dispatch({ type: 'ADD', payload: { obj: makeObj('A') } });
    });
    const lengthBefore = result.current.history.length;
    await act(async () => {
      await result.current.replay(0);
    });
    expect(result.current.history.length).toBe(lengthBefore);
  });
});
