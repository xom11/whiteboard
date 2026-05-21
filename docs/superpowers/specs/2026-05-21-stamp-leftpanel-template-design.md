# Stamp LeftPanel Template — Design

**Status:** Approved — sẵn sàng execute Phase 1
**Author:** Claude + xinmotlanthua
**Date:** 2026-05-21
**Scope:** Refactor LeftPanel của 3 stamp editor (geometry-2d, geometry-3d, graph-2d) về dùng chung 1 template.
**Ambition tier:** Tier C — DRY refactor lớn, đụng 3 editor đã merge ổn định.

---

## 1. Context

Hiện tại 3 stamp editor có **layout khác nhau** mặc dù 90% surface chung:

| Editor | LeftPanel render bởi | EditorPanel layout | Hệ quả visual |
|---|---|---|---|
| `geometry-2d` | **Host** (`stamps/geometry-2d/host.tsx:99-122`) sibling của EditorPanel | `flex-col` (header → board → footer) | LeftPanel dán mép trái viewport, dialog ở giữa |
| `geometry-3d` | **Host** (`stamps/geometry-3d/host.tsx:124-143`, có cả desktop + mobile branch) | `flex-col` | LeftPanel dán mép trái viewport, dialog ở giữa |
| `graph-2d` | **Bên trong EditorPanel** (`stamps/graph-2d/editor/EditorPanel.tsx:170-187`) child của flex-row dialog | `flex-row` (LeftPanel + cột [header + board + footer]) | LeftPanel "dính" vào dialog → trông như ở giữa cùng board |

User phản hồi: graph-2d "tab công cụ ở giữa thay vì một tab bên trái như 2 tool kia".

**Surface chung nhưng implement khác nhau:**
- Tool button grid: 2D dùng `t.icon` + chord badge; graph-2d dùng `t.label.slice(0, 3)`; 3D dùng `ToolIcons[k]` dict.
- Axis/grid Section: 2D + 3D có; graph-2d không có (mặc dù `render.ts` đã đọc `view.showAxis`/`showGrid` từ state — chỉ là UI editor chưa expose toggle).
- Mobile drawer: 2D + 3D dùng `MobileToolDrawer` shared; graph-2d không có mobile mode.
- Chord shortcut: 2D + 3D dùng `useChordShortcut`; graph-2d không.
- Header color: 2D + 3D dùng emerald-teal; graph-2d dùng blue-indigo.
- `useToolHoverTooltip`: 2D đã extract sang `LeftPanel/useToolHoverTooltip.ts`, 3D còn duplicate inline trong `LeftPanel.tsx`.

## 2. Goals + non-goals

### Goals
1. **Visual consistency**: 3 editor có LeftPanel ở cùng vị trí trên màn hình (mép trái viewport), dialog centered độc lập.
2. **DRY**: 1 component `StampLeftPanel` shared cho cả 3, props variant chỉ define mục tools/groups/axis-grid.
3. **Mobile parity**: graph-2d có mobile drawer như 2D/3D.
4. **Chord shortcut parity**: graph-2d có `useChordShortcut` như 2D/3D.
5. **Bảo toàn UX hiện có**: không thay đổi behavior — chỉ tổ chức lại code + UI consistency.

### Non-goals
- Không thay đổi scene state, serialize format, hay tool semantics.
- Không thay đổi mobile breakpoint hay drawer animation.
- Không refactor MiniBoard / EditorPanel content area (chỉ touch LeftPanel + EditorPanel layout outer).
- Không đụng `LeftPanelShell` (đã shared rồi, OK để giữ làm chrome).

## 3. Current state inventory

### 3.1. Shared building blocks (đã có)

| File | Vai trò | Dùng bởi |
|---|---|---|
| `core/scene/ui/LeftPanelShell.tsx` | `<aside>` chrome + tab pills + `<Section>` | 2D, 3D, graph-2d |
| `core/scene/ui/ObjectListPanel.tsx` | List objects + selection | 2D, 3D, graph-2d |
| `core/scene/ui/ObjectRow.tsx` | Row UI default | 2D, 3D |
| `stamps/shared/MobileToolDrawer.tsx` | Mobile drawer generic | 2D, 3D |
| `stamps/shared/useChordShortcut.ts` | 2-key chord shortcut | 2D, 3D |
| `stamps/shared/useIsMobile.ts` | Mobile breakpoint detect | 2D, 3D, graph-2d (graph-2d chưa dùng) |

### 3.2. Per-editor LeftPanel files

