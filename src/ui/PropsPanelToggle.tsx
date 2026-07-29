'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import './propsPanelToggle.css';

export interface PropsPanelToggleProps {
  /** Tắt khi readOnly — không mount portal, gỡ wrapper cũ. */
  enabled: boolean;
  /** Panel đang thu gọn hay không. State do Whiteboard giữ. */
  collapsed: boolean;
  onToggle: () => void;
}

const WRAPPER_CLASS = 'wb-props-toggle-mount';
/** Island chứa thuộc tính (Excalidraw `CLASSES.SHAPE_ACTIONS_MENU`). */
const PANEL_SELECTOR = '.App-menu__left';

/**
 * Nút thu gọn panel thuộc tính (issue hoctotbachkhoa#528).
 *
 * Excalidraw 0.18 không có API ẩn riêng panel này (`UIOptions` chỉ có
 * canvasActions/tools/dockedSidebarBreakpoint), còn zen mode thì ẩn cả
 * undo/redo nên không dùng được. Ở đây ta portal một nút vào bên trong
 * Island rồi thu gọn Island bằng CSS.
 *
 * Panel mount/unmount theo tool đang chọn → MutationObserver dò DOM,
 * cùng pattern với `PdfImporterButton`.
 */
export function PropsPanelToggle({
  enabled,
  collapsed,
  onToggle,
}: PropsPanelToggleProps) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const mountRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const removeWrappers = () => {
      document
        .querySelectorAll('.' + WRAPPER_CLASS)
        .forEach((node) => node.remove());
    };

    if (!enabled) {
      mountRef.current = null;
      setMount(null);
      removeWrappers();
      return;
    }

    let cancelled = false;
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;
    let observedRoot: Element | null = null;

    const apply = (next: HTMLElement | null) => {
      if (cancelled || mountRef.current === next) return;
      mountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setMount(next);
      });
    };

    const findPanel = () => {
      if (cancelled) return;
      const panel = document.querySelector<HTMLElement>(PANEL_SELECTOR);
      if (!panel) {
        apply(null);
        return;
      }
      let wrapper = panel.querySelector<HTMLDivElement>('.' + WRAPPER_CLASS);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = WRAPPER_CLASS;
        panel.appendChild(wrapper);
      }
      apply(wrapper);
    };

    const attachObserver = () => {
      if (cancelled) return;
      const excalidraw = document.querySelector<HTMLElement>('.excalidraw');
      const nextRoot: Element = excalidraw ?? document.body;
      if (observedRoot === nextRoot) return;
      observer?.disconnect();
      observedRoot = nextRoot;
      observer = new MutationObserver(onMutation);
      observer.observe(nextRoot, { childList: true, subtree: true });
    };

    const onMutation = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (cancelled) return;
        if (observedRoot !== document.querySelector('.excalidraw')) {
          attachObserver();
        }
        findPanel();
      });
    };

    findPanel();
    attachObserver();

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      observer?.disconnect();
      removeWrappers();
    };
  }, [enabled]);

  if (!enabled || !mount) return null;

  const label = collapsed ? 'Hiện bảng thuộc tính' : 'Ẩn bảng thuộc tính';

  // Blur ngay sau click (F2): nếu không, focus kẹt lại trên nút và phím
  // Space (pan tạm thời của Excalidraw) hoặc Enter ngay sau đó sẽ vô tình
  // toggle lại panel.
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    onToggle();
  };

  return createPortal(
    <button
      type="button"
      className="wb-props-toggle"
      data-testid="props-panel-toggle"
      aria-expanded={!collapsed}
      aria-label={label}
      title={label}
      onClick={handleClick}
    >
      <ChevronIcon direction={collapsed ? 'right' : 'left'} />
    </button>,
    mount,
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === 'left' ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  );
}
