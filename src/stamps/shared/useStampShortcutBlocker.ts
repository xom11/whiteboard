import { useEffect, useMemo } from 'react';
import type { StampType } from './types';

const ALLOWED_KEYS = new Set([
  'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
  'Home', 'End', 'PageUp', 'PageDown',
]);

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

interface Opts {
  /** Active stamp kind. Null = no blocker. */
  activeStamp: string | null;
  /** Stamps đăng ký để allow shortcut keys của chúng đi qua. */
  stamps: ReadonlyArray<StampType>;
}

/**
 * Khi 1 stamp panel đang mở, block hoàn toàn các phím tắt Excalidraw
 * (1-9, V, R, D...) bằng cách prevent + stop tại capture phase. Cho phép qua:
 * Tab/Arrow/Modifier, Escape, và phím tắt đã đăng ký bởi stamps (V/G/L/D...).
 */
export function useStampShortcutBlocker({ activeStamp, stamps }: Opts) {
  const shortcutKeys = useMemo(
    () => new Set(stamps.map((s) => s.shortcutKey.toLowerCase())),
    [stamps],
  );

  useEffect(() => {
    if (!activeStamp) return;

    const blocker = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.ctrlKey || e.metaKey) return;
      if (ALLOWED_KEYS.has(e.key)) return;
      if (e.key === 'Escape') return;
      if (shortcutKeys.has(e.key.toLowerCase())) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blocker, { capture: true });
    return () => window.removeEventListener('keydown', blocker, { capture: true });
  }, [activeStamp, shortcutKeys]);
}
