// src/core/scene/hooks/useSceneStore.ts
import { useMemo, useSyncExternalStore } from 'react';
import { createStore, type Store } from '../store';
import type { State } from '../types';

export type SceneStoreApi = {
  store: Store;
  state: State;
  canUndo: boolean;
  canRedo: boolean;
};

// Bridge React → scene store. createStore lifecycle gắn với component
// (useMemo trống deps). useSyncExternalStore subscribe → re-render mỗi
// lần store notify.
export function useSceneStore(initialState: State): SceneStoreApi {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => createStore(initialState), []);
  const state = useSyncExternalStore(
    (cb) => store.subscribe(() => cb()),
    () => store.getState(),
    () => store.getState(),
  );
  const canUndo = store.canUndo();
  const canRedo = store.canRedo();
  return { store, state, canUndo, canRedo };
}
