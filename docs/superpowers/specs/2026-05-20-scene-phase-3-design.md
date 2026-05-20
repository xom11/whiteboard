# Scene v2 — Phase 3: Object Panel + Action Recorder + Integration Tests

**Status:** Draft → Approved 2026-05-20
**Issue:** #22
**Phase chain:** #20 (design) → Phase 1 v0.12.0 → Phase 2 #21 v0.13.0 → **Phase 3 (this) v0.14.0**

## 1. Bối cảnh

Phase 1 + 2 đã refactor nền: mọi đối tượng vẽ trên stamp hình học 2D + 3D đều đi qua `core/scene` store (immutable state + action dispatch + kind registry). Refactor đó **tự nó không cho user lợi ích trực tiếp** — board hoạt động như cũ.

Phase 3 = **payoff layer**: exploit nền action-based để build 3 deliverable theo 3 trục giá trị:

- **G1 ObjectListPanel** — feature user-facing (UX, đáng marketing v0.14.0).
- **G2 Action recorder** — dev-facing proof-of-concept (chứng minh nền store mở đường cho animation/AI/multi-user).
- **G3 Integration tests re-edit dblclick** — test debt cleanup (lấp lỗ hổng Phase 2 đã skip).

Sau Phase 3 → đóng issue gốc #20.

## 2. Goals / Non-goals

### Goals

1. ObjectListPanel shared component cho cả 2D + 3D: list mọi object qua selector, mỗi row có icon kind + label + summary + toggles (visible, locked) + ⋮ menu (rename/color/delete). Click row → highlight tương ứng trên board. Reactive qua `store.subscribe`.
2. `useActionRecorder(store)` hook + dev-only UI: record mọi dispatch với timestamp, "Replay" button re-dispatch sequence với delay. Test coverage roundtrip record → replay → state identical.
3. Integration test re-edit dblclick cho cả `geometry-2d` + `geometry-3d` stamp: mount stamp Host, simulate dblclick, assert editor reopen với state khôi phục đúng.
4. Tất cả test cũ pass; không skip. Typecheck clean. Release `v0.14.0` với `dist/` committed.

### Non-goals (defer khỏi Phase 3)

- Multi-select + batch ops cho ObjectListPanel.
- Persist recorder history qua sessionStorage giữa các session.
- Cylinder/cone reactive faceted mesh (stretch S2).
- Action diff visualization Redux-DevTools-style (stretch S3).
- MiniBoard 2D cleanup <500 dòng (stretch S1).
- Selection state lưu vào store (giữ local component state cho Phase 3; nếu cần share sau thì wire qua `meta` field hoặc separate `ui` slice ở phase sau).

## 3. Architecture

```
src/
├── core/scene/
│   ├── types.ts                       ← EXTEND: KindDef thêm displayName, icon, summary
│   └── ui/                            ← NEW
│       ├── ObjectListPanel.tsx
│       ├── ObjectRow.tsx
│       ├── ObjectRowMenu.tsx
│       ├── useActionRecorder.ts
│       ├── RecorderPanel.tsx
│       └── __tests__/
│           ├── ObjectListPanel.test.tsx
│           ├── ObjectRow.test.tsx
│           └── useActionRecorder.test.ts
├── stamps/geometry-2d/
│   ├── editor/EditorPanel.tsx         ← MOD: mount ObjectListPanel + RecorderPanel
│   ├── kinds/*.ts                     ← MOD: thêm displayName + icon + summary cho 8 kind
│   └── __tests__/
│       └── integration/
│           └── re-edit-2d.test.tsx    ← NEW G3
├── stamps/geometry-3d/
│   ├── editor/
│   │   ├── EditorPanel.tsx            ← MOD: thay AlgebraList bằng ObjectListPanel + mount RecorderPanel
│   │   └── algebraPanel/              ← DELETE thư mục (logic dời sang kind.summary)
│   ├── kinds/*.ts                     ← MOD: thêm displayName + icon + summary cho 11 kind
│   └── __tests__/
│       └── integration/
│           └── re-edit-3d.test.tsx    ← NEW G3
```