```
geometry-2d/editor/LeftPanel.tsx       (17 LoC dispatcher)
geometry-2d/editor/LeftPanel/
├── Desktop.tsx                        (227 LoC — chord visualization rich)
├── Mobile.tsx
├── icons.tsx
├── types.ts                           (GeometryLeftPanelProps)
└── useToolHoverTooltip.ts             (shared hook — đã extract)

geometry-3d/editor/LeftPanel.tsx       (367 LoC — DesktopPanel + MobilePanel + duplicate useToolHoverTooltip)
geometry-3d/editor/toolPanel/
├── groups.ts                          (GROUP_ORDER, TOOLS_BY_GROUP, letterForGroup)
├── icons.tsx                          (ToolIcons dict)
├── ToolPalette.tsx                    (desktop grid)
└── ToolButton.tsx

graph-2d/editor/LeftPanel.tsx          (221 LoC — monolithic, ToolStrip inline, no mobile)
```

### 3.3. Variant points (per editor differ)

| Surface | geometry-2d | geometry-3d | graph-2d |
|---|---|---|---|
| Tool field naming | `key` | `key` | `id` ⚠️ |
| Tool icon | ReactNode trong `tools.tsx` | dict `ToolIcons[key]` | text 3-char (`label.slice(0,3)`) |
| Groups dict | `GROUP_LABELS` + `GROUP_ORDER` (tools.tsx) | `GROUP_LABELS` + `GROUP_ORDER` (toolPanel/groups.ts) | `GROUP_LABELS` + `GROUPS` (tools.ts) |
| Chord viz | Group highlight + number badge | Hint string only | None |
| Axis/grid label | "Trục toạ độ" + "Lưới" | "Trục" + "Lưới" | (cần add) "Trục" + "Lưới" |
| Axis/grid section label | "Bố cục" | "Góc nhìn" | (đề xuất) "Bố cục" |
| Tabs | `tools \| objects` | `tools \| algebra` (đổi label "Đối tượng") | `tools \| objects` |
| Custom row | dùng default `ObjectRow` | dùng default | custom `FunctionRow` + `ParameterRow` (cần preserve) |
| Add buttons | None | None | `+ Hàm f(x)`, `+ Tham số` |

## 4. Proposed: `StampLeftPanel` template

### 4.1. File location

```
src/stamps/shared/StampLeftPanel/
├── index.tsx                  ← public API (StampLeftPanel + types)
├── Desktop.tsx                ← desktop layout (LeftPanelShell + sections + tool grid)
├── Mobile.tsx                 ← mobile drawer (wraps MobileToolDrawer)
├── ToolGrid.tsx               ← shared tool button grid (chord-aware)
├── AxisGridSection.tsx        ← optional axis/grid + undo/redo row
└── useToolHoverTooltip.ts     ← moved from geometry-2d/editor/LeftPanel/
```

### 4.2. Tool descriptor (unified)

```ts
// src/stamps/shared/StampLeftPanel/types.ts
export interface StampToolDef<TKey extends string, TGroup extends string> {
  key: TKey;             // ⚠️ graph-2d phải đổi `id` → `key` để align
  label: string;
  title?: string;
  group: TGroup;
  icon: React.ReactNode; // graph-2d cần thay text 3-char bằng ReactNode SVG
  shortcut?: string;
}
```

### 4.3. StampLeftPanel API

```ts
export interface StampLeftPanelProps<TKey extends string, TGroup extends string> {
  // Header
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  isDark?: boolean;
  testId?: string;

  // Tools
  tools: StampToolDef<TKey, TGroup>[];
  groupOrder: readonly TGroup[];
  groupLabels: Record<TGroup, string>;
  activeTool: TKey;
  onToolChange: (k: TKey) => void;

  // Optional axis/grid + undo/redo section
  view?: {
    sectionLabel?: string;          // mặc định "Bố cục"
    showAxis: boolean;
    showGrid: boolean;
    axisLabel?: string;             // mặc định "Trục"
    gridLabel?: string;             // mặc định "Lưới"
    onShowAxisChange: (b: boolean) => void;
    onShowGridChange: (b: boolean) => void;
  };
  history?: {
    onUndo: () => void;
    canUndo: boolean;
    onRedo: () => void;
    canRedo: boolean;
  };

  // Optional chord shortcut visualization
  chord?: {
    activeGroup: TGroup | null;
    letterForGroup: (g: TGroup) => string;
  };

  // Optional objects tab
  objects?: {
    label?: React.ReactNode;        // mặc định "📐 Đối tượng"
    store: Store;
    selectedObjectId?: string;
    onObjectSelect?: (id: string | null) => void;
    renderRow?: (obj: SceneObject, defaults: { selected: boolean; onClick: () => void }) => React.ReactNode | null;
    addButtons?: Array<{ label: string; testId?: string; onClick: () => void }>;
  };

  // Mobile
  isMobile?: boolean;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}
```

