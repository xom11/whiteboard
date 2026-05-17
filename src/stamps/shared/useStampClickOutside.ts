import { useEffect, type RefObject } from 'react';
import type { StampHostHandle } from './types';

interface Opts {
  /** Active stamp. Null = no listener. */
  activeStamp: string | null;
  /** Ref tới Host imperative API (tryInsert / hasContent). */
  hostRef: RefObject<StampHostHandle | null>;
  /** Callback đóng panel. */
  onClose: () => void;
}

/**
 * Khi 1 stamp panel mở, lắng nghe pointer/mouse-down toàn document. Nếu
 * điểm click không nằm trong vùng `[data-stamp-area="true"]`, gọi
 * `hostRef.tryInsert()` để auto-commit (nếu có nội dung) rồi `onClose()`.
 */
export function useStampClickOutside({ activeStamp, hostRef, onClose }: Opts) {
  useEffect(() => {
    if (!activeStamp) return;
    let lastFire = 0;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-stamp-area="true"]')) return;
      const now = Date.now();
      if (now - lastFire < 50) return;
      lastFire = now;
      hostRef.current?.tryInsert();
      onClose();
    };
    window.addEventListener('pointerdown', handler, { capture: true });
    window.addEventListener('mousedown', handler, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', handler, { capture: true });
      window.removeEventListener('mousedown', handler, { capture: true });
    };
  }, [activeStamp, hostRef, onClose]);
}
