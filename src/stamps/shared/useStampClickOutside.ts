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
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-stamp-area="true"]')) return;
      hostRef.current?.tryInsert();
      onClose();
    };
    // CHỈ nghe pointerdown, KHÔNG nghe mousedown (bug e2e 2026-07-14):
    // double-click mở re-edit → panel mở ngay TRONG pointerdown thứ 2; React
    // flush effect gắn listener xong thì `mousedown` compat CỦA CÙNG CÚ NHẤN
    // bắn tới → handler thấy target=canvas → tự đóng panel vừa mở (MiniBoard
    // unmount giữa async init → JSXGraph "container not found"). Mọi browser
    // Excalidraw hỗ trợ đều có pointer events → mousedown là thừa.
    window.addEventListener('pointerdown', handler, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', handler, { capture: true });
    };
  }, [activeStamp, hostRef, onClose]);
}
