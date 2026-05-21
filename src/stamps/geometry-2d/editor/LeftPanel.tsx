'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TOOLS, GROUP_LABELS, type GeomTool, type ToolDef } from './MiniBoard';
import { GROUP_ORDER, letterForGroup, type GeomGroup } from './tools';
import { MobileToolDrawer, type MobileToolGroup } from '../../shared/MobileToolDrawer';
import type { Store } from '../../../core/scene/store';
import { ObjectListPanel } from '../../../core/scene/ui/ObjectListPanel';
import { LeftPanelShell, Section } from '../../../core/scene/ui/LeftPanelShell';

const TOOLTIP_DELAY_MS = 400;
type HoverState = { label: string; hint?: string; x: number; y: number } | null;

// ---------- Icons ----------

const GeometryIconHeader = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="4,20 20,20 12,5" />
    <circle cx="4" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="20" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10 L8 5 L8 8 L15 8 A5 5 0 0 1 20 13 L20 16" />
      <path d="M3 10 L8 15 L8 12" />
    </svg>
  );
}

export function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10 L16 5 L16 8 L9 8 A5 5 0 0 0 4 13 L4 16" />
      <path d="M21 10 L16 15 L16 12" />
    </svg>
  );
}

function AxisIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="20" y2="20" />
      <line x1="4" y1="20" x2="4" y2="4" />
      <polyline points="2 6 4 4 6 6" />
      <polyline points="18 18 20 20 18 22" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <line x1="10" y1="4" x2="10" y2="20" />
      <line x1="16" y1="4" x2="16" y2="20" />
    </svg>
  );
}

// ---------- Props ----------

interface GeometryLeftPanelProps {
  activeTool: GeomTool;
  onToolChange: (t: GeomTool) => void;
  showAxis: boolean;
  showGrid: boolean;
  onShowAxisChange: (b: boolean) => void;
  onShowGridChange: (b: boolean) => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onClose: () => void;
  isDark?: boolean;
  isMobile?: boolean;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
  /** Chord shortcut: group đang được focus (sau khi bấm letter). null = không active. */
  chordGroup?: GeomGroup | null;
  /** Scene store — bật tab "Đối tượng" khi truyền. */
  store?: Store;
  selectedObjectId?: string;
  onObjectSelect?: (id: string | null) => void;
}

// ---------- Tooltip portal (desktop hover) ----------

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

  return { hover, portalReady, showHover, hideHover };
}

// ---------- Desktop left panel ----------

const TOOLS_TABS = [
  { key: 'tools' as const, label: '🧰 Công cụ', testId: 'tab-tools' },
  { key: 'objects' as const, label: '📐 Đối tượng', testId: 'tab-objects' },
];

