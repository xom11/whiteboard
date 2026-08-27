'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_PAPER_STYLE,
  loadPaperStyle,
  savePaperStyle,
  type PaperStyle,
} from './paperStyle';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface UsePaperBackgroundResult {
  paperStyle: PaperStyle;
  setPaperStyle: (next: PaperStyle) => void;
  togglePaperStyle: () => void;
}

/**
 * Kiểu nền bảng, ghi nhớ trên máy này qua localStorage.
 *
 * Đọc trong `useEffect` chứ KHÔNG trong lazy initializer của `useState`
 * — cùng lý do đã ghi ở `useToolbarPosition`: consumer là Next.js App
 * Router, đọc localStorage lúc initializer sẽ lệch giữa HTML server
 * render và lần hydrate đầu.
 */
export function usePaperBackground(): UsePaperBackgroundResult {
  const [paperStyle, setPaperStyleState] =
    useState<PaperStyle>(DEFAULT_PAPER_STYLE);

  useEffect(() => {
    setPaperStyleState(loadPaperStyle(getStorage()));
  }, []);

  const setPaperStyle = useCallback((next: PaperStyle) => {
    setPaperStyleState(next);
    savePaperStyle(next, getStorage());
  }, []);

  const togglePaperStyle = useCallback(() => {
    setPaperStyleState((prev) => {
      const next: PaperStyle = prev === 'lined' ? 'none' : 'lined';
      savePaperStyle(next, getStorage());
      return next;
    });
  }, []);

  return { paperStyle, setPaperStyle, togglePaperStyle };
}
