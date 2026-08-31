'use client';

import { useCallback, useState } from 'react';
import { CaptureUpdateAction, newElementWith } from '@excalidraw/excalidraw';
import { DEFAULT_STROKE_WIDTH, displayedStrokeWidth, snapStrokeWidth } from './strokeWidth';

/** Chỉ dùng phần API thật sự cần — đỡ phải kéo type nặng của Excalidraw vào. */
interface StrokeWidthApi {
  updateScene: (scene: Record<string, unknown>) => void;
  getSceneElements: () => readonly { id: string; strokeWidth?: number }[];
  getAppState: () => {
    selectedElementIds?: Record<string, boolean>;
    currentItemStrokeWidth?: number;
  };
}

/**
 * Cầu nối giữa `StrokeWidthSlider` và scene Excalidraw.
 *
 * Làm lại đúng việc mà `actionChangeStrokeWidth` làm (`dist/dev/index.js:4530`)
 * — đổi nét của element đang chọn + nhớ nét cho hình kế tiếp — nhưng nhận được
 * giá trị ngoài bộ ba thin/bold/extraBold mà hàng nút gốc khoá cứng.
 */
export function useStrokeWidth(api: StrokeWidthApi | null) {
  const [value, setValue] = useState<number | null>(DEFAULT_STROKE_WIDTH);

  /** Gọi từ `onChange` của Excalidraw để slider bám theo selection/công cụ. */
  const sync = useCallback(
    (
      elements: readonly { id: string; strokeWidth?: number; isDeleted?: boolean }[],
      appState: {
        selectedElementIds?: Record<string, boolean>;
        currentItemStrokeWidth?: number;
      },
    ) => {
      const next = displayedStrokeWidth(
        elements,
        appState?.selectedElementIds ?? {},
        appState?.currentItemStrokeWidth,
      );
      // React tự bail-out khi giá trị không đổi — `onChange` bắn mỗi thao tác
      // chuột nên không được để nó ép re-render cả cây Whiteboard mỗi lần.
      setValue((prev) => (prev === next ? prev : next));
    },
    [],
  );

  const apply = useCallback(
    (raw: number) => {
      const next = snapStrokeWidth(raw);
      setValue(next);
      if (!api) return;

      const elements = api.getSceneElements();
      const selected = api.getAppState().selectedElementIds ?? {};
      let changed = false;
      const nextElements = elements.map((el) => {
        if (!selected[el.id] || typeof el.strokeWidth !== 'number') return el;
        changed = true;
        return newElementWith(el as never, { strokeWidth: next } as never);
      });

      api.updateScene({
        // Chỉ đẩy elements khi thật sự có thay đổi: lúc không chọn gì thì đây
        // đơn thuần là "nhớ nét cho hình kế tiếp", không phải một sửa đổi scene.
        ...(changed ? { elements: nextElements } : {}),
        appState: { currentItemStrokeWidth: next },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    },
    [api],
  );

  return { value, sync, apply };
}
