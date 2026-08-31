'use client';

import { useEffect, type RefObject } from 'react';

import { clampCamera, sameCamera, type Camera } from './pageCamera';


type ExApi = any;

/**
 * Giữ camera của Excalidraw trong biên trang giấy.
 *
 * VÌ SAO KẸP SAU LẠI CHẠY ĐƯỢC: Excalidraw cập nhật camera cộng dồn từ
 * state hiện tại (`scrollX: this.state.scrollX - dx / this.state.zoom.value`
 * trong dist/prod/index.js), không phải từ gốc cử chỉ. Nên ghi giá trị đã
 * kẹp ngược vào state thì sự kiện kế tiếp tính TỪ giá trị đã kẹp — được
 * vách cứng, không giằng co. Nếu upstream đổi sang `originScroll + tổngDelta`
 * thì vách sẽ rung suốt lúc kéo và cách này phải bỏ.
 *
 * Không có cờ "đang tự ghi" nào cả: sau khi kẹp, camera đã nằm trong biên
 * nên lần gọi lại là no-op nhờ `sameCamera`. Đó là toàn bộ cơ chế chống dội.
 */
export function usePageCamera(
  api: ExApi | null,
  enabled: boolean,
  layerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!api || !enabled) return;

    const clampNow = () => {
      let state: {
        scrollX?: number;
        scrollY?: number;
        zoom?: { value?: number };
        width?: number;
      } | null = null;
      try {
        state = api.getAppState?.() ?? null;
      } catch {
        // Excalidraw đã unmount trước ta.
        return;
      }
      if (!state) return;

      const current: Camera = {
        scrollX: state.scrollX ?? 0,
        scrollY: state.scrollY ?? 0,
        zoom: state.zoom?.value ?? 1,
      };
      const next = clampCamera(current, state.width ?? 0);
      if (sameCamera(current, next)) return;

      try {
        // captureUpdate 'NEVER': kéo camera về trong trang là hiển thị,
        // không phải thao tác vẽ — đừng chiếm một bậc undo của giáo viên.
        api.updateScene?.({
          appState: {
            scrollX: next.scrollX,
            scrollY: next.scrollY,
            zoom: { value: next.zoom },
          },
          captureUpdate: 'NEVER',
        });
      } catch {
        /* API chưa sẵn sàng — lần sự kiện sau sẽ thử lại. */
      }
    };

    // Lúc vừa bật, camera gần như luôn nằm ngoài biên (bảng đang zoom tự do).
    clampNow();

    const unsubscribe = api.onScrollChange?.(clampNow);

    // Cửa sổ co giãn KHÔNG đổi scrollY ⇒ onScrollChange không bắn ⇒ minZoom
    // mới không được áp và camera lặng lẽ nằm ngoài biên. Phải quan sát riêng.
    let observer: ResizeObserver | undefined;
    const layer = layerRef.current;
    if (layer && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(clampNow);
      observer.observe(layer);
    }

    return () => {
      unsubscribe?.();
      observer?.disconnect();
    };
  }, [api, enabled, layerRef]);
}