### 4.4. Behavior

**Desktop** (`isMobile === false`):
1. `<LeftPanelShell>` chrome với tabs `[tools, objects?]`.
2. Tab "tools": render trong order
   - `<AxisGridSection>` (chỉ render nếu `view` hoặc `history` được pass).
   - `<ToolGrid>` (chord-aware: nếu `chord.activeGroup` set → highlight + dim others).
   - Chord hint string (mượn từ 2D Desktop.tsx:178-197).
3. Tab "objects": render `<ObjectListPanel>` với optional `addButtons` row trên cùng + custom `renderRow`.

**Mobile** (`isMobile === true`):
- Wrap `<MobileToolDrawer>` với chips = axis/grid, actions = undo/redo, groups = tools grouped by `group`.
- Pass `objects?` thành `objectsTab` của `MobileToolDrawer`.

### 4.5. Host integration pattern (sau migration)

```tsx
// stamps/graph-2d/host.tsx (mới)
return (
  <>
    <StampLeftPanel
      title="Đồ thị"
      icon={GraphIconHeader}
      tools={TOOLS}                       // unified shape
      groupOrder={GROUPS}
      groupLabels={GROUP_LABELS}
      activeTool={activeTool}
      onToolChange={handleSelectTool}
      view={{ showAxis, showGrid, onShowAxisChange: setShowAxis, onShowGridChange: setShowGrid }}
      history={{ onUndo, canUndo, onRedo, canRedo }}
      chord={{ activeGroup: chordGroup, letterForGroup }}
      objects={{
        store: storeRef.current,
        renderRow: makeGraphRenderRow(storeRef.current),
        addButtons: [
          { label: '+ Hàm f(x)', testId: 'add-function-btn', onClick: handleAddFunction },
          { label: '+ Tham số', testId: 'add-parameter-btn', onClick: handleAddParameter },
        ],
      }}
      isMobile={isMobile}
      drawerOpen={drawerOpen}
      onDrawerClose={() => setDrawerOpen(false)}
      onClose={onClose}
      isDark={isDark}
    />
    <GraphEditorPanel
      ref={panelRef}
      initialState={initialState}
      onInsert={handleInsert}
      onClose={onClose}
      isDark={isDark}
      isMobile={isMobile}
      onOpenDrawer={() => setDrawerOpen(true)}
      withLeftPanel={!isMobile}
      showAxis={showAxis}
      showGrid={showGrid}
      onStoreReady={(s) => storeRef.current = s}
    />
  </>
);
```

EditorPanel của graph-2d sau migration sẽ là `flex-col` (header + board + footer) giống 2D/3D, không còn chứa LeftPanel.

## 5. Migration plan

### Phase 1 — Extract template (no behavior change)
**Branch:** `refactor/stamp-leftpanel-template`

1.1. Create `src/stamps/shared/StampLeftPanel/` skeleton với API định nghĩa ở §4.3.
1.2. Move `useToolHoverTooltip` từ `geometry-2d/editor/LeftPanel/` sang `shared/StampLeftPanel/`.
1.3. Implement `Desktop.tsx` bằng cách port logic từ `geometry-2d/editor/LeftPanel/Desktop.tsx` (chord viz rich nhất → làm baseline).
1.4. Implement `Mobile.tsx` wrap `MobileToolDrawer` với props mapping.
1.5. Implement `ToolGrid.tsx` (4-col grid, chord-aware, support icon ReactNode hoặc text fallback).
1.6. Implement `AxisGridSection.tsx`.
1.7. Add unit tests cho template: smoke + axis/grid optional + chord viz + mobile drawer.

### Phase 2 — Migrate geometry-2d
**Branch:** `refactor/stamp-leftpanel-migrate-2d`

2.1. Đổi `geometry-2d/host.tsx` import `StampLeftPanel` thay vì `GeometryLeftPanel`.
2.2. Map props: `chordGroup` → `chord.activeGroup`; `showAxis`/`showGrid` → `view`; tools → already `key`.
2.3. Delete `geometry-2d/editor/LeftPanel.tsx`, `LeftPanel/Desktop.tsx`, `LeftPanel/Mobile.tsx`, `LeftPanel/icons.tsx`, `LeftPanel/types.ts` (giữ lại `UndoIcon`/`RedoIcon` re-export nếu MiniBoard import — verify trước khi xoá).
2.4. Run existing 2D tests → expect no regression.

### Phase 3 — Migrate geometry-3d
**Branch:** `refactor/stamp-leftpanel-migrate-3d`

