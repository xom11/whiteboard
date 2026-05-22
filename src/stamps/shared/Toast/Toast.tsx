import React from 'react';
import type { ToastVariant } from './types';

const VARIANT_CLASS: Record<ToastVariant, string> = {
  info: 'border-l-sky-500',
  warning: 'border-l-amber-500',
  error: 'border-l-rose-500',
};

const VARIANT_ICON: Record<ToastVariant, React.ReactNode> = {
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

interface ToastProps {
  id: string;
  message: string;
  variant: ToastVariant;
  onDismiss: (id: string) => void;
}

export function Toast({ id, message, variant, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      className={[
        'pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg border-l-4 bg-white px-3 py-2 text-sm text-slate-800 shadow-md ring-1 ring-black/5',
        VARIANT_CLASS[variant],
      ].join(' ')}
    >
      <span className="mt-0.5 shrink-0 text-slate-500">{VARIANT_ICON[variant]}</span>
      <span className="flex-1 leading-snug">{message}</span>
      <button
        type="button"
        aria-label="Đóng thông báo"
        onClick={() => onDismiss(id)}
        className="-mr-1 ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        ×
      </button>
    </div>
  );
}
