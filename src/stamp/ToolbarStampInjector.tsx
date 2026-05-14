'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** Bật/tắt theo role. Khi disabled → không mount portal. */
  enabled: boolean;
  /** Stamp đang active: 'geometry' | 'latex' | null */
  activeStamp: 'geometry' | 'latex' | null;
  onToggleGeometry: () => void;
  onToggleLatex: () => void;
}

const WRAPPER_ID = 'stamp-toolbar-portal-wrapper';

/**
 * Inject 2 nút G / L vào thanh tool chính của Excalidraw (`.App-toolbar .Shape`)
 * sao cho chúng xuất hiện ngay sau nút eraser (tool 9) và kế thừa CSS native
 * của Excalidraw (cùng kích thước, hover, selected state, keybinding label).
 *
 * Pattern: ReactDOM portal vào 1 DOM node được append vào `.Shape`. Dùng
 * `MutationObserver` để re-mount nếu Excalidraw xoá wrapper hoặc re-render
 * toolbar (đổi orientation, mobile/desktop switch...).
 */
export function ToolbarStampInjector({
  enabled,
  activeStamp,
  onToggleGeometry,
  onToggleLatex,
}: Props) {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMountNode(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let observer: MutationObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tryMount = () => {
      if (cancelled) return;
      // Container thật chứa tất cả tool icons trong Excalidraw 0.18+ là
      // `.App-toolbar .Stack.Stack_horizontal`. Class `.Shape` là class trên
      // <label> của mỗi tool radio, không phải parent.
      const container =
        document.querySelector('.excalidraw .App-toolbar .Stack_horizontal') ??
        document.querySelector('.App-toolbar .Stack_horizontal');
      if (!container) {
        if (attempts++ < 20) {
          timer = setTimeout(tryMount, 100);
        }
        return;
      }
      // Nếu wrapper cũ tồn tại (HMR / re-mount) thì tái sử dụng
      let wrapper = container.querySelector<HTMLDivElement>('#' + WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = WRAPPER_ID;
        wrapper.className = 'Stamp-toolbar-injector';
        wrapper.setAttribute('data-stamp-area', 'true');
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '4px';
        wrapper.style.marginInlineStart = '6px';
        wrapper.style.paddingInlineStart = '6px';
        wrapper.style.borderInlineStart = '1px solid var(--default-border-color, rgba(0,0,0,0.1))';
        // Insert before the "More tools" dropdown button (last child) nếu có,
        // còn không thì append cuối.
        const moreTools = container.querySelector('.App-toolbar__extra-tools-dropdown')
          ?? container.querySelector('button[aria-label*="More tools" i]');
        if (moreTools && moreTools.parentElement === container) {
          container.insertBefore(wrapper, moreTools);
        } else {
          container.appendChild(wrapper);
        }
      }
      setMountNode(wrapper);
    };

    tryMount();

    // Observe toolbar parent: nếu Excalidraw re-render và xoá wrapper, ta re-mount.
    const root = document.querySelector('.excalidraw') ?? document.body;
    observer = new MutationObserver(() => {
      if (cancelled) return;
      const stillThere = document.getElementById(WRAPPER_ID);
      if (!stillThere) {
        attempts = 0;
        tryMount();
      }
    });
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      observer?.disconnect();
      // Cleanup wrapper khi component unmount (để tránh leak nếu Excalidraw vẫn render)
      document.getElementById(WRAPPER_ID)?.remove();
    };
  }, [enabled]);

  if (!enabled || !mountNode) return null;

  return createPortal(
    <>
      <StampToolButton
        icon={GeometryIcon}
        keybind="G"
        label="Chèn hình học (G)"
        active={activeStamp === 'geometry'}
        onClick={onToggleGeometry}
        dataTestId="stamp-toolbar-geometry"
      />
      <StampToolButton
        icon={LatexIcon}
        keybind="L"
        label="Chèn công thức LaTeX (L)"
        active={activeStamp === 'latex'}
        onClick={onToggleLatex}
        dataTestId="stamp-toolbar-latex"
      />
    </>,
    mountNode,
  );
}

// Inline SVG icons để khớp template tool 1-9 của Excalidraw (line/stroke style).
const GeometryIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="4,20 20,20 12,5" />
    <circle cx="4" cy="20" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="20" cy="20" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

const LatexIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 5 H7 L13 12 L7 19 H17" />
  </svg>
);

interface StampToolButtonProps {
  icon: React.ReactNode;
  keybind: string;
  label: string;
  active: boolean;
  onClick: () => void;
  dataTestId?: string;
}

/**
 * Render mỗi nút như 1 `<button>` đơn lẻ với class `.ToolIcon.Shape` —
 * cùng pattern Excalidraw apply cho các tool radio: outer `<label class="ToolIcon Shape">`
 * sizing 36×36, inner `.ToolIcon__icon`. Vì Excalidraw set `.ToolIcon` flex layout
 * và size lên label, ta render button trực tiếp ở vị trí ngang hàng (không lồng
 * trong label) và áp dụng CSS sizing thủ công cho khớp 36×36.
 */
function StampToolButton({ icon, keybind, label, active, onClick, dataTestId }: StampToolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      data-testid={dataTestId}
      className="ToolIcon Shape"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'var(--lg-button-size, 2.25rem)',
        height: 'var(--lg-button-size, 2.25rem)',
        padding: 0,
        margin: 0,
        background: active ? 'var(--color-primary-light, #e0e7ff)' : 'transparent',
        border: 0,
        borderRadius: 'var(--space-factor, 0.25rem)',
        color: active ? 'var(--color-primary, #6965db)' : 'var(--icon-fill-color, #1b1b1f)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--button-hover-bg, rgba(0,0,0,0.06))';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div
        aria-hidden="true"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {icon}
      </div>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '3px',
          bottom: '2px',
          fontSize: '0.5625rem',
          color: 'var(--keybinding-color, #6b7280)',
          fontFamily: 'var(--ui-font, system-ui)',
          fontWeight: 400,
          pointerEvents: 'none',
        }}
      >
        {keybind}
      </span>
    </button>
  );
}
