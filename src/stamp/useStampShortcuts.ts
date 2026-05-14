import { useEffect } from 'react';

interface Options {
  onGeometry: () => void;
  onLatex: () => void;
  enabled: boolean;
}

function isEditableTarget(t: EventTarget | null): boolean {
  if (!t || !(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function useStampShortcuts({ onGeometry, onLatex, enabled }: Options): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key !== 'g' && key !== 'l') return;
      // Capture phase + stopPropagation: Excalidraw's L shortcut (Line tool) và
      // các phím tắt khác đăng ký ở bubble phase. Phải chặn trước khi event tới
      // được handler của Excalidraw, không thì user bấm L lại bị Excalidraw chuyển
      // sang Line tool thay vì toggle LaTeX panel.
      e.preventDefault();
      e.stopPropagation();
      if (key === 'g') onGeometry();
      else onLatex();
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [enabled, onGeometry, onLatex]);
}
