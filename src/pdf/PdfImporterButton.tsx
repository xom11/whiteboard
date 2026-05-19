'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  enabled: boolean;
  onPick: (file: File) => void;
}

const WRAPPER_ID = 'pdf-import-portal-wrapper';
const POPOVER_SELECTOR =
  '.App-toolbar__extra-tools-dropdown .dropdown-menu-container';

/**
 * Button "Chèn PDF" portal vào More tools dropdown của Excalidraw, ngay
 * dưới các stamp buttons. Click → mở native file picker (hidden input).
 *
 * Tách riêng khỏi ToolbarInjector vì PDF không phải stamp (không có Host,
 * không re-edit). Cùng pattern observer như ToolbarInjector để bắt
 * popover mount/unmount.
 */
export function PdfImporterButton({ enabled, onPick }: Props) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const mountRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!enabled) {
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
        wrapper.setAttribute('data-pdf-import', 'true');
        wrapper.style.display = 'contents';
        // Append cuối để PDF button nằm sau stamps + divider.
        container.appendChild(wrapper);
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
        findMenu();
      });
    };

    findMenu();
    attachObserver();

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      observer?.disconnect();
      document.getElementById(WRAPPER_ID)?.remove();
    };
  }, [enabled]);

  const closePopover = () => {
    const trigger = document.querySelector<HTMLButtonElement>(
      '.App-toolbar__extra-tools-trigger',
    );
    trigger?.click();
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPick(file);
    // Reset để chọn lại cùng file lần sau vẫn fire onChange.
    e.target.value = '';
    closePopover();
  };

  if (!enabled || !mount) {
    // Vẫn render hidden input để parent có thể gọi qua ref nếu muốn — nhưng
    // không cần. Giữ null khi chưa mount để tránh DOM thừa.
    return (
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {createPortal(
        <button
          type="button"
          onClick={handleClick}
          title="Chèn PDF (P)"
          aria-label="Chèn PDF"
          data-testid="pdf-import-button"
          className="dropdown-menu-item dropdown-menu-item-base"
        >
          <div className="dropdown-menu-item__icon" aria-hidden="true">
            <PdfIcon />
          </div>
          <div className="dropdown-menu-item__text">Chèn PDF</div>
          <div className="dropdown-menu-item__shortcut">P</div>
        </button>,
        mount,
      )}
    </>
  );
}

function PdfIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <text x="7.5" y="17" fontSize="6" fontFamily="sans-serif" fontWeight="700" stroke="none" fill="currentColor">
        PDF
      </text>
    </svg>
  );
}
