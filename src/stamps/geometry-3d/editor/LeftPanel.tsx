'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TOOLS_3D, GROUP_LABELS_3D, type GeomTool3D, type ToolDef3D, type ToolGroup3D } from './tools';
import { ToolButton, ICONS_3D } from './toolButtons';
import type { MiniBoard3DHandle } from './MiniBoard3D';
import { MobileToolDrawer, type MobileToolGroup } from '../../shared/MobileToolDrawer';

const TOOLTIP_DELAY_MS = 400;
type HoverState = { label: string; hint?: string; x: number; y: number } | null;

// ---------- Shell (desktop) ----------

interface ShellProps {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  isDark?: boolean;
}

function Shell({ title, icon, onClose, children, isDark }: ShellProps) {
  return (
    <aside
      role="complementary"
      aria-label={title}
      data-testid="geom3d-left-panel"
      data-stamp-area="true"
      className={[
        isDark ? 'theme--dark ' : '',
        'absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200',
      ].join('')}
    >
      <header className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="text-base leading-none">{icon}</span>
          {title}
        </h3>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <CloseIcon />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">{children}</div>
    </aside>
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

// ---------- Icons ----------

const Geom3DIconHeader = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7 L14 4 L20 7 L14 10 Z M4 7 L4 17 L14 20 L14 10 M14 20 L20 17 L20 7" />
  </svg>
);

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 7 3 13 9 13" />
      <path d="M3.51 13a9 9 0 1 0 2.13-9.36L3 7" />
    </svg>
  );
}

function ResetViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function AxisIcon3D() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="12" y1="12" x2="22" y2="6" />
      <line x1="12" y1="12" x2="2" y2="18" />
    </svg>
  );
}

function MeshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8 L12 4 L20 8 L12 12 Z" />
      <path d="M4 8 L4 16 L12 20 L12 12" />
      <path d="M12 20 L20 16 L20 8" />
    </svg>
  );
}

// ---------- Props ----------

interface Props {
  handle: MiniBoard3DHandle | null;
  onResetView: () => void;
  onClose: () => void;
  isDark?: boolean;
  isMobile?: boolean;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}

// ---------- Desktop tooltip helper ----------