function DesktopGeometryPanel(props: GeometryLeftPanelProps) {
  const {
    activeTool, onToolChange,
    showAxis, showGrid, onShowAxisChange, onShowGridChange,
    onUndo, canUndo, onRedo, canRedo,
    onClose, isDark, chordGroup,
    store, selectedObjectId, onObjectSelect,
  } = props;

  const [tab, setTab] = useState<'tools' | 'objects'>('tools');
  const hasStore = !!store;

  useEffect(() => {
    if (!hasStore && tab === 'objects') setTab('tools');
  }, [hasStore, tab]);

  const grouped = useMemo(() => {
    return TOOLS.reduce<Record<string, ToolDef[]>>((acc, t) => {
      (acc[t.group] ??= []).push(t);
      return acc;
    }, {});
  }, []);
  const groupKeys = useMemo(
    () => GROUP_ORDER.filter((g) => grouped[g]),
    [grouped],
  );

  const activeGroupTools: ToolDef[] | null = chordGroup
    ? (grouped[chordGroup] ?? null)
    : null;

  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip();

  return (
    <>
      <LeftPanelShell
        title="Hình học"
        icon={GeometryIconHeader}
        onClose={onClose}
        isDark={isDark}
        testId="stamp-left-panel"
        tabs={hasStore ? TOOLS_TABS : undefined}
        activeTab={hasStore ? tab : undefined}
        onTabChange={hasStore ? setTab : undefined}
      >
        {(!hasStore || tab === 'tools') ? (
          <>
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
                  data-testid="undo-btn"
                  className="ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                >
                  <UndoIcon />
                </button>
                <button
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  title="Làm lại (Ctrl/Cmd+Shift+Z)"
                  aria-label="Làm lại"
                  data-testid="redo-btn"
                  className="inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                >
                  <RedoIcon />
                </button>
              </div>
            </Section>

            {groupKeys.map((group) => {
              const isChordActive = chordGroup === group;
              const dimmed = chordGroup !== null && !isChordActive;
              return (
                <section
                  key={group}
                  data-chord-group={group}
                  data-chord-active={isChordActive ? 'true' : 'false'}
                  className={[
                    'rounded-md transition',
                    isChordActive
                      ? 'bg-emerald-50 ring-1 ring-emerald-400 p-1'
                      : 'p-0',
                    dimmed ? 'opacity-55' : 'opacity-100',
                  ].join(' ')}
                >
                  <h4 className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <span>{GROUP_LABELS[group]}</span>
                    <span
                      data-testid={`chord-letter-${group}`}
                      className={[
                        'font-mono text-[10px] leading-none transition',
                        isChordActive
                          ? 'text-emerald-700 font-bold'
                          : 'text-slate-400',
                      ].join(' ')}
                    >
                      {letterForGroup(group)}
                    </span>
                  </h4>
                  <div className="grid grid-cols-4 gap-1">
                    {grouped[group].map((t, i) => {
                      const active = activeTool === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          aria-label={t.label}
                          aria-pressed={active}
                          data-tool={t.key}
                          onClick={() => onToolChange(t.key)}
                          onMouseEnter={(e) => showHover(e.currentTarget, t)}
                          onMouseLeave={hideHover}
                          onFocus={(e) => showHover(e.currentTarget, t)}
                          onBlur={hideHover}
                          className={[
                            'relative flex h-8 items-center justify-center rounded-md transition',
                            active
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                          ].join(' ')}
                        >
                          {t.icon}
                          <span
                            data-testid={`chord-num-${t.key}`}
                            className={[
                              'pointer-events-none absolute bottom-0 right-0.5 font-mono text-[9px] leading-none transition',
                              active
                                ? 'text-white/70'
                                : isChordActive
                                  ? 'text-emerald-700 font-bold'
                                  : 'text-slate-400',
                            ].join(' ')}
                          >
                            {i + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {chordGroup && activeGroupTools && (
              <div
                data-testid="chord-hint"
                className="mt-1 rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-[11px] leading-snug text-slate-600"
              >
                <span className="font-mono font-semibold text-emerald-700">
                  {letterForGroup(chordGroup)}
                </span>
                <span className="mx-1 text-slate-400">→</span>
                {activeGroupTools.map((t, i) => (
                  <span key={t.key} className="mr-2 inline-block">
                    <span className="font-mono font-semibold text-emerald-700">
                      {i + 1}
                    </span>
                    <span className="ml-1">{t.label}</span>
                  </span>
                ))}
                <span className="text-slate-400">Esc huỷ</span>
              </div>
            )}
          </>
        ) : (
          <section data-testid="objects-panel">
            <ObjectListPanel store={store!} selectedId={selectedObjectId} onSelect={onObjectSelect} />
          </section>
        )}
      </LeftPanelShell>

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

// ---------- Mobile geometry panel (redesigned) ----------

function MobileGeometryPanel(props: GeometryLeftPanelProps) {
  const {
    activeTool,
    onToolChange,
    showAxis,
    showGrid,
    onShowAxisChange,
    onShowGridChange,
    onUndo,
    canUndo,
    onRedo,
    canRedo,
    isDark,
    drawerOpen,
    onDrawerClose,
    store,
    selectedObjectId,
    onObjectSelect,
  } = props;

  const groups = useMemo<MobileToolGroup<GeomTool, ToolDef['group']>[]>(() => {
    const acc = new Map<ToolDef['group'], ToolDef[]>();
    for (const t of TOOLS) {
      if (!acc.has(t.group)) acc.set(t.group, []);
      acc.get(t.group)!.push(t);
    }
    return Array.from(acc.entries()).map(([group, tools]) => ({
      group,
      groupLabel: GROUP_LABELS[group],
      tools: tools.map((t) => ({ key: t.key, label: t.label, icon: t.icon })),
    }));
  }, []);

  return (
    <MobileToolDrawer
      title="Hình học"
      headerIcon={GeometryIconHeader}
      testId="stamp-left-panel"
      isDark={isDark}
      drawerOpen={!!drawerOpen}
      onDrawerClose={() => onDrawerClose?.()}
      chips={[
        {
          label: 'Trục',
          icon: <AxisIcon />,
          pressed: showAxis,
          onToggle: onShowAxisChange,
          testId: 'toggle-axis',
        },
        {
          label: 'Lưới',
          icon: <GridIcon />,
          pressed: showGrid,
          onToggle: onShowGridChange,
          testId: 'toggle-grid',
        },
      ]}
      actions={[
        {
          label: 'Hoàn tác',
          title: 'Hoàn tác (Ctrl/Cmd+Z)',
          icon: <UndoIcon />,
          onClick: onUndo,
          disabled: !canUndo,
        },
        {
          label: 'Làm lại',
          title: 'Làm lại (Ctrl/Cmd+Shift+Z)',
          icon: <RedoIcon />,
          onClick: onRedo,
          disabled: !canRedo,
        },
      ]}
      groups={groups}
      activeTool={activeTool}
      onToolSelect={onToolChange}
      objectsTab={
        store
          ? {
              label: '📐 Đối tượng',
              render: () => (
                <ObjectListPanel store={store} selectedId={selectedObjectId} onSelect={onObjectSelect} />
              ),
            }
          : undefined
      }
    />
  );
}

// ---------- Public entry point ----------

export function LeftPanel(props: GeometryLeftPanelProps) {
  if (props.isMobile) {
    return <MobileGeometryPanel {...props} />;
  }
  return <DesktopGeometryPanel {...props} />;
}

// Alias for back-compat
export { LeftPanel as GeometryLeftPanel };
