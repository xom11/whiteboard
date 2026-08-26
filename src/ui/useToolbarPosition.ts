'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_TOOLBAR_POSITION,
  loadToolbarPosition,
  saveToolbarPosition,
  type ToolbarPosition,
} from './toolbarPosition';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface UseToolbarPositionResult {
  position: ToolbarPosition;
  setPosition: (next: ToolbarPosition) => void;
}

/**
 * Vị trí thanh công cụ, ghi nhớ trên máy này qua localStorage.
 *
 * Đọc trong `useEffect` chứ KHÔNG trong lazy initializer của `useState`:
 * consumer là Next.js App Router, initializer đọc localStorage sẽ lệch
 * giữa HTML server render và lần hydrate đầu. Chấp nhận được vì
 * Excalidraw nằm trong `<Suspense>` và mất >1s mới mount — không ai kịp
 * thấy frame ở vị trí mặc định.
 */
export function useToolbarPosition(): UseToolbarPositionResult {
  const [position, setPositionState] = useState<ToolbarPosition>(
    DEFAULT_TOOLBAR_POSITION,
  );

  useEffect(() => {
    setPositionState(loadToolbarPosition(getStorage()));
  }, []);

  const setPosition = useCallback((next: ToolbarPosition) => {
    setPositionState(next);
    saveToolbarPosition(next, getStorage());
  }, []);

  return { position, setPosition };
}
