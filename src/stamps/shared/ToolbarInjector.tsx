'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_STAMPS } from './registry';
import type { StampType } from './types';

interface Props {
  /** Bật/tắt theo role. Khi disabled → không mount portal. */
  enabled: boolean;
  /** Kind stamp đang active, hoặc null nếu không có stamp nào mở. */
  activeStampKind: string | null;
  /** Toggle stamp theo kind. */
  onToggle: (kind: string) => void;
  /** Danh sách stamp đăng ký. Mặc định DEFAULT_STAMPS. */
  stamps?: ReadonlyArray<StampType>;
}

const MENU_WRAPPER_ID = 'stamp-menu-portal-wrapper';
/**
 * Excalidraw 0.18 áp dụng class `App-toolbar__extra-tools-dropdown` lên
 * popover wrapper của More tools cho cả desktop lẫn mobile. Mobile có
 * thêm modifier `dropdown-menu--mobile`. Selector này cover cả hai mode.
 */
const POPOVER_SELECTOR =
  '.App-toolbar__extra-tools-dropdown .dropdown-menu-container';

/**
 * Inject stamp buttons vào popover "More tools" của Excalidraw.
 *
 * v0.7.0: thay vì inject inline vào main toolbar (desktop) hoặc dropdown
 * riêng cho mobile, ta chỉ inject vào dropdown-menu-container bên trong
 * popover của Excalidraw. Selector cover cả desktop lẫn mobile vì hai
 * mode dùng cùng cấu trúc DOM (DropdownMenu.Content).
 *
 * Popover mount/unmount theo trigger click → MutationObserver dò DOM,
 * mount lại wrapper khi cần.
 */
export function ToolbarInjector({
  enabled,
  activeStampKind,
  onToggle,
  stamps = DEFAULT_STAMPS,
}: Props) {
  const [menuMount, setMenuMount] = useState<HTMLElement | null>(null);
  const menuMountRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (menuMountRef.current !== null) {
        menuMountRef.current = null;
        setMenuMount(null);
      }
      document.getElementById(MENU_WRAPPER_ID)?.remove();
      return;
    }

    let cancelled = false;
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;
    let observedRoot: Element | null = null;

    const apply = (next: HTMLElement | null) => {
      if (cancelled || menuMountRef.current === next) return;
      menuMountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setMenuMount(next);
      });
    };

    const findMenu = () => {
      if (cancelled) return;
      const container = document.querySelector<HTMLElement>(POPOVER_SELECTOR);
      if (!container) {
        apply(null);
        return;
      }
      let wrapper = container.querySelector<HTMLDivElement>('#' + MENU_WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = MENU_WRAPPER_ID;
        wrapper.setAttribute('data-stamp-menu', 'true');
        wrapper.setAttribute('data-stamp-area', 'true');
        wrapper.style.display = 'contents';
        container.insertBefore(wrapper, container.firstChild);
      }
      apply(wrapper);
    };

    /**
     * Scope observer xuống `.excalidraw` để giảm tần suất callback trigger
     * (mutation ở các node ngoài Excalidraw không liên quan tới popover).
     * Nếu `.excalidraw` chưa mount → tạm observe `document.body` để bắt
     * lúc nó xuất hiện, rồi switch sang root nhỏ hơn.
     */
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

    /**
     * rAF debounce: gộp nhiều mutation cùng tick thành 1 lần xử lý.
     * Excalidraw có thể trigger hàng chục mutation khi mở/đóng popover —
     * mỗi pass chỉ tốn 1 lần querySelector + DOM insert.
     */
    const onMutation = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (cancelled) return;
        // Nếu đang observe body mà giờ `.excalidraw` đã mount → switch sang nó.
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
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      observer?.disconnect();
      observer = null;
      observedRoot = null;
      document.getElementById(MENU_WRAPPER_ID)?.remove();
    };
  }, [enabled]);

  if (!enabled || !menuMount) return null;

  const closePopover = () => {
    const trigger = document.querySelector<HTMLButtonElement>(
      '.App-toolbar__extra-tools-trigger',
    );
    trigger?.click();
  };

  return createPortal(
    <>
      {stamps.map((stamp) => (
        <StampMenuItem
          key={stamp.kind}
          icon={stamp.toolbarIcon}
          label={stamp.toolbarTitle}
          active={activeStampKind === stamp.kind}
          onClick={() => {
            onToggle(stamp.kind);
            closePopover();
          }}
          dataTestId={stamp.toolbarTestId}
        />
      ))}
      <div
        aria-hidden="true"
        style={{
          height: 1,
          background: 'var(--default-border-color, rgba(0,0,0,0.08))',
          margin: '6px 4px',
        }}
      />
    </>,
    menuMount,
  );
}

interface StampMenuItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  dataTestId?: string;
}

function StampMenuItem({ icon, label, active, onClick, dataTestId }: StampMenuItemProps) {
  const className = [
    'dropdown-menu-item',
    'dropdown-menu-item-base',
    active ? 'dropdown-menu-item--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      data-testid={dataTestId}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        columnGap: '0.625rem',
        width: '100%',
        boxSizing: 'border-box',
        background: 'transparent',
        border: '1px solid transparent',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '0.875rem',
        color: 'var(--color-on-surface)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '1rem',
          height: '1rem',
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
