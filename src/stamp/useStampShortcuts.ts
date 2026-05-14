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
      if (key === 'g') { e.preventDefault(); onGeometry(); }
      else if (key === 'l') { e.preventDefault(); onLatex(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onGeometry, onLatex]);
}
