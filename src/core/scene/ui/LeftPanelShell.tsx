'use client';
import * as React from 'react';

export interface TabSpec<K extends string = string> {
  key: K;
  label: React.ReactNode;
  testId?: string;
}

export interface LeftPanelShellProps<K extends string = string> {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  isDark?: boolean;
  tabs?: readonly TabSpec<K>[];
  activeTab?: K;
  onTabChange?: (k: K) => void;
  children: React.ReactNode;
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function LeftPanelShell<K extends string>(props: LeftPanelShellProps<K>): React.ReactElement {
  const { title, icon, onClose, isDark, tabs, activeTab, onTabChange, children } = props;
  const showTabs = !!tabs && tabs.length >= 2;

  return (
    <aside
      role="complementary"
      aria-label={title}
      data-testid="left-panel"
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
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <CloseIcon />
        </button>
      </header>

      {showTabs && (
        <div role="tablist" className="flex gap-1 rounded-md bg-slate-100 p-0.5 mx-3 mt-3">
          {tabs!.map((t) => (
            <TabPill
              key={t.key}
              active={t.key === activeTab}
              onClick={() => onTabChange?.(t.key)}
              testId={t.testId}
            >
              {t.label}
            </TabPill>
          ))}
        </div>
      )}

      <div
        {...(showTabs ? { role: 'tabpanel' } : {})}
        className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3"
      >
        {children}
      </div>
    </aside>
  );
}

export function TabPill(props: {
  active: boolean;
  onClick: () => void;
  testId?: string;
  children: React.ReactNode;
}): React.ReactElement {
  const { active, onClick, testId, children } = props;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      data-testid={testId}
      className={[
        'flex-1 rounded px-2 py-1 text-[11px] font-medium transition',
        active
          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
          : 'text-slate-500 hover:text-slate-800',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function Section(props: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section>
      <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {props.label}
      </h4>
      {props.children}
    </section>
  );
}