### Data flow G1 (highlight on row click)

```
User click row → ObjectListPanel local setState(selectedId)
                → call onSelect(id) prop
                → parent EditorPanel calls renderer.highlight(id)
                → JxgRenderer/JxgRenderer3D apply temporary style (no store mutation)
                → on next selection, previous highlight cleared
```

Highlight là **side effect cục bộ trong renderer**, không qua store. Lý do: chưa cần undo highlight, chưa cần share giữa renderer instances. Nếu sau này cần selection trong store, mở rộng dễ.

### Data flow G2 (recorder)

```
useActionRecorder(store) {
  const historyRef = useRef<RecordedAction[]>([])
  useEffect(() => store.subscribe((next, prev, action) => {
    if (action.type === '__REPLAY__') return  // skip during replay
    historyRef.current.push({ action, at: Date.now() })
  }), [store])
  return { history: historyRef.current, replay, clear }
}

replay(history, delayMs) {
  store.dispatch({ type: 'RESET' })
  for (action of history) {
    await sleep(delayMs)
    store.dispatch(action)
  }
}
```

`__REPLAY__` không cần marker action; replay chỉ re-dispatch chuỗi action cũ. Recorder bỏ qua những dispatch xảy ra trong khoảng `isReplaying = true`.

### Data flow G3 (integration test re-edit)

```
test('dblclick stamp reopens editor with restored state', async () => {
  const onClose = jest.fn()
  const { getByTestId } = render(
    <GeometryHost
      initialState={fixtureState}
      onClose={onClose}
    />
  )
  // assert editor mounted with same objects
  expect(getByTestId('mini-board')).toBeInTheDocument()
  expect(getByTestId('object-list-panel')).toHaveTextContent('Điểm A')
})
```

Test mount stamp Host (geometry-2d/index.tsx exports Host component) trực tiếp với `initialState` đại diện cho state đã serialize từ stamp customData. Không cần Excalidraw API thật — Host nhận props `initialState` đủ rồi.

## 4. Components & API

### 4.1 Kind metadata lookup (`src/core/scene/ui/kindMeta.ts`)

`KindDef` đã có `describe(obj): string` (vd `"A = (1, 2)"`). Không cần extend types. Thay vào đó, đặt lookup table riêng cho UI panel:

```ts
// src/core/scene/ui/kindMeta.ts
export interface KindUiMeta {
  displayName: string;  // "Điểm", "Đoạn thẳng", "Mặt phẳng"
  icon: string;         // emoji hoặc 1 char glyph
}

export const KIND_UI_META: Readonly<Record<string, KindUiMeta>> = {
  // 2D
  point:        { displayName: 'Điểm',        icon: '·' },
  segment:      { displayName: 'Đoạn thẳng',  icon: '—' },
  line:         { displayName: 'Đường thẳng', icon: '/' },
  ray:          { displayName: 'Tia',         icon: '→' },
  vector:       { displayName: 'Vector',      icon: '↗' },
  circle:       { displayName: 'Đường tròn',  icon: '○' },
  polygon:      { displayName: 'Đa giác',     icon: '◇' },
  intersection: { displayName: 'Giao điểm',   icon: '✕' },
  // 3D
  point3d:      { displayName: 'Điểm',        icon: '·' },
  segment3d:    { displayName: 'Đoạn thẳng',  icon: '—' },
  line3d:       { displayName: 'Đường thẳng', icon: '/' },
  ray3d:        { displayName: 'Tia',         icon: '→' },
  vector3d:     { displayName: 'Vector',      icon: '↗' },
  plane3d:      { displayName: 'Mặt phẳng',   icon: '▱' },
  polygon3d:    { displayName: 'Đa giác',     icon: '◇' },
  sphere3d:     { displayName: 'Mặt cầu',     icon: '◯' },
  polyhedron3d: { displayName: 'Đa diện',     icon: '⬢' },
  cylinder3d:   { displayName: 'Hình trụ',    icon: '⌭' },
  cone3d:       { displayName: 'Hình nón',    icon: '▲' },
};

export function getKindUiMeta(kind: string): KindUiMeta {
  return KIND_UI_META[kind] ?? { displayName: kind, icon: '?' };
}
```

