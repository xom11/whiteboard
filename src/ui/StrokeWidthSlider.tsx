'use client';

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_STROKE_WIDTH, STROKE_WIDTH_MAX, STROKE_WIDTH_MIN, STROKE_WIDTH_STEP, snapStrokeWidth } from './strokeWidth';
import './strokeWidthSlider.css';

export interface StrokeWidthSliderProps {
  /** Tắt khi readOnly — không mount portal, trả hàng nút gốc về như cũ. */
  enabled: boolean;
  /** `null` = selection lẫn lộn (giống `getFormValue` trả null). */
  value: number | null;
  onChange: (value: number) => void;
}

const WRAPPER_CLASS = 'wb-stroke-width-mount';
const FIELDSET_CLASS = 'wb-stroke-width-fieldset';
/**
 * Neo vào chính hàng nút độ dày nét. Dùng `data-testid` chứ không phải thứ tự
 * fieldset vì panel đổi số fieldset theo tool đang chọn — bám thứ tự là bám vào
 * "Nét vẽ" hoặc "Độ trong" tuỳ lúc. Đã verify testid SỐNG SÓT qua bản prod
 * (`dist/prod/index.js` có đúng 1 lần "strokeWidth-thin"), không bị strip.
 */
const ANCHOR_SELECTOR = '[data-testid="strokeWidth-thin"]';

/**
 * Thanh trượt độ dày nét thay hàng 3 nút thin/bold/extraBold.
 *
 * Excalidraw 0.18 khoá cứng 3 mức (xem `strokeWidth.ts`), mà mức mảnh nhất quy
 * ra nét bút tay vẫn ~4.25px. Ở đây ta portal một slider vào CHÍNH cái
 * `<fieldset>` của Excalidraw rồi ẩn hàng nút gốc bằng CSS.
 *
 * Gắn vào trong fieldset (chứ không phải cạnh nó) là cố ý: fieldset này chỉ
 * xuất hiện khi tool/selection có thuộc tính nét, nên slider **ăn theo luôn
 * logic hiện/ẩn của Excalidraw** — ta không phải tự đoán khi nào nên hiện.
 *
 * Panel mount/unmount theo tool → MutationObserver dò DOM, cùng pattern với
 * `PropsPanelToggle` và `PdfImporterButton`.
 *
 * **Coupling với class/testid nội bộ của Excalidraw** (`.buttonList`,
 * `strokeWidth-thin`) → bump 0.19 phải chạy
 * `npx playwright test tests/e2e/stroke-width-slider.spec.ts`.
 */
export function StrokeWidthSlider({ enabled, value, onChange }: StrokeWidthSliderProps) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const mountRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const cleanupDom = () => {
      document.querySelectorAll('.' + WRAPPER_CLASS).forEach((node) => node.remove());
      document
        .querySelectorAll('.' + FIELDSET_CLASS)
        .forEach((node) => node.classList.remove(FIELDSET_CLASS));
    };

    if (!enabled) {
      mountRef.current = null;
      setMount(null);
      cleanupDom();
      return;
    }

    let cancelled = false;
    let rafId: number | null = null;

    const apply = (next: HTMLElement | null) => {
      if (cancelled || mountRef.current === next) return;
      mountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setMount(next);
      });
    };

    const findFieldset = () => {
      if (cancelled) return;
      const fieldset = document
        .querySelector(ANCHOR_SELECTOR)
        ?.closest<HTMLElement>('fieldset');
      if (!fieldset) {
        // Panel đóng (đổi sang tool không có nét) — gỡ luôn class ẩn khỏi
        // fieldset cũ nếu Excalidraw tái dùng node.
        cleanupDom();
        apply(null);
        return;
      }
      fieldset.classList.add(FIELDSET_CLASS);
      let wrapper = fieldset.querySelector<HTMLDivElement>('.' + WRAPPER_CLASS);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = WRAPPER_CLASS;
        fieldset.appendChild(wrapper);
      }
      apply(wrapper);
    };

    // Quan sát `document.body` chứ KHÔNG phải `.excalidraw`: node gốc của
    // Excalidraw có thể bị thay nguyên cái (Suspense re-suspend, remount) — khi
    // đó observer bám vào node cũ đã lìa cây sẽ không bao giờ bắn nữa và slider
    // biến mất vĩnh viễn. `body` thì luôn còn. Chi phí thêm không đáng kể: mỗi
    // đợt mutation gộp vào 1 rAF rồi chỉ chạy 1 `querySelector`.
    const observer = new MutationObserver(() => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        findFieldset();
      });
    });

    findFieldset();
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      observer.disconnect();
      cleanupDom();
    };
  }, [enabled]);

  if (!enabled || !mount) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(snapStrokeWidth(Number(e.target.value)));
  };

  const shown = value ?? DEFAULT_STROKE_WIDTH;
  // Phần track đã "đi qua", tính thuần lúc render — KHÔNG đo `offsetWidth` như
  // Excalidraw làm cho bong bóng opacity, vì lúc panel đang thu gọn/ẩn thì
  // offsetWidth = 0 và vệt tô sẽ nhảy về 0.
  const fillPercent =
    ((shown - STROKE_WIDTH_MIN) / (STROKE_WIDTH_MAX - STROKE_WIDTH_MIN)) * 100;

  return createPortal(
    <label className="wb-stroke-width-control">
      <span className="wb-stroke-width-legend">
        Độ dày nét
        <span className="wb-stroke-width-bubble">{value === null ? '' : String(value)}</span>
      </span>
      <input
        type="range"
        className="wb-stroke-width-range"
        data-testid="wb-stroke-width-slider"
        min={STROKE_WIDTH_MIN}
        max={STROKE_WIDTH_MAX}
        step={STROKE_WIDTH_STEP}
        value={shown}
        onChange={handleChange}
        aria-label="Độ dày nét"
        style={{ '--wb-stroke-fill': `${fillPercent}%` } as CSSProperties}
      />
    </label>,
    mount,
  );
}
