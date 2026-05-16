'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TOOLS, GROUP_LABELS, type GeomTool, type ToolDef } from './MiniBoard';

const TOOLTIP_DELAY_MS = 400;
type HoverState = { label: string; hint?: string; x: number; y: number } | null;

// ---------- Shared shell ----------

interface ShellProps {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  isDark?: boolean;
  /** Mobile mode: render as off-canvas drawer with backdrop. */
  isMobile?: boolean;
  /** Mobile drawer state (only used when isMobile). */
  drawerOpen?: boolean;
  /** Click backdrop or close inside drawer → notify parent. */
  onDrawerClose?: () => void;
  /** Header close label fallback. */
  closeLabel?: string;
}

function Shell({ title, icon, onClose, children, isDark, isMobile, drawerOpen, onDrawerClose, closeLabel = 'Đóng' }: ShellProps) {
  const mobileAttrs = isMobile
    ? {
        'data-mobile-drawer': 'true',
        'data-drawer-state': drawerOpen ? 'open' : 'closed',
      }
    : {};
  const handleHeaderClose = () => {
    if (isMobile) onDrawerClose?.();
    else onClose();
  };
  return (
    <>
      {isMobile && drawerOpen && (
        <div
          className="stamp-drawer-backdrop"
          onPointerDown={onDrawerClose}
          aria-hidden="true"
        />
      )}
      <aside
        role="complementary"
        aria-label={title}
        aria-hidden={isMobile && !drawerOpen ? 'true' : undefined}
        data-testid="stamp-left-panel"
        data-stamp-area="true"
        {...mobileAttrs}
        className={[
          isDark ? 'theme--dark ' : '',
          isMobile
            ? 'stamp-drawer-mobile flex flex-col border-r border-slate-200 bg-white shadow-md'
            : 'absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200',
        ].join('')}
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span className="text-base leading-none">{icon}</span>
            {title}
          </h3>
          <button
            onClick={handleHeaderClose}
            aria-label={isMobile ? 'Đóng ngăn công cụ' : closeLabel}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">{children}</div>
      </aside>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </h4>
      {children}
    </section>
  );
}

// ---------- Geometry left panel ----------

interface GeometryLeftPanelProps {
  activeTool: GeomTool;
  onToolChange: (t: GeomTool) => void;
  showAxis: boolean;
  showGrid: boolean;
  onShowAxisChange: (b: boolean) => void;
  onShowGridChange: (b: boolean) => void;
  onUndo: () => void;
  canUndo: boolean;
  onClose: () => void;
  isDark?: boolean;
  isMobile?: boolean;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}

const GeometryIconHeader = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="4,20 20,20 12,5" />
    <circle cx="4" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="20" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export function LeftPanel({
  activeTool,
  onToolChange,
  showAxis,
  showGrid,
  onShowAxisChange,
  onShowGridChange,
  onUndo,
  canUndo,
  onClose,
  isDark,
  isMobile,
  drawerOpen,
  onDrawerClose,
}: GeometryLeftPanelProps) {
  // Group TOOLS by category
  const grouped = TOOLS.reduce<Record<string, ToolDef[]>>((acc, t) => {
    (acc[t.group] ??= []).push(t);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped) as Array<ToolDef['group']>;

  const [hover, setHover] = useState<HoverState>(null);
  const [portalReady, setPortalReady] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPortalReady(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const showHover = useCallback((el: HTMLElement, t: ToolDef) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setHover({ label: t.label, hint: t.hint, x: r.right, y: r.top + r.height / 2 });
    }, TOOLTIP_DELAY_MS);
  }, []);

  const hideHover = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHover(null);
  }, []);

  return (
    <>
    <Shell
      title="Hình học"
      icon={GeometryIconHeader}
      onClose={onClose}
      isDark={isDark}
      isMobile={isMobile}
      drawerOpen={drawerOpen}
      onDrawerClose={onDrawerClose}
    >
      <Section label="Bố cục">
        <div className="flex items-center gap-3 text-[11px] text-slate-700">
          <label className="inline-flex select-none items-center gap-1.5">
            <input
              type="checkbox"
              checked={showAxis}
              onChange={(e) => onShowAxisChange(e.target.checked)}
              data-testid="toggle-axis"
            />
            Trục toạ độ
          </label>
          <label className="inline-flex select-none items-center gap-1.5">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => onShowGridChange(e.target.checked)}
              data-testid="toggle-grid"
            />
            Lưới
          </label>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Hoàn tác (Ctrl/Cmd+Z)"
            aria-label="Hoàn tác"
            className="ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 7 3 13 9 13" />
              <path d="M3.51 13a9 9 0 1 0 2.13-9.36L3 7" />
            </svg>
          </button>
        </div>
      </Section>

      {groupKeys.map((group) => (
        <Section key={group} label={GROUP_LABELS[group]}>
          <div className="grid grid-cols-4 gap-1">
            {grouped[group].map((t) => {
              const active = activeTool === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-label={t.label}
                  aria-pressed={active}
                  data-tool={t.key}
                  onClick={() => {
                    onToolChange(t.key);
                    if (isMobile) onDrawerClose?.();
                  }}
                  onMouseEnter={(e) => showHover(e.currentTarget, t)}
                  onMouseLeave={hideHover}
                  onFocus={(e) => showHover(e.currentTarget, t)}
                  onBlur={hideHover}
                  className={[
                    'flex h-8 items-center justify-center rounded-md transition',
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')}
                >
                  {t.icon}
                </button>
              );
            })}
          </div>
        </Section>
      ))}
    </Shell>
    {portalReady && hover && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed w-max max-w-[220px] rounded-md bg-slate-900 px-2 py-1 text-left text-[11px] leading-tight text-white shadow-lg"
            style={{
              left: hover.x + 8,
              top: hover.y,
              transform: 'translate(0, -50%)',
              zIndex: 2147483600,
            }}
          >
            <span className="block font-medium">{hover.label}</span>
            {hover.hint && <span className="mt-0.5 block text-slate-300">{hover.hint}</span>}
          </div>,
          document.body,
        )
      : null}
    </>
  );
}

// Alias for back-compat
export { LeftPanel as GeometryLeftPanel };