Row summary lấy từ `getKind(obj.kind).describe(obj)` (đã có sẵn). Không sửa file nào trong `core/scene/kinds/`.

### 4.2 `src/core/scene/ui/ObjectListPanel.tsx`

```ts
export interface ObjectListPanelProps {
  store: Store;
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export function ObjectListPanel(props: ObjectListPanelProps): React.ReactElement;
```

- `useSyncExternalStore(store.subscribe, store.getState)` → state.
- `listObjects(state)` → array order chuẩn.
- Render: `<ul data-testid="object-list-panel">` + `<ObjectRow>` per object.
- Empty state: "Chưa có đối tượng nào".

### 4.3 `src/core/scene/ui/ObjectRow.tsx`

```ts
export interface ObjectRowProps {
  obj: SceneObject;
  state: State;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onRename: (id: string) => void;       // TODO Phase 4 — no-op cho Phase 3
  onChangeColor: (id: string) => void;  // TODO Phase 4 — no-op cho Phase 3
  onDelete: (id: string) => void;
}
```

Layout:
```
[icon] [label] [= summary]  [👁] [🔒] [⋮]
```

- `[icon]` từ `kind.icon`, fallback `kind.displayName[0]`.
- `[label]` từ `obj.label`.
- `[= summary]` từ `kind.summary(obj, state)`, ẩn nếu không có summary.
- `[👁]` button: click → `onToggleVisible(id)` → dispatch `UPDATE_ATTRS { visible: !obj.visible }`.
- `[🔒]` button: click → `onToggleLocked(id)` → dispatch `UPDATE_ATTRS { locked: !obj.locked }`.
- `[⋮]` menu: rename/color (no-op), delete.
- Row container: `aria-selected={selected}`, `data-testid="object-row-${obj.id}"`. Click row (không phải nút) → `onSelect(id)`.

### 4.4 `src/core/scene/ui/ObjectRowMenu.tsx`

Inspired by existing `src/stamps/geometry-3d/editor/algebraPanel/RowMenu.tsx`. Refactor + relocate.

```ts
export interface ObjectRowMenuProps {
  onRename: () => void;       // Phase 3: stub
  onChangeColor: () => void;  // Phase 3: stub
  onDelete: () => void;
}
```

### 4.5 `src/core/scene/ui/useActionRecorder.ts`

```ts
export interface RecordedAction {
  action: Action;
  at: number;
}

export interface ActionRecorder {
  history: ReadonlyArray<RecordedAction>;
  isReplaying: boolean;
  record: () => void;                         // start (default = start)
  stop: () => void;                           // pause recording
  clear: () => void;
  replay: (delayMs?: number) => Promise<void>;
}

export function useActionRecorder(store: Store): ActionRecorder;
```

Implementation:
- `useRef<RecordedAction[]>` cho history.
- `useRef<boolean>` cho `isReplayingRef` + `isRecordingRef`.
- `useEffect`: subscribe store, push history nếu `isRecording && !isReplaying`.
- `replay`: dispatch `RESET` → loop dispatch action với `await sleep(delay)` giữa step. Set `isReplayingRef = true` đầu, `= false` cuối.

### 4.6 `src/core/scene/ui/RecorderPanel.tsx`

Dev-only UI. Show khi `process.env.NODE_ENV === 'development'` hoặc URL có `?recorder=1`.

