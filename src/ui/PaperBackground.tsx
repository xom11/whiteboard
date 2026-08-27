'use client';

import { useEffect, useRef } from 'react';

import './paperBackground.css';
import { paperMetrics, type PaperStyle } from './paperStyle';

type ExApi = any;

/** Màu quay về khi tắt nền giấy mà không biết màu cũ là gì. */
const FALLBACK_BACKGROUND = '#ffffff';

export interface PaperBackgroundProps {
  /** 'none' thì không render gì cả — bảng y hệt trước đây. */
  style: PaperStyle;
  api: ExApi | null;
}

/**
 * Lớp giấy kẻ dòng nằm sau canvas Excalidraw.
 *
 * Dòng kẻ phải trôi khớp với nội dung khi pan/zoom, mà pan bắn sự kiện
 * mỗi frame — nên ta ghi thẳng vào `element.style` qua ref thay vì
 * `setState`, tránh re-render cả cây Whiteboard 60 lần/giây.
 */
export function PaperBackground({ style, api }: PaperBackgroundProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!api || !layer || style === 'none') return;

    const apply = (scrollY: number, zoom: number) => {
      const m = paperMetrics(scrollY, zoom);
      layer.style.display = m.visible ? '' : 'none';
      if (!m.visible) return;
      layer.style.backgroundSize = `100% ${m.sizePx}px`;
      layer.style.backgroundPositionY = `${m.offsetPx}px`;
    };

    // Màu nền cũ để trả lại khi tắt. Bỏ qua 'transparent': scene có thể
    // đã được lưu lúc đang bật nền giấy, nhận lại nó rồi "khôi phục" thì
    // bảng trong suốt vĩnh viễn.
    let restoreTo = FALLBACK_BACKGROUND;
    try {
      const st = api.getAppState?.();
      const current = st?.viewBackgroundColor;
      if (typeof current === 'string' && current !== 'transparent') {
        restoreTo = current;
      }
      // captureUpdate 'NEVER': đổi nền là tuỳ chọn hiển thị, không phải
      // thao tác vẽ — đừng chiếm một bậc undo của giáo viên.
      api.updateScene?.({
        appState: { viewBackgroundColor: 'transparent' },
        captureUpdate: 'NEVER',
      });
      if (st) apply(st.scrollY ?? 0, st.zoom?.value ?? 1);
    } catch {
      /* API chưa sẵn sàng — lần render sau sẽ thử lại. */
    }

    const unsubscribe = api.onScrollChange?.(
      (_scrollX: number, scrollY: number, zoom: { value: number }) => {
        apply(scrollY, zoom?.value ?? 1);
      },
    );

    return () => {
      unsubscribe?.();
      try {
        api.updateScene?.({
          appState: { viewBackgroundColor: restoreTo },
          captureUpdate: 'NEVER',
        });
      } catch {
        /* Excalidraw đã unmount trước ta — không còn gì để trả lại. */
      }
    };
  }, [api, style]);

  if (style === 'none') return null;

  return <div ref={layerRef} className="wb-paper-layer" aria-hidden="true" />;
}
