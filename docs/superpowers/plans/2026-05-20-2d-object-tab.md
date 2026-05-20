# Geometry 2D — tab "Đối tượng" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa `ObjectListPanel` vào LeftPanel 2D dưới dạng tab "📐 Đối tượng" (mirror 3D), trích Shell + TabPill + Section thành shared `LeftPanelShell` ở `src/core/scene/ui/`. Mở rộng `MobileToolDrawer` thêm tab Đối tượng cho cả 2D và 3D mobile.

**Architecture:** TDD, 5 phase tuần tự. Phase 1 tạo shared component đứng độc lập. Phase 2 refactor 3D consume shared (no UX change → snapshot tests catch regression). Phase 3 mở rộng MobileToolDrawer. Phase 4 rewrite 2D LeftPanel + lift store từ MiniBoard lên Host qua callback mới. Phase 5 integration test.

**Tech Stack:** React 18, TypeScript strict, Jest + jsdom + ts-jest, Tailwind, JSXGraph 1.x, scene store (custom redux-like).

**Spec:** `docs/superpowers/specs/2026-05-20-2d-object-tab-design.md`.

---

## Phase 1 — Shared LeftPanelShell

### Task 1: Create `LeftPanelShell` component

**Files:**
- Create: `src/core/scene/ui/LeftPanelShell.tsx`
- Create: `src/core/scene/ui/__tests__/LeftPanelShell.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/core/scene/ui/__tests__/LeftPanelShell.test.tsx`:

```tsx
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftPanelShell, TabPill, Section } from '../LeftPanelShell';

describe('LeftPanelShell', () => {
  const icon = <span data-testid="hdr-icon">★</span>;

  test('renders title + close button', () => {
    const onClose = jest.fn();
    render(
      <LeftPanelShell title="Hình học" icon={icon} onClose={onClose}>
        <div>body</div>
      </LeftPanelShell>,
    );
    expect(screen.getByText('Hình học')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /đóng/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not render tablist when tabs prop missing or length<2', () => {
    const { rerender } = render(
      <LeftPanelShell title="t" icon={icon} onClose={() => {}}>
        body
      </LeftPanelShell>,
    );
    expect(screen.queryByRole('tablist')).toBeNull();

    rerender(
      <LeftPanelShell
        title="t"
        icon={icon}
        onClose={() => {}}
        tabs={[{ key: 'a', label: 'A' }]}
        activeTab="a"
        onTabChange={() => {}}
      >
        body
      </LeftPanelShell>,
    );
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  test('renders tablist + tabs with aria-selected when 2+ tabs', () => {
    const onTabChange = jest.fn();
    render(
      <LeftPanelShell
        title="t"
        icon={icon}
        onClose={() => {}}
        tabs={[
          { key: 'tools', label: '🧰 Công cụ', testId: 'tab-tools' },
          { key: 'objects', label: '📐 Đối tượng', testId: 'tab-objects' },
        ]}
        activeTab="tools"
        onTabChange={onTabChange}
      >
        <div data-testid="body">tools body</div>
      </LeftPanelShell>,
    );
    const list = screen.getByRole('tablist');
    expect(list).toBeInTheDocument();
    const toolsTab = screen.getByTestId('tab-tools');
    const objectsTab = screen.getByTestId('tab-objects');
    expect(toolsTab).toHaveAttribute('aria-selected', 'true');
    expect(objectsTab).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(objectsTab);
    expect(onTabChange).toHaveBeenCalledWith('objects');
  });

  test('body has role tabpanel when tabs present', () => {
    render(
      <LeftPanelShell
        title="t"
        icon={icon}
        onClose={() => {}}
        tabs={[
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ]}
        activeTab="a"
        onTabChange={() => {}}
      >
        body
      </LeftPanelShell>,
    );
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });
});

describe('TabPill', () => {
  test('renders with aria-selected mirroring active', () => {
    render(<TabPill active={true} onClick={() => {}}>x</TabPill>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Section', () => {
  test('renders label uppercase + children', () => {
    render(<Section label="Bố cục"><div data-testid="kid">k</div></Section>);
    expect(screen.getByText('Bố cục')).toBeInTheDocument();
    expect(screen.getByTestId('kid')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/core/scene/ui/__tests__/LeftPanelShell.test.tsx`
