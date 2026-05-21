'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { TOOLS, GROUP_LABELS, type ToolDef } from '../MiniBoard';
import { GROUP_ORDER, letterForGroup } from '../tools';
import { ObjectListPanel } from '../../../../core/scene/ui/ObjectListPanel';
import { LeftPanelShell, Section } from '../../../../core/scene/ui/LeftPanelShell';
import { GeometryIconHeader, UndoIcon, RedoIcon } from './icons';
import { TOOLS_TABS, type GeometryLeftPanelProps } from './types';
import { useToolHoverTooltip } from './useToolHoverTooltip';

export function DesktopGeometryPanel(props: GeometryLeftPanelProps) {
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
