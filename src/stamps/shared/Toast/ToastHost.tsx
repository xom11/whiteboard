import React from 'react';
import { Toast } from './Toast';
import { useToast } from './useToast';

/**
 * Renders the active toast queue. Mount once near the root of each stamp
 * EditorPanel (inside ToastProvider). Positions itself absolutely at
 * bottom-center of the nearest positioned ancestor.
 */
export function ToastHost() {
  const { items, dismiss } = useToast();
  if (items.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-3 z-50 flex flex-col items-center gap-2"
    >
      {items.map((it) => (
        <Toast key={it.id} id={it.id} message={it.message} variant={it.variant} onDismiss={dismiss} />
      ))}
    </div>
  );
}