Expected: FAIL — `Cannot find module '../LeftPanelShell'`.

- [ ] **Step 3: Implement `LeftPanelShell.tsx`**

Create `src/core/scene/ui/LeftPanelShell.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/core/scene/ui/__tests__/LeftPanelShell.test.tsx`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/core/scene/ui/LeftPanelShell.tsx src/core/scene/ui/__tests__/LeftPanelShell.test.tsx
git commit -m "feat(scene/ui): thêm LeftPanelShell shared (Shell + TabPill + Section)"
```

---

## Phase 2 — Refactor 3D LeftPanel sang dùng shell

### Task 2: 3D LeftPanel consume `LeftPanelShell`

**Files:**
- Modify: `src/stamps/geometry-3d/editor/LeftPanel.tsx`

Mục tiêu: 3D dùng shell mới, không đổi UX. Snapshot/integration test 3D phải pass.

- [ ] **Step 1: Identify existing 3D tests**

Run: `find src/stamps/geometry-3d -name '*LeftPanel*' -type f`
Note danh sách test file để kiểm tra sau refactor.

- [ ] **Step 2: Rewrite `geometry-3d/editor/LeftPanel.tsx`**

Đổi file `src/stamps/geometry-3d/editor/LeftPanel.tsx` — xóa định nghĩa `Shell`, `TabPill`, `Section` local; import từ shell:

```tsx
// Bỏ:
// function Shell(...) { ... }
// function Section(...) { ... }
// function TabPill(...) { ... }

