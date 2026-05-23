'use client';

import React from 'react';

/**
 * Generic mobile tool drawer dùng chung cho geometry-2d + geometry-3d.
 *
 * Layout:
 *  - Header: icon + title + close
 *  - Sticky toolbar: chip switches (Trục/Lưới) + icon-actions (Reset, Undo)
 *  - Body: section dọc, mỗi section là 1 nhóm tools, grid 3-col card có nhãn
 *
 * Style: soft-modern, emerald accent, khớp các class trong shared/stamp.css.
 */

export interface MobileChip {
  /** Label hiển thị + aria-label */
  label: string;
  icon: React.ReactNode;
  pressed: boolean;
  onToggle: (next: boolean) => void;
  /** data-testid optional (để test cũ chạy được) */
  testId?: string;
}

export interface MobileActionButton {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  /** data-testid optional (cho phép test target button cụ thể) */
  testId?: string;
}

export interface MobileTool<TKey extends string> {
  key: TKey;
  label: string;
  icon: React.ReactNode;
}

export interface MobileToolGroup<TKey extends string, TGroup extends string> {
  group: TGroup;
  groupLabel: string;
  tools: MobileTool<TKey>[];
}

interface MobileToolDrawerProps<TKey extends string, TGroup extends string> {
  title: string;
  headerIcon: React.ReactNode;
  chips: MobileChip[];
  actions: MobileActionButton[];
  groups: MobileToolGroup<TKey, TGroup>[];
  activeTool: TKey;
  onToolSelect: (key: TKey) => void;
  drawerOpen: boolean;
  onDrawerClose: () => void;
  isDark?: boolean;
  /** data-testid trên <aside> — giữ để test cũ tìm được panel */
  testId?: string;
  /** Optional: thêm tab "Đối tượng" trong drawer body. */
  objectsTab?: {
    label: React.ReactNode;
    render: () => React.ReactNode;
  };
}

export function MobileToolDrawer<TKey extends string, TGroup extends string>({
  title,
  headerIcon,
  chips,
  actions,
  groups,
  activeTool,
  onToolSelect,
  drawerOpen,
  onDrawerClose,
  isDark,
  testId,
  objectsTab,
}: MobileToolDrawerProps<TKey, TGroup>) {
  const [mobileTab, setMobileTab] = React.useState<'tools' | 'objects'>('tools');
  const prevOpenRef = React.useRef(drawerOpen);
  React.useEffect(() => {
    if (!prevOpenRef.current && drawerOpen) setMobileTab('tools');
    prevOpenRef.current = drawerOpen;
  }, [drawerOpen]);

  return (
    <>
      {drawerOpen && (
        <div
          className="stamp-drawer-backdrop"
          onPointerDown={onDrawerClose}
          aria-hidden="true"
        />
      )}
      <aside
        role="complementary"
        aria-label={title}
        aria-hidden={!drawerOpen ? 'true' : undefined}
        data-testid={testId}
        data-stamp-area="true"
        data-mobile-drawer="true"
        data-geo-mobile="true"
        data-drawer-state={drawerOpen ? 'open' : 'closed'}
        className={[
          isDark ? 'theme--dark ' : '',
          'stamp-drawer-mobile flex flex-col border-r border-slate-200 bg-white shadow-md',
        ].join('')}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              {headerIcon}
            </span>
            {title}
          </h3>
          <button
            type="button"
            onClick={onDrawerClose}
            aria-label="Đóng ngăn công cụ"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        {/* Sticky toolbar: chips + actions */}
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              role="switch"
              aria-pressed={c.pressed}
              aria-label={c.label}
              data-testid={c.testId}
              onClick={() => c.onToggle(!c.pressed)}
              className="geo-mobile-chip"
            >
              {c.icon}
              {c.label}
            </button>
          ))}
          {actions.length > 0 && <div className="ml-auto flex items-center gap-1">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
                aria-label={a.label}
                title={a.title ?? a.label}
                data-testid={a.testId}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                {a.icon}
              </button>
            ))}
          </div>}
        </div>

        {/* Tab row (chỉ render khi objectsTab được cung cấp) */}
        {objectsTab && (
          <div role="tablist" className="flex gap-1 rounded-md bg-slate-100 p-0.5 mx-3 mt-2">
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === 'tools'}
              onClick={() => setMobileTab('tools')}
              className={[
                'flex-1 rounded px-2 py-1 text-[11px] font-medium transition',
                mobileTab === 'tools'
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-800',
              ].join(' ')}
            >
              🧰 Công cụ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === 'objects'}
              onClick={() => setMobileTab('objects')}
              className={[
                'flex-1 rounded px-2 py-1 text-[11px] font-medium transition',
                mobileTab === 'objects'
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-800',
              ].join(' ')}
            >
              {objectsTab.label}
            </button>
          </div>
        )}

        {/* Body: groups xếp dọc */}
        <div
          className="min-h-0 flex-1 overflow-y-auto"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          {objectsTab && mobileTab === 'objects' ? (
            <div className="px-3 pt-3">{objectsTab.render()}</div>
          ) : (
            groups.map((g) => (
              <section key={g.group} className="px-3 pt-3 pb-1">
                <h4 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  {g.groupLabel}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {g.tools.map((t) => {
                    const active = activeTool === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        aria-label={t.label}
                        aria-pressed={active}
                        data-tool={t.key}
                        onClick={() => {
                          onToolSelect(t.key);
                          onDrawerClose();
                        }}
                        className={[
                          'flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 transition active:scale-95',
                          active
                            ? 'geo-mobile-tool-active'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100',
                        ].join(' ')}
                      >
                        <span className="flex h-8 w-8 items-center justify-center">{t.icon}</span>
                        <span className="text-center text-[11px] font-medium leading-tight line-clamp-2">
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
