'use client';
// src/stamps/shared/StampLeftPanel/ToolGrid.tsx
//
// Tool button grid chord-aware. Render từng group thành section, mỗi section
// có 4-col grid icon button. Khi chord.activeGroup set:
//   - section đó được highlight (ring emerald + bg)
//   - các section khác dimmed (opacity-55)
//   - mỗi button trong active group có number badge 1-9
//
// Port từ geometry-2d/editor/LeftPanel/Desktop.tsx:104-176 (baseline rich nhất).

import React, { useMemo } from 'react';
import type {
  StampLeftPanelChordProps,
  StampToolDef,
} from './types';
import { useToolHoverTooltip } from './useToolHoverTooltip';
import { createPortal } from 'react-dom';

export interface ToolGridProps<TKey extends string, TGroup extends string> {
  tools: ReadonlyArray<StampToolDef<TKey, TGroup>>;
  groupOrder: ReadonlyArray<TGroup>;
  groupLabels: Record<TGroup, string>;
  activeTool: TKey;
  onToolChange: (k: TKey) => void;
  chord?: StampLeftPanelChordProps<TGroup>;
}

export function ToolGrid<TKey extends string, TGroup extends string>(
  props: ToolGridProps<TKey, TGroup>,
): React.ReactElement {
  const { tools, groupOrder, groupLabels, activeTool, onToolChange, chord } = props;
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip();

  const grouped = useMemo(() => {
    const acc: Partial<Record<TGroup, StampToolDef<TKey, TGroup>[]>> = {};
    for (const t of tools) {
      (acc[t.group] ??= []).push(t);
    }
    return acc;
  }, [tools]);

  const groupKeys = useMemo(
    () => groupOrder.filter((g) => grouped[g]),
    [grouped, groupOrder],
  );

  const activeGroupTools = chord?.activeGroup ? grouped[chord.activeGroup] ?? null : null;

  return (
    <>
      {groupKeys.map((group) => {
        const isChordActive = chord?.activeGroup === group;
        const dimmed = chord?.activeGroup != null && !isChordActive;
        return (
          <section
            key={group}
            data-chord-group={group}
            data-chord-active={isChordActive ? 'true' : 'false'}
            className={[
              'rounded-md transition',
              isChordActive ? 'bg-emerald-50 ring-1 ring-emerald-400 p-1' : 'p-0',
              dimmed ? 'opacity-55' : 'opacity-100',
            ].join(' ')}
          >
            <h4 className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span>{groupLabels[group]}</span>
              {chord && (
                <span
                  data-testid={`chord-letter-${group}`}
                  className={[
                    'font-mono text-[10px] leading-none transition',
                    isChordActive ? 'text-emerald-700 font-bold' : 'text-slate-400',
                  ].join(' ')}
                >
                  {chord.letterForGroup(group)}
                </span>
              )}
            </h4>
            <div className="grid grid-cols-4 gap-1">
              {grouped[group]!.map((t, i) => {
                const active = activeTool === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    aria-label={t.label}
                    aria-pressed={active}
                    data-tool={t.key}
                    title={t.label + (t.shortcut ? ` (${t.shortcut})` : '')}
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
                    {chord && (
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
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {chord?.activeGroup && activeGroupTools && (
        <div
          data-testid="chord-hint"
          className="mt-1 rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-[11px] leading-snug text-slate-600"
        >
          <span className="font-mono font-semibold text-emerald-700">
            {chord.letterForGroup(chord.activeGroup)}
          </span>
          <span className="mx-1 text-slate-400">→</span>
          {activeGroupTools.map((t, i) => (
            <span key={t.key} className="mr-2 inline-block">
              <span className="font-mono font-semibold text-emerald-700">{i + 1}</span>
              <span className="ml-1">{t.label}</span>
            </span>
          ))}
          <span className="text-slate-400">Esc huỷ</span>
        </div>
      )}

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
