'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Mục consumer cắm thêm vào dropdown "More tools" của Excalidraw, cạnh "Chèn PDF".
 * Bấm ⇒ đóng dropdown rồi gọi `onSelect`.
 */
export interface WhiteboardExtraTool {
  /** Khoá ổn định — React key và `data-testid="wb-extra-tool-<key>"`. */
  key: string;
  label: string;
  /** Icon ~18×18; bỏ trống ⇒ icon "+" mặc định. */
  icon?: ReactNode;
  onSelect: () => void;
}

export interface ExtraToolsInjectorProps {
  /** Tắt khi readOnly — không portal, gỡ wrapper cũ. */
  enabled: boolean;
  tools: ReadonlyArray<WhiteboardExtraTool>;
}

const WRAPPER_ID = 'wb-extra-tools-portal-wrapper';
const POPOVER_SELECTOR = '.App-toolbar__extra-tools-dropdown .dropdown-menu-container';
const TRIGGER_SELECTOR = '.App-toolbar__extra-tools-trigger';

/**
 * Portal các mục của consumer vào popover "More tools" — cùng cơ chế `PdfImporterButton`:
 * Excalidraw mount/unmount popover mỗi lần mở/đóng nên phải quan sát `.excalidraw`
 * (MutationObserver, gom nhịp bằng rAF) để dựng lại wrapper. Effect chỉ phụ thuộc
 * "có mục để hiện hay không" — đổi nội dung `tools` chỉ render lại portal, không dựng
 * lại observer (consumer truyền mảng mới mỗi render cũng không sao).
 */
export function ExtraToolsInjector({ enabled, tools }: ExtraToolsInjectorProps) {
  const active = enabled && tools.length > 0;
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const mountRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) {
      mountRef.current = null;
      setMount(null);
      document.getElementById(WRAPPER_ID)?.remove();
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

    const findMenu = () => {
      if (cancelled) return;
      const container = document.querySelector<HTMLElement>(POPOVER_SELECTOR);
      if (!container) {
        apply(null);
        return;
      }
      let wrapper = container.querySelector<HTMLDivElement>('#' + WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = WRAPPER_ID;
        wrapper.style.display = 'contents';
        // Append cuối: nằm sau stamps + "Chèn PDF".
        container.appendChild(wrapper);
      }
      apply(wrapper);
    };

    const onMutation = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (cancelled) return;
        if (observedRoot !== document.querySelector('.excalidraw')) attachObserver();
        findMenu();
      });
    };

    const attachObserver = () => {
      if (cancelled) return;
      const nextRoot: Element = document.querySelector<HTMLElement>('.excalidraw') ?? document.body;
      if (observedRoot === nextRoot) return;
      observer?.disconnect();
      observedRoot = nextRoot;
      observer = new MutationObserver(onMutation);
      observer.observe(nextRoot, { childList: true, subtree: true });
    };

    findMenu();
    attachObserver();

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      observer?.disconnect();
      document.getElementById(WRAPPER_ID)?.remove();
    };
  }, [active]);

  if (!active || !mount) return null;

  return createPortal(
    <>
      {tools.map((t) => (
        <button
          key={t.key}
          type="button"
          title={t.label}
          aria-label={t.label}
          data-testid={`wb-extra-tool-${t.key}`}
          className="dropdown-menu-item dropdown-menu-item-base"
          onClick={() => {
            // Đóng popover trước (như "Chèn PDF"), rồi mới giao cho consumer.
            document.querySelector<HTMLButtonElement>(TRIGGER_SELECTOR)?.click();
            t.onSelect();
          }}
        >
          <div className="dropdown-menu-item__icon" aria-hidden="true">
            {t.icon ?? <PlusIcon />}
          </div>
          <div className="dropdown-menu-item__text">{t.label}</div>
        </button>
      ))}
    </>,
    mount,
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