```ts
export interface RecorderPanelProps {
  recorder: ActionRecorder;
}
```

Layout:
```
┌─ Recorder ─────────────────┐
│ History: 12 actions        │
│ [⏺ Stop] [▶ Replay] [🗑]   │
│                            │
│ ├─ ADD point #abc          │
│ ├─ UPDATE_ATTRS #abc       │
│ ├─ ADD segment #def        │
│ └─ ...                     │
└────────────────────────────┘
```

Position: fixed bottom-right, collapsed by default. Click toggle để expand.

### 4.7 Wiring `geometry-2d/editor/EditorPanel.tsx`

```tsx
export function EditorPanel(props) {
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const recorder = useActionRecorder(store)

  function handleSelect(id: string) {
    setSelectedId(id)
    renderer.highlight(id)  // new method on JxgRenderer
  }

  return (
    <div className="grid grid-cols-[1fr_280px]">
      <MiniBoard ... />
      <div className="flex flex-col">
        <ObjectListPanel
          store={store}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
        <RecorderPanel recorder={recorder} />
      </div>
    </div>
  )
}
```

### 4.8 Wiring `geometry-3d/editor/EditorPanel.tsx`

```tsx
// trước
<AlgebraList store={store} />

// sau
<ObjectListPanel store={store} selectedId={...} onSelect={...} />
```

Xoá `src/stamps/geometry-3d/editor/algebraPanel/` thư mục. Logic `symbolicFor/numericFor` chuyển vào từng kind file qua `kind.summary()`.

### 4.9 `JxgRenderer.highlight` + `JxgRenderer3D.highlight`

Thêm method mới vào renderer (cả 2D + 3D):
```ts
class JxgRenderer {
  highlight(id: string | null): void  // null = clear highlight
}
```

Implementation: dùng map `Map<id, JxgObject>` đã có; apply temporary style (vd stroke thicker + glow) cho object highlight, restore khi highlight target khác.

## 5. Migration Plan (per-PR)

### PR 3.1 — ObjectListPanel + kind UI metadata (~1.5 ngày)
1. Tạo `core/scene/ui/kindMeta.ts` (lookup table 19 kind).
2. Tạo `core/scene/ui/ObjectListPanel.tsx` + `ObjectRow.tsx` + `ObjectRowMenu.tsx` + tests.
3. Thêm `highlight(id)` vào `JxgRenderer` + `JxgRenderer3D`.
4. Wire vào `geometry-2d/EditorPanel`.
5. Wire vào `geometry-3d/EditorPanel`, xoá thư mục `algebraPanel/`.
6. Test cũ 3D AlgebraList → refactor sang ObjectListPanel.
7. Acceptance: panel render đúng 2D + 3D; visible/locked toggle dispatch; delete dispatch; click row highlight; typecheck clean.

### PR 3.2 — Action recorder (~1 ngày)
1. Tạo `useActionRecorder.ts` + tests (roundtrip record → replay → identical state).
2. Tạo `RecorderPanel.tsx` + tests (render history list, button actions).
3. Wire vào `geometry-2d/EditorPanel` + `geometry-3d/EditorPanel` với dev-only guard.
4. Acceptance: dev mode hiện panel; record dispatch xuất hiện trong list; replay re-dispatch + state snapshot identical baseline (qua deep equal); prod build không include panel.

### PR 3.3 — Integration tests re-edit dblclick (~1 ngày)
1. Tạo `geometry-2d/__tests__/integration/re-edit-2d.test.tsx`.
2. Tạo `geometry-3d/__tests__/integration/re-edit-3d.test.tsx`.
3. Acceptance: cả 2 test mount stamp Host với fixture initialState (3 object trở lên), assert editor mounted + ObjectListPanel chứa label đúng. Test green trong jest jsdom.

### Release
1. `npm run build` + commit dist/.
2. `npm version minor` → 0.14.0.
3. Tag + push.
4. Đóng issue #22 + #20.

