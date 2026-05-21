// src/core/scene/hooks/useEditorState.ts
import * as React from 'react';
import type { Store } from '../store';
import type { State } from '../types';

export interface UseEditorStateOptions {
  /** Store sẵn có (host owns). */
  store: Store;
  /** Serialized scene để LOAD lúc mount. Null/undefined = bỏ qua. */
  initialState?: { state: State } | null;
  /** Notify host mỗi khi store fire (canUndo/canRedo có thể đổi). */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  /** Bind Ctrl/Cmd+Z, Cmd+Shift+Z, Ctrl+Y. Default true. */
  bindKeyboardShortcuts?: boolean;
}

// Side effects chung cho stamp editor panel mà host owns store:
// - LOAD initial state một lần (trong withoutHistory để không bẩn undo stack).
// - Propagate canUndo/canRedo lên host qua callback.
// - Bind global keyboard shortcuts cho undo/redo.
export function useEditorState(opts: UseEditorStateOptions): void {
  const { store, initialState, onHistoryChange, bindKeyboardShortcuts = true } = opts;

  const onHistoryChangeRef = React.useRef(onHistoryChange);
  onHistoryChangeRef.current = onHistoryChange;

  React.useEffect(() => {
    if (initialState?.state) {
      const loaded = initialState.state;
      store.withoutHistory(() => {
        store.dispatch({ type: 'LOAD', payload: { state: loaded } });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    onHistoryChangeRef.current?.(store.canUndo(), store.canRedo());
    const unsub = store.subscribe(() => {
      onHistoryChangeRef.current?.(store.canUndo(), store.canRedo());
    });
    return unsub;
  }, [store]);

  React.useEffect(() => {
    if (!bindKeyboardShortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const inField = !!(
        ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)
      );
      if (inField) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        store.undo();
      } else if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        store.redo();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [store, bindKeyboardShortcuts]);
}
