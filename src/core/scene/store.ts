// src/core/scene/store.ts
import { produce } from 'immer';
import { reduce } from './reducer';
import type { Action, State } from './types';

export type StoreListener = (next: State, prev: State, action: Action) => void;

export interface Store {
  getState(): State;
  dispatch(action: Action): void;
  subscribe(listener: StoreListener): () => void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  transaction(fn: (dispatch: (a: Action) => void) => void): void;
  withoutHistory(fn: () => void): void;
}

export type StoreOptions = { historyLimit?: number };

const HISTORY_DEFAULT = 100;

const UNDO_ACTION: Action = { type: 'TRANSACTION', payload: { actions: [] } };
const REDO_ACTION: Action = { type: 'TRANSACTION', payload: { actions: [] } };

export function createStore(initial: State, options: StoreOptions = {}): Store {
  const limit = options.historyLimit ?? HISTORY_DEFAULT;
  let state = initial;
  const past: State[] = [];
  const future: State[] = [];
  const listeners = new Set<StoreListener>();
  let dispatching = false;
  let suspendHistory = false;
  let transactionActions: Action[] | null = null;

  function notify(prev: State, action: Action): void {
    listeners.forEach(l => l(state, prev, action));
  }

  function pushHistory(prev: State): void {
    if (suspendHistory) return;
    past.push(prev);
    if (past.length > limit) past.shift();
    future.length = 0;
  }

  function applyAction(action: Action): void {
    const prev = state;
    state = produce(state, draft => { reduce(draft, action); });
    if (state !== prev) {
      pushHistory(prev);
      notify(prev, action);
    }
  }

  return {
    getState: () => state,

    dispatch(action: Action) {
      if (dispatching) throw new Error('[scene] không được dispatch trong subscriber');
      if (transactionActions) {
        transactionActions.push(action);
        return;
      }
      dispatching = true;
      try { applyAction(action); } finally { dispatching = false; }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    undo() {
      const prev = past.pop();
      if (!prev) return;
      future.push(state);
      const old = state;
      state = prev;
      notify(old, UNDO_ACTION);
    },

    redo() {
      const next = future.pop();
      if (!next) return;
      past.push(state);
      if (past.length > limit) past.shift();
      const old = state;
      state = next;
      notify(old, REDO_ACTION);
    },

    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,

    transaction(fn) {
      if (transactionActions) throw new Error('[scene] transaction lồng nhau không hỗ trợ');
      transactionActions = [];
      try { fn((a) => { transactionActions!.push(a); }); }
      finally {
        const actions = transactionActions;
        transactionActions = null;
        if (actions.length > 0) {
          applyAction({ type: 'TRANSACTION', payload: { actions } });
        }
      }
    },

    withoutHistory(fn) {
      const prevSuspend = suspendHistory;
      suspendHistory = true;
      try { fn(); } finally { suspendHistory = prevSuspend; }
    },
  };
}