// Thêm import phía trên:
import {
  LeftPanelShell,
  TabPill,    // chỉ cần re-export nếu file khác dùng — nếu không, có thể không import
  Section,
} from '../../../core/scene/ui/LeftPanelShell';
```

Sửa `DesktopPanel`:

```tsx
function DesktopPanel(props: LeftPanelProps) {
  const {
    store,
    selectedTool,
    onSelectTool,
    showAxis,
    showGrid,
    onShowAxisChange,
    onShowGridChange,
    onUndo,
    canUndo,
    onRedo,
    canRedo,
    onClose,
    isDark,
    chordGroup,
    selectedObjectId,
    onObjectSelect,
  } = props;
  const [tab, setTab] = React.useState<'tools' | 'algebra'>('tools');
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip();

  return (
    <>
      <LeftPanelShell
        title="Hình học 3D"
        icon={Geom3DIconHeader}
        onClose={onClose}
        isDark={isDark}
        tabs={[
          { key: 'tools', label: '🧰 Công cụ', testId: 'tab-tools' },
          { key: 'algebra', label: '📐 Đối tượng', testId: 'tab-algebra' },
        ] as const}
        activeTab={tab}
        onTabChange={setTab}
      >
        {tab === 'tools' ? (
          <>
            <Section label="Góc nhìn">
              {/* … toàn bộ block axis/grid + undo/redo + tool palette giữ nguyên … */}
            </Section>
            <ToolPalette
              selected={selectedTool}
              onSelect={onSelectTool}
              chordGroup={chordGroup ?? null}
              onHoverTool={(info) => (info ? showHover(info) : hideHover())}
            />
            {chordGroup && (
              <div
                data-testid="chord-hint"
                className="rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-[11px] leading-snug text-slate-600"
              >
                <span className="font-mono font-semibold text-emerald-700">
                  {letterForGroup(chordGroup)}
                </span>
                <span className="ml-1.5">
                  → {GROUP_LABELS[chordGroup]}. Bấm số 1-9 để chọn công cụ, Esc huỷ.
                </span>
              </div>
            )}
          </>
        ) : (
          <section data-testid="algebra-panel">
            <ObjectListPanel
              store={store}
              selectedId={selectedObjectId}
              onSelect={onObjectSelect}
            />
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
```

Lưu ý:
- Giữ nguyên copy text "🧰 Công cụ" + "📐 Đối tượng" — chỉ dời label vào `tabs` prop.
- Xóa export `TabPill` local nếu file khác không import. Nếu có (grep), giữ re-export: `export { TabPill } from '../../../core/scene/ui/LeftPanelShell';`.

- [ ] **Step 3: Verify TabPill external usage**

Run: `grep -rn "from.*editor/LeftPanel'" src/ --include='*.ts' --include='*.tsx' | grep -i TabPill`
Nếu không có kết quả → bỏ TabPill local, không cần re-export.
Nếu có → thêm dòng `export { TabPill } from '...LeftPanelShell';` ở cuối file.

- [ ] **Step 4: Run 3D tests**

Run: `npx jest src/stamps/geometry-3d` 
Expected: PASS. Nếu fail snapshot và visual không đổi → update snapshot bằng `npx jest src/stamps/geometry-3d -u`, review diff trước khi commit.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/stamps/geometry-3d/editor/LeftPanel.tsx
git commit -m "refactor(geometry-3d): LeftPanel dùng LeftPanelShell shared"
```

---

## Phase 3 — Mở rộng MobileToolDrawer

### Task 3: Add `objectsTab` prop to `MobileToolDrawer`

**Files:**
- Modify: `src/stamps/shared/MobileToolDrawer.tsx`
- Create: `src/stamps/shared/__tests__/MobileToolDrawer.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/stamps/shared/__tests__/MobileToolDrawer.test.tsx`:

```tsx
import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MobileToolDrawer } from '../MobileToolDrawer';

const baseProps = {
  title: 'Hình học',
  headerIcon: <span>★</span>,
  chips: [],
  actions: [],
  groups: [
    {
      group: 'g1',
      groupLabel: 'Cơ bản',
      tools: [{ key: 'move', label: 'Move', icon: <span>M</span> }],
    },
  ],
  activeTool: 'move',
  onToolSelect: jest.fn(),
  onDrawerClose: jest.fn(),
};

describe('MobileToolDrawer', () => {
  test('without objectsTab: no tab row, tools render directly', () => {
    render(<MobileToolDrawer {...baseProps} drawerOpen={true} />);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('Cơ bản')).toBeInTheDocument();
  });

  test('with objectsTab: tab row appears, default active=tools', () => {
    render(
      <MobileToolDrawer
        {...baseProps}
        drawerOpen={true}
        objectsTab={{
          label: '📐 Đối tượng',
          render: () => <div data-testid="objects-body">obj</div>,
        }}
      />,
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByText('Cơ bản')).toBeInTheDocument();
    expect(screen.queryByTestId('objects-body')).toBeNull();
  });

  test('clicking objects tab switches body', () => {
    render(
      <MobileToolDrawer
        {...baseProps}
        drawerOpen={true}
        objectsTab={{
          label: '📐 Đối tượng',
          render: () => <div data-testid="objects-body">obj</div>,
        }}
      />,
    );
    fireEvent.click(screen.getByText('📐 Đối tượng'));
    expect(screen.getByTestId('objects-body')).toBeInTheDocument();
    expect(screen.queryByText('Cơ bản')).toBeNull();
  });

  test('reopen drawer resets tab to tools', () => {
    const { rerender } = render(
      <MobileToolDrawer
        {...baseProps}
        drawerOpen={true}
        objectsTab={{
          label: '📐 Đối tượng',
          render: () => <div data-testid="objects-body">obj</div>,
        }}
      />,
    );
    fireEvent.click(screen.getByText('📐 Đối tượng'));
    expect(screen.getByTestId('objects-body')).toBeInTheDocument();

    rerender(
      <MobileToolDrawer
        {...baseProps}
        drawerOpen={false}
        objectsTab={{
          label: '📐 Đối tượng',
          render: () => <div data-testid="objects-body">obj</div>,
        }}
      />,
    );
    rerender(
      <MobileToolDrawer
        {...baseProps}
        drawerOpen={true}
        objectsTab={{
          label: '📐 Đối tượng',
          render: () => <div data-testid="objects-body">obj</div>,
        }}
      />,
    );
    expect(screen.getByText('Cơ bản')).toBeInTheDocument();
    expect(screen.queryByTestId('objects-body')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify failures**

Run: `npx jest src/stamps/shared/__tests__/MobileToolDrawer.test.tsx`
Expected: FAIL — `objectsTab` prop unknown; tablist/objects-body queries không tìm thấy ở test 2-4.

- [ ] **Step 3: Implement `objectsTab` in `MobileToolDrawer.tsx`**

Modify `src/stamps/shared/MobileToolDrawer.tsx`:

1. Update props interface (thêm vào `MobileToolDrawerProps`):

```ts
interface MobileToolDrawerProps<TKey extends string, TGroup extends string> {
  // ... existing fields ...
  /** Optional: thêm tab "Đối tượng" trong drawer body. */
  objectsTab?: {
    label: React.ReactNode;
    render: () => React.ReactNode;
  };
}
```

2. Trong component body, thêm state + reset effect:

```tsx
const [mobileTab, setMobileTab] = React.useState<'tools' | 'objects'>('tools');

// Reset to tools each time drawer (re)opens.
const prevOpenRef = React.useRef(drawerOpen);
React.useEffect(() => {
  if (!prevOpenRef.current && drawerOpen) {
    setMobileTab('tools');
  }
  prevOpenRef.current = drawerOpen;
}, [drawerOpen]);
```

3. Trong body JSX, ngay TRƯỚC khối `{/* Body: groups xếp dọc */}`, thêm tab row khi `objectsTab` truyền:

```tsx
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
```

4. Wrap body group rendering:

```tsx
<div
  className="min-h-0 flex-1 overflow-y-auto"
  style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
>
  {objectsTab && mobileTab === 'objects' ? (
    <div className="px-3 pt-3">{objectsTab.render()}</div>
  ) : (
    groups.map((g) => (
      <section key={g.group} className="px-3 pt-3 pb-1">
        {/* ... existing group rendering, KHÔNG ĐỔI ... */}
      </section>
    ))
  )}
</div>
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/stamps/shared/__tests__/MobileToolDrawer.test.tsx`
Expected: PASS — tất cả 4 tests.

Run: `npx jest src/stamps/shared` để verify không vỡ test cũ khác.
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/stamps/shared/MobileToolDrawer.tsx src/stamps/shared/__tests__/MobileToolDrawer.test.tsx
git commit -m "feat(shared): MobileToolDrawer hỗ trợ tab Đối tượng (opt-in)"
```

---

### Task 4: 3D mobile drawer pass `objectsTab`

**Files:**
- Modify: `src/stamps/geometry-3d/editor/LeftPanel.tsx` (block `MobilePanel`)

- [ ] **Step 1: Locate MobilePanel in 3D LeftPanel**

Run: `grep -n 'MobilePanel\\|MobileToolDrawer' src/stamps/geometry-3d/editor/LeftPanel.tsx`
Note dòng `<MobileToolDrawer …>` call.

- [ ] **Step 2: Add `objectsTab` to MobilePanel render**

Trong `MobilePanel`, sau khi destructure props, đảm bảo `store`, `selectedObjectId`, `onObjectSelect` được lấy (đã có sẵn trong `LeftPanelProps`). Thêm prop khi gọi `<MobileToolDrawer>`:

```tsx
return (
  <MobileToolDrawer
    title="Hình học 3D"
    headerIcon={Geom3DIconHeader}
    testId="left-panel"
    isDark={isDark}
    drawerOpen={!!drawerOpen}
    onDrawerClose={() => onDrawerClose?.()}
    chips={[ /* … existing … */ ]}
    actions={[ /* … existing … */ ]}
    groups={groups}
    activeTool={selectedTool}
    onToolSelect={onSelectTool}
    objectsTab={{
      label: '📐 Đối tượng',
      render: () => (
        <ObjectListPanel
          store={store}
          selectedId={selectedObjectId}
          onSelect={onObjectSelect}
        />
      ),
    }}
  />
);
```

Import `ObjectListPanel` (đã import sẵn trong file — verify).

- [ ] **Step 3: Verify**

Run: `npx jest src/stamps/geometry-3d`
Expected: PASS.

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-3d/editor/LeftPanel.tsx
git commit -m "feat(geometry-3d): mobile drawer thêm tab Đối tượng"
```

---

## Phase 4 — 2D adopt tab + lift store

### Task 5: Extend `GeometryEditorPanel` API — lift store + selection

**Files:**
- Modify: `src/stamps/geometry-2d/editor/EditorPanel.tsx`

Mục tiêu:
1. Bỏ cột phải `w-56` chứa ObjectListPanel.
2. Bỏ state `selectedId` local (chuyển lên Host).
3. Bỏ ref `sceneStoreRef` (không còn cần local).
4. Thêm prop callback `onStoreReady?: (store: Store) => void` — gọi trong `handleReady`.
5. Thêm prop callback `onSelectionChange?: (id: string | undefined) => void` — gọi trong `handleSelectObject`.
6. Thêm imperative `selectObject(id: string)` — set selection từ Host xuống (gọi `highlight`).

- [ ] **Step 1: Read current file to map exact lines**

Run: `wc -l src/stamps/geometry-2d/editor/EditorPanel.tsx`
Open file để hiểu cấu trúc Props/Handle/state.

- [ ] **Step 2: Update Props interface (top of file)**

Trong interface `Props`, sau dòng `onStateChange?: (state: GeomBoardState) => void;`, thêm:

```ts
  /** Báo lên Host khi scene store sẵn sàng (sau MiniBoard.onReady). */
  onStoreReady?: (store: Store) => void;
  /** Báo lên Host khi user click một object trong list (qua highlight). */
  onSelectionChange?: (id: string | undefined) => void;
```

- [ ] **Step 3: Update `GeometryEditorPanelHandle` to expose `selectObject`**

Tìm `export interface GeometryEditorPanelHandle` ở đầu file. Thêm method:

```ts
export interface GeometryEditorPanelHandle {
  setTool: (t: GeomTool) => void;
  setShowAxis: (b: boolean) => void;
  setShowGrid: (b: boolean) => void;
  undo: () => void;
  redo: () => void;
  insert: () => boolean;
  hasContent: () => boolean;
  /** Highlight object id trên MiniBoard. id=null để bỏ highlight. */
  selectObject: (id: string | null) => void;
}
```

- [ ] **Step 4: Update component body**

Trong function `GeometryEditorPanel`:

a. **Destructure props mới**:

```ts
function GeometryEditorPanel(
  {
    initialState,
    onInsert,
    onClose,
    withLeftPanel = false,
    onStateChange,
    onStoreReady,
    onSelectionChange,
    isDark,
    isMobile = false,
    onOpenDrawer,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
  },
  ref,
) {
```

b. **Xóa state local + ref**:

```diff
- const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
- const sceneStoreRef = useRef<Store | null>(null);
```

c. **Thêm ref cho callback (stable closure)**:

```ts
const onStoreReadyRef = useRef(onStoreReady);
const onSelectionChangeRef = useRef(onSelectionChange);
useEffect(() => { onStoreReadyRef.current = onStoreReady; }, [onStoreReady]);
useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);
```

d. **Update `handleReady` để emit store**:

```ts
const handleReady = useCallback((h: MiniBoardHandle) => {
  handleRef.current = h;
-  sceneStoreRef.current = h.getStore();
+  onStoreReadyRef.current?.(h.getStore());
  // ... phần còn lại giữ nguyên (emit state change v.v.)
}, []);
```

e. **Update `handleSelectObject`**:

```ts
function handleSelectObject(id: string) {
-  setSelectedId(id);
-  handleRef.current?.highlight(id);
+  handleRef.current?.highlight(id);
+  onSelectionChangeRef.current?.(id);
}
```

f. **Update `useImperativeHandle` — thêm `selectObject`**:

```ts
useImperativeHandle(ref, () => ({
  setTool: (t) => handleRef.current?.setTool(t),
  setShowAxis: (b) => handleRef.current?.setShowAxis(b),
  setShowGrid: (b) => handleRef.current?.setShowGrid(b),
  undo: () => handleRef.current?.undo(),
  redo: () => handleRef.current?.redo(),
  insert: performInsert,
  hasContent: () => Object.keys(handleRef.current?.getState().objects ?? {}).length > 0,
  selectObject: (id) => handleRef.current?.highlight(id),
}), [performInsert]);
```

g. **Xóa khối ObjectListPanel cột phải** (dòng 237-245 hiện tại):

```diff
  <div className="flex-1">
    <JSXGraphMiniBoard
      onReady={handleReady}
      initialState={initialState}
      isDark={isDark}
    />
  </div>
- {sceneStoreRef.current && (
-   <div className="w-56 border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto">
-     <ObjectListPanel
-       store={sceneStoreRef.current}
-       selectedId={selectedId}
-       onSelect={handleSelectObject}
-     />
-   </div>
- )}
```

`handleSelectObject` vẫn cần khi MiniBoard tự trigger select (nếu có) — giữ lại. Nếu không có ref nào còn dùng `handleSelectObject` ngoài chỗ vừa xóa, **xóa luôn function này**.

h. **Xóa import không dùng**:

```diff
- import { ObjectListPanel } from '../../../core/scene/ui/ObjectListPanel';
```

`Store` type vẫn giữ vì callback signature dùng.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors. Nếu file khác (test) import `selectedId`/`sceneStoreRef`, fix theo signal lỗi.

- [ ] **Step 6: Run 2D tests (sẽ fail tạm ở Host nếu chưa update)**

Run: `npx jest src/stamps/geometry-2d/__tests__/EditorPanel.test.tsx`
Expected: PASS (EditorPanel test không liên quan ObjectListPanel cột phải).

- [ ] **Step 7: Commit**

```bash
git add src/stamps/geometry-2d/editor/EditorPanel.tsx
git commit -m "refactor(geometry-2d): EditorPanel lift store+selection lên Host"
```

---

### Task 6: Rewrite 2D LeftPanel — use shell + tabs

**Files:**
- Modify: `src/stamps/geometry-2d/editor/LeftPanel.tsx`

- [ ] **Step 1: Update `GeometryLeftPanelProps`**

Thêm props mới (sau `chordGroup?: GeomGroup | null;`):

```ts
  /** Scene store — bật tab "Đối tượng" khi truyền. */
  store?: Store;
  selectedObjectId?: string;
  onObjectSelect?: (id: string) => void;
```

Import:
```ts
import type { Store } from '../../../core/scene/store';
import { ObjectListPanel } from '../../../core/scene/ui/ObjectListPanel';
import { LeftPanelShell, Section } from '../../../core/scene/ui/LeftPanelShell';
```

- [ ] **Step 2: Rewrite `DesktopGeometryPanel`**

Xóa định nghĩa `Shell` cục bộ. Đổi sang dùng `LeftPanelShell`:

```tsx
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

  // Bỏ về tab tools nếu store mất (defensive)
  useEffect(() => { if (!hasStore && tab === 'objects') setTab('tools'); }, [hasStore, tab]);

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
  const activeGroupTools: ToolDef[] | null = chordGroup ? (grouped[chordGroup] ?? null) : null;
  const { hover, portalReady, showHover, hideHover } = useToolHoverTooltip();

  return (
    <>
      <LeftPanelShell
        title="Hình học"
        icon={GeometryIconHeader}
        onClose={onClose}
        isDark={isDark}
        tabs={hasStore ? ([
          { key: 'tools', label: '🧰 Công cụ', testId: 'tab-tools' },
          { key: 'objects', label: '📐 Đối tượng', testId: 'tab-objects' },
        ] as const) : undefined}
        activeTab={hasStore ? tab : undefined}
        onTabChange={hasStore ? setTab : undefined}
      >
        {(!hasStore || tab === 'tools') ? (
          <>
            <Section label="Bố cục">
              {/* … toàn bộ block axis/grid + undo/redo giữ nguyên markup hiện có … */}
            </Section>

            {/* … toàn bộ block tool palette + chord hint giữ nguyên markup hiện có … */}
          </>
        ) : (
          <section data-testid="objects-panel">
            <ObjectListPanel
              store={store!}
              selectedId={selectedObjectId}
              onSelect={onObjectSelect}
            />
          </section>
        )}
      </LeftPanelShell>

      {/* Tooltip portal — giữ nguyên */}
      {portalReady && hover && typeof document !== 'undefined'
        ? createPortal(/* … */, document.body)
        : null}
    </>
  );
}
```

> Quan trọng: copy nguyên xi block "Bố cục" + "tool palette + chord hint" từ file hiện tại sang. Không refactor markup nội bộ trong cùng task này.

- [ ] **Step 3: Rewrite `MobileGeometryPanel`**

Tương tự, pass `objectsTab` cho `MobileToolDrawer`:

```tsx
function MobileGeometryPanel(props: GeometryLeftPanelProps) {
  const {
    // … existing destructure …
    store, selectedObjectId, onObjectSelect,
  } = props;

  const groups = useMemo<MobileToolGroup<GeomTool, ToolDef['group']>[]>(/* … existing … */, []);

  return (
    <MobileToolDrawer
      title="Hình học"
      headerIcon={GeometryIconHeader}
      testId="stamp-left-panel"
      isDark={isDark}
      drawerOpen={!!drawerOpen}
      onDrawerClose={() => onDrawerClose?.()}
      chips={[ /* existing */ ]}
      actions={[ /* existing */ ]}
      groups={groups}
      activeTool={activeTool}
      onToolSelect={onToolChange}
      objectsTab={
        store
          ? {
              label: '📐 Đối tượng',
              render: () => (
                <ObjectListPanel
                  store={store}
                  selectedId={selectedObjectId}
                  onSelect={onObjectSelect}
                />
              ),
            }
          : undefined
      }
    />
  );
}
```

- [ ] **Step 4: Verify existing tests**

Run: `npx jest src/stamps/geometry-2d/__tests__/LeftPanel.chord.test.tsx`
Expected: PASS. Test này focus chord behaviour, không đụng tab.

Run: `npx jest src/stamps/geometry-2d`
Expected: PASS (trừ Host wire chưa xong — test Host có thể fail tạm).

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/stamps/geometry-2d/editor/LeftPanel.tsx
git commit -m "feat(geometry-2d): LeftPanel có tab Công cụ/Đối tượng (mirror 3D)"
```

---

### Task 7: Wire Host

**Files:**
- Modify: `src/stamps/geometry-2d/host.tsx`

- [ ] **Step 1: Add state for store + selection**

Sau dòng `const [drawerOpen, setDrawerOpen] = useState(false);` (line ~42), thêm:

```ts
const [sceneStore, setSceneStore] = useState<Store | null>(null);
const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>(undefined);
```

Import:
```ts
import type { Store } from '../../core/scene/store';
```

- [ ] **Step 2: Pass props xuống LeftPanel**

Trong `<GeometryLeftPanel … />`, thêm 3 prop:

```tsx
<GeometryLeftPanel
  // … existing props …
  store={sceneStore ?? undefined}
  selectedObjectId={selectedObjectId}
  onObjectSelect={(id) => {
    setSelectedObjectId(id);
    panelRef.current?.selectObject(id);
  }}
/>
```

- [ ] **Step 3: Pass callbacks xuống EditorPanel**

Trong `<GeometryEditorPanel … />`, thêm:

```tsx
<GeometryEditorPanel
  // … existing props …
  onStoreReady={setSceneStore}
  onSelectionChange={setSelectedObjectId}
/>
```

- [ ] **Step 4: Verify all 2D tests**

Run: `npx jest src/stamps/geometry-2d`
Expected: PASS.

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/host.tsx
git commit -m "feat(geometry-2d): Host wire store/selection cho tab Đối tượng"
```

---

## Phase 5 — Integration test + smoke

### Task 8: Integration test 2D LeftPanel với store

**Files:**
- Create: `src/stamps/geometry-2d/editor/__tests__/LeftPanel.objectTab.test.tsx`

- [ ] **Step 1: Write integration test**

Create `src/stamps/geometry-2d/editor/__tests__/LeftPanel.objectTab.test.tsx`:

```tsx
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GeometryLeftPanel } from '../LeftPanel';
import { createStore } from '../../../../core/scene/store';
import { createEmptyState } from '../../../../core/scene/types';

function makeStoreWithPoint(label: string) {
  const store = createStore(createEmptyState('2d'));
  store.dispatch({
    type: 'ADD',
    payload: {
      object: {
        id: 'p1',
        kind: 'point',
        label,
        visible: true,
        locked: false,
        deps: [],
        attrs: {},
        data: { x: 0, y: 0 },
      },
    },
  });
  return store;
}

describe('GeometryLeftPanel - Object tab', () => {
  const baseProps = {
    activeTool: 'move' as const,
    onToolChange: () => {},
    showAxis: false,
    showGrid: false,
    onShowAxisChange: () => {},
    onShowGridChange: () => {},
    onUndo: () => {},
    canUndo: false,
    onRedo: () => {},
    canRedo: false,
    onClose: () => {},
  };

  test('no store: tab row hidden, only tools visible', () => {
    render(<GeometryLeftPanel {...baseProps} />);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('Bố cục')).toBeInTheDocument();
  });

  test('with store: tab row visible, default active=tools', () => {
    const store = makeStoreWithPoint('A');
    render(<GeometryLeftPanel {...baseProps} store={store} />);
    expect(screen.getByTestId('tab-tools')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-objects')).toHaveAttribute('aria-selected', 'false');
  });

  test('clicking objects tab shows ObjectListPanel with rows', () => {
    const store = makeStoreWithPoint('A');
    render(<GeometryLeftPanel {...baseProps} store={store} />);
    fireEvent.click(screen.getByTestId('tab-objects'));
    expect(screen.getByTestId('object-list-panel')).toBeInTheDocument();
    expect(screen.getByTestId('object-row-p1')).toBeInTheDocument();
  });

  test('clicking row triggers onObjectSelect with id', () => {
    const store = makeStoreWithPoint('A');
    const onObjectSelect = jest.fn();
    render(<GeometryLeftPanel {...baseProps} store={store} onObjectSelect={onObjectSelect} />);
    fireEvent.click(screen.getByTestId('tab-objects'));
    fireEvent.click(screen.getByTestId('object-row-p1'));
    expect(onObjectSelect).toHaveBeenCalledWith('p1');
  });
});
```

> Note: shape của `object` (kind: 'point', data: {x,y}) phải khớp với `point` kind def trong `src/core/scene/kinds/point.ts`. Nếu test ADD fail vì shape sai, xem `src/core/scene/kinds/__tests__/` để lấy fixture đúng — copy thay vì đoán.

- [ ] **Step 2: Run test**

Run: `npx jest src/stamps/geometry-2d/editor/__tests__/LeftPanel.objectTab.test.tsx`
Expected: PASS. Nếu test ADD shape fail, copy fixture từ kinds tests.

- [ ] **Step 3: Commit**

```bash
git add src/stamps/geometry-2d/editor/__tests__/LeftPanel.objectTab.test.tsx
git commit -m "test(geometry-2d): integration tab Đối tượng + store"
```

---

### Task 9: Smoke run + manual checklist

- [ ] **Step 1: Full typecheck + test**

Run:
```bash
npm run typecheck && npm test
```
Expected: cả hai xanh. Đọc summary; nếu có snapshot test 3D fail vì class order khác (do shell), update có chủ đích.

- [ ] **Step 2: Build sanity**

Run: `npm run build`
Expected: dist/ output sạch, không lỗi tsup.

- [ ] **Step 3: Manual checklist (consumer dev server)**

User chạy consumer app trỏ tới local `@xom11/whiteboard` rồi tick:

- [ ] Desktop 2D: mở stamp → tạo điểm A, B, đoạn AB → tab "Đối tượng" hiển thị 3 row → click row "A" → MiniBoard highlight A.
- [ ] Desktop 2D: re-edit stamp 2D cũ → tab Đối tượng list đầy ngay khi editor mở.
- [ ] Mobile 2D (≤ 768px hoặc devtools mobile): mở drawer → 2 tab pill → switch Đối tượng → list hiển thị.
- [ ] Desktop 3D: tab Công cụ / Đối tượng vẫn chạy như trước refactor.
- [ ] Mobile 3D: drawer có 2 tab → switch Đối tượng → list hiển thị (feature mới).
- [ ] Dark mode 2D + 3D: cả 2 tab và body render đúng tông.

- [ ] **Step 4: Final commit (nếu cần fix sau manual)**

Nếu manual check phát hiện vấn đề nhỏ (style, padding…), fix + commit. Nếu pass hết → skip.

---

## Acceptance recap

Sau Task 9, đạt được:

1. ✅ `src/core/scene/ui/LeftPanelShell.tsx` là source-of-truth cho Shell + TabPill + Section.
2. ✅ 3D LeftPanel desktop + mobile dùng shell, không regression.
3. ✅ 3D mobile drawer có tab Đối tượng (feature mới).
4. ✅ 2D LeftPanel có tab Công cụ / Đối tượng, mirror 3D về UX.
5. ✅ 2D EditorPanel không còn cột phải `w-56`; MiniBoard full-width.
6. ✅ 2D Host lift store + selection từ EditorPanel qua callbacks.
7. ✅ `npm run typecheck` + `npm test` + `npm run build` xanh.
8. ✅ Manual checklist tick hết.

Hết.