## 6. Error handling

- ObjectListPanel: object có `kind` không tồn tại trong registry → render row với label `<unknown kind: ${kindId}>` + disabled toggles. Console.warn lần đầu.
- Recorder: replay khi history rỗng → no-op + console.warn. Replay khi đang replay → ignore.
- KindDef.summary throw → catch + render empty summary + console.warn. Không crash panel.

## 7. Testing strategy

### 7.1 Pure unit tests
- `useActionRecorder` (record/replay/clear) — 6+ test cases.
- `ObjectRow` rendering + toggle dispatch — 4+ test cases.
- `ObjectListPanel` empty state + list + filter by kind — 3+ test cases.

### 7.2 Integration tests (jsdom + testing-library)
- `re-edit-2d.test.tsx`: 2 fixture (simple point + complex polygon).
- `re-edit-3d.test.tsx`: 2 fixture (simple point + plane).

### 7.3 Smoke test thủ công (post-implement)
- `npm run dev` → mount whiteboard demo → vẽ tam giác → check panel hiển thị đủ → toggle visible/locked → check effect trên board → mở recorder → click Replay → confirm tam giác vẽ lại tuần tự.

### 7.4 Test count baseline
- Baseline (sau v0.13.0): 503 (per issue #22).
- Phase 3 expected: ≥ 530 (≈ 25-30 test mới).

## 8. Acceptance criteria

- [ ] ObjectListPanel render đúng list 2D + 3D qua selector từ store.
- [ ] Click row trên panel → object highlight trên board.
- [ ] Visible/locked toggle dispatch `UPDATE_ATTRS` đúng.
- [ ] Delete button dispatch `DELETE` action.
- [ ] `useActionRecorder` capture mọi dispatch với timestamp.
- [ ] Replay function re-dispatch sequence + state cuối identical baseline (deep equal).
- [ ] Dev-only guard: prod build không include RecorderPanel.
- [ ] Integration test re-edit 2D pass.
- [ ] Integration test re-edit 3D pass.
- [ ] Jest baseline ≥ 503 + ~25-30 test mới, all green.
- [ ] Typecheck clean (`npm run typecheck`).
- [ ] Build clean (`npm run build`).
- [ ] Release `v0.14.0` với `dist/` committed.

## 9. Out of scope

- Multi-select rows.
- Drag-reorder rows.
- Search/filter trong panel.
- Selection state vào store (giữ local).
- Animation timeline UI.
- Rename + change-color implementation (stubs only).
- Cylinder/cone reactive mesh.
- Action diff viz.
- MiniBoard 2D <500 dòng cleanup.

## 10. Trade-offs / risks

- **Xoá `algebraPanel/`** → cần verify không có ai import; kiểm tra qua grep trước khi xoá.
- **Per-kind summary string** không i18n — chấp nhận tiếng Việt hardcoded ở displayName. Nếu cần i18n sau, refactor displayName thành key.
- **Highlight thông qua renderer side-effect** không có undo — chấp nhận, là transient UI state.
- **Recorder replay không capture user input timing** — chỉ delay đều. Acceptable cho PoC.
- **KindDef extension là breaking** cho 3rd-party kind (nếu có) — repo hiện không expose registry API public, OK.

## 11. References

- Issue #20 (Scene v2 design), #21 (Phase 2), #22 (Phase 3 này).
- Phase 1: tag `v0.12.0` (`f1ad07b`).
- Phase 2: tag `v0.13.0` (`d909e8e`).
- Phase 2 plan template: `docs/superpowers/plans/2026-05-20-scene-phase-2-2d.md`.
- Spec section 8 Phase 3 — Payoff: `docs/superpowers/specs/2026-05-20-scene-v2-design.md:369`.
- 3D AlgebraList hiện tại: `src/stamps/geometry-3d/editor/algebraPanel/AlgebraList.tsx`.