3.1. Đổi `geometry-3d/host.tsx` dùng `StampLeftPanel`.
3.2. Tools đã có `key` field — chỉ cần map: dict `ToolIcons[k]` → đưa vào `tools[i].icon` khi build TOOLS array.
3.3. Sửa `geometry-3d/editor/tools/spec.ts` thêm field `icon` (hoặc keep `ToolIcons` dict + spread khi pass props).
3.4. Delete `geometry-3d/editor/LeftPanel.tsx` (giữ `toolPanel/` để cung cấp icons + groups data).
3.5. Đổi tab label "algebra" → "objects" cho consistency (kiểm tra test selector `data-testid="tab-algebra"` → đổi sang `tab-objects`; check qua `grep`).
3.6. Run existing 3D tests.

### Phase 4 — Migrate graph-2d (large change)
**Branch:** `refactor/stamp-leftpanel-migrate-graph-2d`

4.1. **Đổi tool shape** trong `graph-2d/editor/tools.ts`: `id` → `key`, thêm field `icon: React.ReactNode` cho 12 tool.
4.2. Thiết kế 12 SVG icon đơn giản cho graph tools (tham khảo style 2D icons).
4.3. Thêm `useChordShortcut` vào `graph-2d/host.tsx`.
4.4. Thêm `useIsMobile` + drawer state vào host.
4.5. **Refactor `EditorPanel.tsx`**: bỏ `<GraphLeftPanel>` ra ngoài, đổi wrapper từ `flex-row` thành `flex-col` (header + board + footer giống 2D/3D). Thêm props `isMobile`, `onOpenDrawer`, `showAxis`, `showGrid` để pass xuống.
4.6. **MiniBoard.tsx**: subscribe `showAxis`/`showGrid` từ store hoặc props → toggle JSXGraph board axis/grid runtime. Verify `state.meta.view.showAxis`/`showGrid` được update vào sceneJson serialize.
4.7. Update `serialize.ts`: đảm bảo `view.showAxis`/`showGrid` được persist (đã có trong `render.ts` line 82-83, cần verify serialize chiều ngược lại).
4.8. Host dùng `StampLeftPanel` với `addButtons`, `renderRow` custom (giữ `FunctionRow`, `ParameterRow`).
4.9. Đổi header EditorPanel màu **emerald-teal** cho consistency (hoặc giữ blue-indigo — chốt với user trước).
4.10. Delete `graph-2d/editor/LeftPanel.tsx`.
4.11. Run existing graph-2d tests.

### Phase 5 — Polish
**Branch:** `refactor/stamp-leftpanel-polish`

5.1. Code review tổng thể, check duplicate còn không.
5.2. Update CLAUDE.md mục "Cấu trúc" reflect template structure mới.
5.3. Add story/demo nếu có Storybook (verify trước).
5.4. Tag release `v0.16.0` (hoặc minor bump phù hợp).

## 6. Test plan

### 6.1. Existing tests phải pass
- `src/stamps/geometry-2d/editor/__tests__/` — tất cả
- `src/stamps/geometry-3d/editor/__tests__/` — tất cả
- `src/stamps/graph-2d/editor/__tests__/` — tất cả
- `src/core/scene/ui/__tests__/` — `LeftPanelShell` tests

### 6.2. New tests cho `StampLeftPanel`
1. **Smoke desktop**: render với tools + groups → tool buttons visible với `aria-pressed`.
2. **Smoke mobile**: `isMobile={true}` + `drawerOpen={true}` → MobileToolDrawer render.
3. **Axis/grid optional**: không pass `view` → section không render; pass `view` → checkbox toggle gọi callback.
4. **Chord viz**: pass `chord.activeGroup` → group được highlight với `data-chord-active="true"`.
5. **Objects tab**: pass `objects.addButtons` → buttons xuất hiện trên cùng tab.
6. **Custom renderRow**: pass `objects.renderRow` → row được render bằng custom component.
7. **No objects prop**: chỉ tab "tools" hiển thị.

### 6.3. Visual regression (manual)
- 3 editor mở desktop: LeftPanel cùng vị trí (mép trái), cùng width (240px).
- 3 editor mở mobile: hamburger header + drawer slide-in.
- Toggle axis/grid trên graph-2d: SVG render reflect (verify trong render.ts).

## 7. Acceptance criteria

