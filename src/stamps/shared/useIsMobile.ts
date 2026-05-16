'use client';

import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 768px)';
const NO_HOVER_QUERY = '(hover: none)';

export interface MobileState {
  /** Viewport ≤ 768px — dùng để chuyển full-screen modal + drawer. */
  isMobile: boolean;
  /** Device không có hover (touch-only) — dùng để ẩn hover tooltips. */
  isTouchOnly: boolean;
}

function readMatch(query: string): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/**
 * SSR-safe mobile detection qua matchMedia. Trả về `{ isMobile, isTouchOnly }`.
 * Re-render khi viewport resize hoặc input modality đổi (e.g., gắn Bluetooth mouse).
 */
export function useIsMobile(): MobileState {
  const [state, setState] = useState<MobileState>(() => ({
    isMobile: readMatch(MOBILE_QUERY),
    isTouchOnly: readMatch(NO_HOVER_QUERY),
  }));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const tql = window.matchMedia(NO_HOVER_QUERY);
    const update = () => {
      setState({ isMobile: mql.matches, isTouchOnly: tql.matches });
    };
    update();
    mql.addEventListener('change', update);
    tql.addEventListener('change', update);
    return () => {
      mql.removeEventListener('change', update);
      tql.removeEventListener('change', update);
    };
  }, []);

  return state;
}