function useToolHoverTooltip() {
  const [hover, setHover] = useState<HoverState>(null);
  const [portalReady, setPortalReady] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPortalReady(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const showHover = useCallback((el: HTMLElement, t: ToolDef3D) => {
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

  return { hover, portalReady, showHover, hideHover };
}

// ---------- Hook: sync state với handle ----------

function useHandleState(handle: MiniBoard3DHandle | null) {
  const [tool, setTool] = useState<GeomTool3D>('move');
  const [showAxes, setShowAxes] = useState(true);
  const [showMesh, setShowMesh] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    if (!handle) return;
    const sync = () => {
      setTool(handle.getTool());
      setShowAxes(handle.getShowAxes());
      setShowMesh(handle.getShowMesh());
      setCanUndo(handle.canUndo());
    };
    sync();
    return handle.subscribe(sync);
  }, [handle]);

  return { tool, showAxes, showMesh, canUndo };
}

// ---------- Desktop panel ----------

function DesktopPanel(props: Props) {
  const { handle, onResetView, onClose, isDark } = props;
  const { tool, showAxes, showMesh, canUndo } = useHandleState(handle);
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip();

  const grouped = useMemo(() => {
    return TOOLS_3D.reduce<Record<ToolGroup3D, ToolDef3D[]>>(
      (acc, t) => {
        (acc[t.group] ??= []).push(t);
        return acc;
      },
      {} as Record<ToolGroup3D, ToolDef3D[]>,
    );
  }, []);

  return (
    <>
      <Shell title="Hình học 3D" icon={Geom3DIconHeader} onClose={onClose} isDark={isDark}>
        <Section label="Bố cục">
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-700">
            <label className="inline-flex select-none items-center gap-1.5">
              <input
                type="checkbox"
                checked={showAxes}
                onChange={(e) => handle?.setShowAxes(e.target.checked)}
                data-testid="toggle-axes"
              />
              Trục
            </label>
            <label className="inline-flex select-none items-center gap-1.5">
              <input
                type="checkbox"
                checked={showMesh}
                onChange={(e) => handle?.setShowMesh(e.target.checked)}
                data-testid="toggle-mesh"
              />
              Lưới
            </label>
            <button
              type="button"
              onClick={onResetView}
              title="Reset góc nhìn"
              aria-label="Reset view"
              className="ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ResetViewIcon />
            </button>
            <button
              type="button"
              onClick={() => handle?.undo()}
              disabled={!canUndo}
              title="Hoàn tác (Ctrl/Cmd+Z)"
              aria-label="Hoàn tác"
              className="inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              <UndoIcon />
            </button>
          </div>
        </Section>

        {(Object.entries(grouped) as [ToolGroup3D, ToolDef3D[]][]).map(([group, tools]) => (
          <Section key={group} label={GROUP_LABELS_3D[group]}>
            <div className="grid grid-cols-4 gap-1">
              {tools.map((t) => (
                <ToolButton
                  key={t.key}
                  toolKey={t.key}
                  label={t.label}
                  hint={t.hint}
                  active={tool === t.key}
                  onClick={() => handle?.setTool(t.key)}
                  icon={
                    <span
                      onMouseEnter={(e) => showHover(e.currentTarget.closest('button') as HTMLElement, t)}
                      onMouseLeave={hideHover}
                      onFocus={(e) => showHover(e.currentTarget.closest('button') as HTMLElement, t)}
                      onBlur={hideHover}
                    >
                      {ICONS_3D[t.key]}
                    </span>
                  }
                />
              ))}
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

// ---------- Mobile panel (redesigned) ----------

function MobilePanel(props: Props) {
  const { handle, onResetView, isDark, drawerOpen, onDrawerClose } = props;
  const { tool, showAxes, showMesh, canUndo } = useHandleState(handle);

  const groups = useMemo<MobileToolGroup<GeomTool3D, ToolGroup3D>[]>(() => {
    const acc = new Map<ToolGroup3D, ToolDef3D[]>();
    for (const t of TOOLS_3D) {
      if (!acc.has(t.group)) acc.set(t.group, []);
      acc.get(t.group)!.push(t);
    }
    return Array.from(acc.entries()).map(([group, tools]) => ({
      group,
      groupLabel: GROUP_LABELS_3D[group],
      tools: tools.map((t) => ({ key: t.key, label: t.label, icon: ICONS_3D[t.key] })),
    }));
  }, []);

  return (
    <MobileToolDrawer
      title="Hình học 3D"
      headerIcon={Geom3DIconHeader}
      testId="geom3d-left-panel"
      isDark={isDark}
      drawerOpen={!!drawerOpen}
      onDrawerClose={() => onDrawerClose?.()}
      chips={[
        {
          label: 'Trục',
          icon: <AxisIcon3D />,
          pressed: showAxes,
          onToggle: (b) => handle?.setShowAxes(b),
          testId: 'toggle-axes',
        },
        {
          label: 'Lưới',
          icon: <MeshIcon />,
          pressed: showMesh,
          onToggle: (b) => handle?.setShowMesh(b),
          testId: 'toggle-mesh',
        },
      ]}
      actions={[
        {
          label: 'Reset view',
          title: 'Reset góc nhìn',
          icon: <ResetViewIcon />,
          onClick: onResetView,
        },
        {
          label: 'Hoàn tác',
          title: 'Hoàn tác (Ctrl/Cmd+Z)',
          icon: <UndoIcon />,
          onClick: () => handle?.undo(),
          disabled: !canUndo,
        },
      ]}
      groups={groups}
      activeTool={tool}
      onToolSelect={(k) => handle?.setTool(k)}
    />
  );
}

// ---------- Public entry ----------

export function LeftPanel(props: Props) {
  if (props.isMobile) return <MobilePanel {...props} />;
  return <DesktopPanel {...props} />;
}
