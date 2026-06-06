'use client';
// src/stamps/shared/StampLeftPanel/ToolGrid.tsx
//
// Tool button grid với:
//   - Search input ở đầu (filter theo label/hint, ignore diacritics + case).
//   - Group section render 4-col icon button.
//   - Khi chord.activeGroup set: section đó highlight (ring emerald + bg),
//     section khác dimmed. KHÔNG render letter / number badge / hint footer
//     nữa (đã bỏ phím tắt visual ở v0.27).

import React, { useMemo, useState } from 'react';
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

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

function SearchIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.5" y2="16.5" />
    </svg>
  );
}

function ClearIcon(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

function ToolResultList<TKey extends string, TGroup extends string>(props: {
  tools: ReadonlyArray<StampToolDef<TKey, TGroup>>;
  activeTool: TKey;
  onToolChange: (k: TKey) => void;
}): React.ReactElement {
  const { tools, activeTool, onToolChange } = props;
  return (
    <div className="flex flex-col gap-0.5" data-testid="tool-result-list">
      {tools.map((t) => {
        const active = activeTool === t.key;
        return (
          <button
            key={t.key}
            type="button"
            data-tool={t.key}
            aria-label={t.label}
            aria-pressed={active}
            onClick={() => onToolChange(t.key)}
            className={[
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition',
              active ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100',
            ].join(' ')}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">{t.icon}</span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-medium leading-tight">{t.label}</span>
              {t.hint && (
                <span className={['block truncate text-[10px] leading-tight', active ? 'text-emerald-50' : 'text-slate-400'].join(' ')}>
                  {t.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ToolGrid<TKey extends string, TGroup extends string>(
  props: ToolGridProps<TKey, TGroup>,
): React.ReactElement {
  const { tools, groupOrder, groupLabels, activeTool, onToolChange, chord } = props;
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip();

  const [query, setQuery] = useState('');
  const normalizedQuery = useMemo(() => normalize(query.trim()), [query]);

  const filteredTools = useMemo(() => {
    if (!normalizedQuery) return tools;
    return tools.filter((t) => {
      if (normalize(t.label).includes(normalizedQuery)) return true;
      if (t.hint && normalize(t.hint).includes(normalizedQuery)) return true;
      return false;
    });
  }, [tools, normalizedQuery]);

  const grouped = useMemo(() => {
    const acc: Partial<Record<TGroup, StampToolDef<TKey, TGroup>[]>> = {};
    for (const t of filteredTools) {
      (acc[t.group] ??= []).push(t);
    }
    return acc;
  }, [filteredTools]);

  const groupKeys = useMemo(
    () => groupOrder.filter((g) => grouped[g] && grouped[g]!.length > 0),
    [grouped, groupOrder],
  );

  const noMatch = normalizedQuery !== '' && groupKeys.length === 0;

  return (
    <>
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm công cụ…"
          aria-label="Tìm công cụ"
          data-testid="tool-search-input"
          className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-7 text-[12px] text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-300"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Xoá tìm kiếm"
            data-testid="tool-search-clear"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {noMatch && (
        <div
          data-testid="tool-search-empty"
          className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-500"
        >
          Không có công cụ nào khớp “{query.trim()}”.
        </div>
      )}

      {normalizedQuery !== '' && !noMatch ? (
        <ToolResultList tools={filteredTools} activeTool={activeTool} onToolChange={onToolChange} />
      ) : (
        groupKeys.map((group) => {
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
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {groupLabels[group]}
            </h4>
            <div className="grid grid-cols-4 gap-1">
              {grouped[group]!.map((t) => {
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
                      'relative flex h-10 items-center justify-center rounded-md transition',
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
          </section>
        );
        })
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
