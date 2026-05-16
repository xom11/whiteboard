'use client';

import React from 'react';

// ---------- Shared shell (latex copy — geometry copy stays in src/stamp/StampLeftPanel.tsx) ----------

interface ShellProps {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  isMobile?: boolean;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}

function Shell({ title, icon, onClose, children, isMobile, drawerOpen, onDrawerClose }: ShellProps) {
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
        className={
          isMobile
            ? 'stamp-drawer-mobile flex flex-col border-r border-slate-200 bg-white shadow-md'
            : 'absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200'
        }
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span className="text-base leading-none">{icon}</span>
            {title}
          </h3>
          <button
            onClick={handleHeaderClose}
            aria-label={isMobile ? 'Đóng ngăn công cụ' : 'Đóng'}
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

// ---------- LaTeX left panel ----------

interface LatexLeftPanelProps {
  displayMode: boolean;
  onDisplayModeChange: (b: boolean) => void;
  onInsertSnippet: (snippet: string) => void;
  onClose: () => void;
  isMobile?: boolean;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
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

export function LeftPanel({
  displayMode,
  onDisplayModeChange,
  onInsertSnippet,
  onClose,
  isMobile,
  drawerOpen,
  onDrawerClose,
}: LatexLeftPanelProps) {
  return (
    <Shell
      title="Công thức LaTeX"
      icon="∑"
      onClose={onClose}
      isMobile={isMobile}
      drawerOpen={drawerOpen}
      onDrawerClose={onDrawerClose}
    >
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
                data-snippet={s.snippet}
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

// Back-compat alias
export { LeftPanel as LatexLeftPanel };
