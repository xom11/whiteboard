import { useEffect } from 'react';
import type { Store } from '../../../core/scene/store';

interface Params {
  store: Store;
  /** Current selection ids — Delete/Backspace act on. */
  selectedSetRef: { readonly current: Set<string> };
  deleteSelection: () => void;
}

/**
 * Capture-phase keyboard shortcuts cho 2D editor:
 *
 * - Ctrl/Cmd+Z → undo
 * - Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y → redo
 * - Delete/Backspace → delete selection
 *
 * Esc cố ý KHÔNG xử lý ở đây — user nhấn Esc khi đang vẽ dở (mid-tool action)
 * không nên mất pending picks. Popovers (Properties/Transform) tự handle Esc
 * qua onKeyDown / document listener ở bubble phase.
 *
 * Capture phase + stopPropagation để win với Excalidraw's bubble handlers
 * (vốn nắm các phím tương tự). Ignore khi focus đang ở input/textarea/contentEditable.
 */
export function useEditorShortcuts({
  store,
  selectedSetRef,
  deleteSelection,
}: Params): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const ae = document.activeElement as HTMLElement | null;
      const inField = !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));
      const lk = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && lk === 'z' && !e.shiftKey) {
        if (inField) return;
        e.preventDefault(); e.stopPropagation(); store.undo(); return;
      }
      if ((e.metaKey || e.ctrlKey) && ((lk === 'z' && e.shiftKey) || (lk === 'y' && !e.shiftKey))) {
        if (inField) return;
        e.preventDefault(); e.stopPropagation(); store.redo(); return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !inField && selectedSetRef.current.size > 0) {
        e.preventDefault(); e.stopPropagation(); deleteSelection();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [store, selectedSetRef, deleteSelection]);
}
