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

const TOOLBAR_WRAPPER_ID = 'stamp-toolbar-portal-wrapper';
const MENU_WRAPPER_ID = 'stamp-menu-portal-wrapper';

/**
 * Inject stamp buttons vào Excalidraw.
 *
 * - **Desktop** (`.excalidraw` không có class `--mobile`): chèn nút vào thanh
 *   tool chính (`.App-toolbar .Stack_horizontal`), trước nút "More tools".
 * - **Mobile** (`.excalidraw.excalidraw--mobile`): main toolbar chật, không
 *   cuộn được → bỏ inject vào toolbar. Thay vào đó, khi user mở popover "More
 *   tools", chèn các stamp dưới dạng `.dropdown-menu-item` ở đầu menu.
 *
 * Phát hiện mobile bằng `MutationObserver` theo class của `.excalidraw` root —
 * Excalidraw tự switch class khi đổi orientation hoặc resize.
 */
export function ToolbarInjector({
  enabled,
  activeStampKind,
  onToggle,
  stamps = DEFAULT_STAMPS,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [toolbarMount, setToolbarMount] = useState<HTMLElement | null>(null);
  const [menuMount, setMenuMount] = useState<HTMLElement | null>(null);

  // Refs giữ giá trị mới nhất → so sánh trong observer để bail-out no-op
  // setState. Tránh trigger setState liên tục trong khi Excalidraw đang commit
  // (React 19 sẽ warn "scheduled from inside an update function").
  const isMobileRef = useRef(false);
  const toolbarMountRef = useRef<HTMLElement | null>(null);
  const menuMountRef = useRef<HTMLElement | null>(null);

  // --- Detect mobile via .excalidraw--mobile class on root ---
  useEffect(() => {
    if (!enabled) {
      if (isMobileRef.current !== false) {
        isMobileRef.current = false;
        setIsMobile(false);
      }
      return;
    }
    let cancelled = false;
    let observer: MutationObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const apply = (next: boolean) => {
      if (cancelled || isMobileRef.current === next) return;
      isMobileRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setIsMobile(next);
      });
    };

    const attach = () => {
      if (cancelled) return;
      const root = document.querySelector<HTMLElement>('.excalidraw');
      if (!root) {
        if (attempts++ < 20) timer = setTimeout(attach, 100);
        return;
      }
      apply(root.classList.contains('excalidraw--mobile'));
      observer = new MutationObserver(() => {
        apply(root.classList.contains('excalidraw--mobile'));
      });
      observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    };
    attach();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      observer?.disconnect();
    };
  }, [enabled]);

  // --- Desktop: inject into main toolbar (.App-toolbar .Stack_horizontal) ---
  useEffect(() => {
    if (!enabled || isMobile) {
      if (toolbarMountRef.current !== null) {
        toolbarMountRef.current = null;
        setToolbarMount(null);
      }
      document.getElementById(TOOLBAR_WRAPPER_ID)?.remove();
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let observer: MutationObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const apply = (next: HTMLElement | null) => {
      if (cancelled || toolbarMountRef.current === next) return;
      toolbarMountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setToolbarMount(next);
      });
    };

    const tryMount = () => {
      if (cancelled) return;
      const container =
        document.querySelector('.excalidraw .App-toolbar .Stack_horizontal') ??
        document.querySelector('.App-toolbar .Stack_horizontal');
      if (!container) {
        if (attempts++ < 20) timer = setTimeout(tryMount, 100);
        return;
      }
      let wrapper = container.querySelector<HTMLDivElement>('#' + TOOLBAR_WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = TOOLBAR_WRAPPER_ID;
        wrapper.className = 'Stamp-toolbar-injector';
        wrapper.setAttribute('data-stamp-area', 'true');
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '4px';
        wrapper.style.marginInlineStart = '6px';
        wrapper.style.paddingInlineStart = '6px';
        wrapper.style.borderInlineStart =
          '1px solid var(--default-border-color, rgba(0,0,0,0.1))';
        const moreTools =
          container.querySelector('.App-toolbar__extra-tools-dropdown') ??
          container.querySelector('button[aria-label*="More tools" i]');
        if (moreTools && moreTools.parentElement === container) {
          container.insertBefore(wrapper, moreTools);
        } else {
          container.appendChild(wrapper);
        }
      }
      apply(wrapper);
    };

    tryMount();

    const root = document.querySelector('.excalidraw') ?? document.body;
    observer = new MutationObserver(() => {
      if (cancelled) return;
      const stillThere = document.getElementById(TOOLBAR_WRAPPER_ID);
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
      document.getElementById(TOOLBAR_WRAPPER_ID)?.remove();
    };
  }, [enabled, isMobile]);

  // --- Mobile: inject into dropdown-menu when popover opens ---
  useEffect(() => {
    if (!enabled || !isMobile) {
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

    const apply = (next: HTMLElement | null) => {
      if (cancelled || menuMountRef.current === next) return;
      menuMountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setMenuMount(next);
      });
    };

    const findMenu = () => {
      if (cancelled) return;
      const container = document.querySelector<HTMLElement>(
        '.dropdown-menu--mobile .dropdown-menu-container',
      );
      if (!container) {
        apply(null);
        return;
      }
      let wrapper = container.querySelector<HTMLDivElement>('#' + MENU_WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = MENU_WRAPPER_ID;
        wrapper.setAttribute('data-stamp-menu', 'true');
        wrapper.style.display = 'contents';
        container.insertBefore(wrapper, container.firstChild);
      }
      apply(wrapper);
    };

    // Coalesce burst of DOM mutations into one rAF pass
    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        findMenu();
      });
    };

    findMenu();

    const root = document.querySelector('.excalidraw') ?? document.body;
    observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      observer?.disconnect();
      document.getElementById(MENU_WRAPPER_ID)?.remove();
    };
  }, [enabled, isMobile]);

  if (!enabled) return null;

  const closeMobileMenu = () => {
    // Click the trigger to collapse the popover
    const trigger = document.querySelector<HTMLButtonElement>(
      '.App-toolbar__extra-tools-trigger',
    );
    trigger?.click();
  };

  const desktopButtons = !isMobile && toolbarMount
    ? createPortal(
        <>
          {stamps.map((stamp) => (
            <StampToolButton
              key={stamp.kind}
              icon={stamp.toolbarIcon}
              keybind={stamp.toolbarLabel}
              label={stamp.toolbarTitle}
              active={activeStampKind === stamp.kind}
              onClick={() => onToggle(stamp.kind)}
              dataTestId={stamp.toolbarTestId}
            />
          ))}
        </>,
        toolbarMount,
      )
    : null;

  const mobileMenuItems = isMobile && menuMount
    ? createPortal(
        <>
          {stamps.map((stamp) => (
            <StampMenuItem
              key={stamp.kind}
              icon={stamp.toolbarIcon}
              label={stamp.toolbarTitle}
              active={activeStampKind === stamp.kind}
              onClick={() => {
                onToggle(stamp.kind);
                closeMobileMenu();
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
      )
    : null;

  return (
    <>
      {desktopButtons}
      {mobileMenuItems}
    </>
  );
}

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

interface StampMenuItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  dataTestId?: string;
}

/**
 * Render menu item kế thừa style native `.dropdown-menu-item` của Excalidraw
 * mobile popover: flex row, icon trái + label phải, height 2.25rem, hover bg.
 * Active state dùng class `.dropdown-menu-item--selected`.
 */
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
