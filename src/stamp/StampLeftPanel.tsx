'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TOOLS, GROUP_LABELS, type GeomTool, type ToolDef } from './JSXGraphMiniBoard';

const TOOLTIP_DELAY_MS = 400;
type HoverState = { label: string; hint?: string; x: number; y: number } | null;

// ---------- Shared shell ----------

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
      data-testid="stamp-left-panel"
      data-stamp-area="true"
      className={`${isDark ? 'theme--dark ' : ''}absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200`}
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
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
}

const GeometryIconHeader = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="4,20 20,20 12,5" />
    <circle cx="4" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="20" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export function GeometryLeftPanel({
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
    <Shell title="Hình học" icon={GeometryIconHeader} onClose={onClose} isDark={isDark}>
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
                  onClick={() => onToolChange(t.key)}
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

// ---------- LaTeX left panel ----------

interface LatexLeftPanelProps {
  displayMode: boolean;
  onDisplayModeChange: (b: boolean) => void;
  onInsertSnippet: (snippet: string) => void;
  onClose: () => void;
}

interface SnippetDef {
  label: string;
  preview: string;
  snippet: string;
}

const SNIPPETS: { group: string; items: SnippetDef[] }[] = [
  {
    group: 'Phân số & luỹ thừa',
    items: [
      { label: 'Phân số', preview: 'a⁄b', snippet: '\\frac{a}{b}' },
      { label: 'Luỹ thừa', preview: 'x²', snippet: '^{2}' },
      { label: 'Chỉ số', preview: 'x₁', snippet: '_{1}' },
      { label: 'Căn', preview: '√x', snippet: '\\sqrt{x}' },
      { label: 'Căn n', preview: 'ⁿ√x', snippet: '\\sqrt[n]{x}' },
    ],
  },
  {
    group: 'Tổng & tích phân',
    items: [
      { label: 'Tổng', preview: 'Σ', snippet: '\\sum_{i=1}^{n}' },
      { label: 'Tích', preview: 'Π', snippet: '\\prod_{i=1}^{n}' },
      { label: 'Tích phân', preview: '∫', snippet: '\\int_{a}^{b}' },
      { label: 'Giới hạn', preview: 'lim', snippet: '\\lim_{x \\to 0}' },
    ],
  },
  {
    group: 'Ký hiệu',
    items: [
      { label: 'α', preview: 'α', snippet: '\\alpha' },
      { label: 'β', preview: 'β', snippet: '\\beta' },
      { label: 'π', preview: 'π', snippet: '\\pi' },
      { label: 'θ', preview: 'θ', snippet: '\\theta' },
      { label: '≠', preview: '≠', snippet: '\\neq' },
      { label: '≤', preview: '≤', snippet: '\\leq' },
      { label: '≥', preview: '≥', snippet: '\\geq' },
      { label: '∞', preview: '∞', snippet: '\\infty' },
      { label: '→', preview: '→', snippet: '\\to' },
    ],
  },
];

export function LatexLeftPanel({
  displayMode,
  onDisplayModeChange,
  onInsertSnippet,
  onClose,
}: LatexLeftPanelProps) {
  return (
    <Shell title="Công thức LaTeX" icon="∑" onClose={onClose}>
      <Section label="Chế độ hiển thị">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onDisplayModeChange(false)}
            aria-pressed={!displayMode}
            className={[
              'rounded-md border px-2 py-1.5 text-xs transition',
              !displayMode
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
            ].join(' ')}
          >
            <span className="block font-medium">Inline</span>
            <span className="block text-[10px] text-slate-500">$ ... $</span>
          </button>
          <button
            type="button"
            onClick={() => onDisplayModeChange(true)}
            aria-pressed={displayMode}
            className={[
              'rounded-md border px-2 py-1.5 text-xs transition',
              displayMode
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
            ].join(' ')}
          >
            <span className="block font-medium">Block</span>
            <span className="block text-[10px] text-slate-500">$$ ... $$</span>
          </button>
        </div>
      </Section>

      {SNIPPETS.map((group) => (
        <Section key={group.group} label={group.group}>
          <div className="flex flex-wrap gap-1">
            {group.items.map((s) => (
              <button
                key={s.snippet}
                type="button"
                onClick={() => onInsertSnippet(s.snippet)}
                title={s.snippet}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {s.preview}
              </button>
            ))}
          </div>
        </Section>
      ))}

      <Section label="Phím tắt">
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono">Enter</kbd>
            chèn
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono">Esc</kbd>
            đóng
          </span>
        </div>
      </Section>
    </Shell>
  );
}
