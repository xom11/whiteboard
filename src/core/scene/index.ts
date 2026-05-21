// src/core/scene/index.ts
export type {
  SceneObject,
  State,
  Action,
  KindDef,
  RenderCtx,
} from './types';
export { EMPTY_STATE, createEmptyState } from './types';
export { createStore } from './store';
export type { Store, StoreListener, StoreOptions } from './store';
export { reduce } from './reducer';
export { registerKind, getKind, listKinds } from './registry';
export { listObjects, byKind, dependentsOf, nextLabel } from './selectors';
export { migrateState } from './migrations/runMigrations';
export { registerStateMigration, CURRENT_STATE_VERSION } from './migrations/state';

export { useSceneStore, useEditorState } from './hooks';
export type { SceneStoreApi, UseEditorStateOptions } from './hooks';

// IMPORTANT: import kinds barrel để side-effect register chạy.
import './kinds';