- [ ] `src/stamps/shared/StampLeftPanel/` exists với 5-6 file + tests.
- [ ] 3 host files (`geometry-2d/host.tsx`, `geometry-3d/host.tsx`, `graph-2d/host.tsx`) import `StampLeftPanel`.
- [ ] 3 file LeftPanel cũ đã xoá: `geometry-2d/editor/LeftPanel.tsx` (+ LeftPanel/ subdir), `geometry-3d/editor/LeftPanel.tsx`, `graph-2d/editor/LeftPanel.tsx`.
- [ ] graph-2d EditorPanel.tsx đổi từ `flex-row` (chứa LeftPanel) → `flex-col` (chỉ chứa board chrome).
- [ ] graph-2d có axis/grid toggle, mobile drawer, chord shortcut hoạt động.
- [ ] Tất cả existing tests pass (`npm test`).
- [ ] `npm run typecheck` không có error.
- [ ] `npm run build` thành công.
- [ ] CLAUDE.md cập nhật cấu trúc mới.
- [ ] Manual visual check: 3 editor LeftPanel dán mép trái viewport.

## 8. Risks + mitigation

| Risk | Mitigation |
|---|---|
| Break 2D/3D existing UX khi migrate | Migrate từng editor 1 branch, test đầy đủ trước merge. Phase 1 không touch editor → safe baseline. |
| Tool icon thiết kế cho graph-2d không đẹp/không match | Phase 4.2 spike trước, ask user review icon mockup nếu cần. Fallback: dùng text 3-char như cũ qua optional `iconAsText` flag. |
| Chord shortcut conflict giữa 2D vs graph-2d (cùng phím) | Editors là separate instance (chỉ 1 editor mở tại 1 thời điểm) → không conflict. Verify trong tests. |
| `state.meta.view.showAxis/showGrid` chưa được serialize đầy đủ | Phase 4.6-4.7: verify roundtrip (axis on → save → reload → axis on). Test case dedicated. |
| Tab label đổi từ "algebra" → "objects" break 3D tests dùng `data-testid="tab-algebra"` | Phase 3.5 grep + update selectors. |
| LeftPanelShell có data-testid="left-panel" — 3 editor cùng test ID, có thể duplicate trong DOM | Verify chỉ 1 editor active tại 1 thời điểm. Nếu cần override → dùng `testId` prop đã có. |
| Refactor lớn → review khó | Tách 5 phase nhỏ thành 5 PR riêng (Phase 1-5). Mỗi PR ≤ 500 LoC diff. |

## 9. Decisions (chốt 2026-05-21)

1. **Graph-2d header color** → **Emerald-teal** (đồng nhất với 2D/3D). Lý do: consistency > differentiator, brand "stamp editor" thống nhất.
2. **Graph-2d tool icons** → **Design 12 SVG mới**. Text 3-char không match style 2D/3D. Effort phụ ~0.5 ngày.
3. **Release strategy** → **5 PR liên tiếp**. Mỗi PR self-contained, ≤500 LoC, dễ review + rollback. Match memory `feedback_subagent_execution_pattern`.
4. **Shortcut style cho graph-2d** → **Single-letter, không chord**. Lý do:
   - Graph-2d chỉ 12 tools (vs 2D ~25 tools) → đủ phím single-letter.
   - User journey graph-2d đơn giản (vẽ đồ thị) → ít power user.
   - Template vẫn support cả 2 mode qua optional `chord` prop: pass `chord` → chord viz; không pass → fallback single-letter shortcut hint trên tooltip.
5. **`AxisGridSection` Reset view button** → **Không thêm**. 3D mobile có Reset view vì có camera rotation (azimuth/elevation). 2D/graph-2d không có camera state → reset không có ý nghĩa rõ ràng. Out of scope.

## 10. References

- Memory `feedback_architecture_decisions.md` — feature lớn → present 2-3 mức + refactor lớn tách issue.
- Memory `project_refactor_tier_a_b_status.md` — Tier A/B/B½ đã done v0.16-0.18. Tier C là LeftPanel template.
- Memory `feedback_subagent_execution_pattern.md` — 1 subagent/PR cho TDD dài; bundle khi cross-file typecheck.
- Source files referenced:
  - `src/stamps/geometry-2d/host.tsx:99-122`
  - `src/stamps/geometry-3d/host.tsx:124-143`
  - `src/stamps/graph-2d/editor/EditorPanel.tsx:170-187`
  - `src/stamps/geometry-2d/editor/LeftPanel/Desktop.tsx:104-197` (chord viz baseline)
  - `src/stamps/shared/MobileToolDrawer.tsx`
  - `src/core/scene/ui/LeftPanelShell.tsx`
  - `src/stamps/graph-2d/render.ts:82-83` (axis/grid render support)
  - `src/stamps/graph-2d/editor/tools.ts` (cần rename `id` → `key`)
