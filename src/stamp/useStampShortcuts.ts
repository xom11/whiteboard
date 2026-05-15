import { useEffect } from 'react';
import { DEFAULT_STAMPS } from './registry';
import type { StampType } from './registry/types';

interface Options {
  enabled: boolean;
  /** Toggle stamp theo kind khi user bấm shortcut tương ứng. */
  onToggle: (kind: string) => void;
  /** Registry. Mặc định DEFAULT_STAMPS. */
  stamps?: ReadonlyArray<StampType>;
}

function isEditableTarget(t: EventTarget | null): boolean {
  if (!t || !(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * Bind keyboard shortcut cho mỗi stamp trong registry. Capture phase +
 * stopPropagation để chặn trước Excalidraw's bubble-phase handlers (Excalidraw
 * dùng `L` cho Line tool, nếu không chặn → bấm L lại chuyển tool thay vì
 * toggle LaTeX panel).
 */
export function useStampShortcuts({
  enabled,
  onToggle,
  stamps = DEFAULT_STAMPS,
}: Options): void {
  useEffect(() => {
    if (!enabled) return;
    const keyToKind = new Map<string, string>();
    for (const s of stamps) keyToKind.set(s.shortcutKey, s.kind);

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      const kind = keyToKind.get(key);
      if (!kind) return;
      e.preventDefault();
      e.stopPropagation();
      onToggle(kind);
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [enabled, onToggle, stamps]);
}
