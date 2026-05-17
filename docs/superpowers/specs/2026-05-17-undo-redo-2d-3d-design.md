# Undo/Redo cho Geometry 2D + 3D editor

**Ngày:** 2026-05-17
**Status:** Draft — chờ user review

## Mục tiêu

Thêm cặp nút **Hoàn tác (Undo)** + **Làm lại (Redo)** đối xứng cho cả editor hình học 2D và 3D, kèm phím tắt chuẩn (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y).

### Hiện trạng

- **2D editor**: đã có `MiniBoardHandle.undo()`, nút Undo trong `LeftPanel`, shortcut Ctrl/Cmd+Z. `creationLogRef` bị pop hẳn khi undo — không có redo stack.
- **3D editor**: `LeftPanel` đã render nút Undo + tham số `onUndo`/`canUndo` nhưng host wire `onUndo: () => {}` (TODO) và `canUndo: false` cứng. `Scene3D` không có khái niệm history.

### Phạm vi (đã chốt với user)

| | 2D | 3D |
|---|---|---|
| Undo | ✅ giữ + extend (push redo stack) | ➕ implement từ đầu (snapshot Scene3D) |
| Redo | ➕ thêm mới | ➕ thêm mới |
| Nút UI (desktop + mobile) | ➕ thêm Redo cạnh Undo | ➕ thêm Redo cạnh Undo |
| Phím tắt | Ctrl/Cmd+Z (có) + Ctrl/Cmd+Shift+Z (mới) + Ctrl+Y (mới) | Tất cả mới |
| Drag point → history entry | n/a | ✅ snapshot ở drag-start, push checkpoint ở drag-end |

## Thiết kế

### 1. 2D editor: thêm redo stack

**File:** `src/stamps/geometry-2d/editor/MiniBoard.tsx`

State mới (ref, không trigger render trực tiếp):
- `redoStackRef = useRef<SerializedElement[]>([])`

`undoLast()` đổi hành vi:
- Khi pop một entry ra khỏi `creationLogRef`, **chỉ push entry đó vào `redoStackRef` nếu nó có object thật** (tức là nhánh `if (obj) { ... return; }` đã match). Các stale entry pop trong loop (object đã biến mất do delete-cascade từ trước) bị **discard** — không push vào redoStack vì không có gì để re-create.
- Sau khi pop xong, `setHistoryTick` (đã có) để re-render → cập nhật cả `canUndo` lẫn `canRedo`.

`redoNext()` (mới):
- Pop top của `redoStackRef` → tái tạo JSXGraph object từ `SerializedElement` (`{id, type, args, attrs}`) bằng cùng pipeline mà `initialState` load đang dùng. Giữ nguyên `id` để creationLog đồng nhất.
- Push entry tái tạo lại vào `creationLogRef`.
- Một lần `redoNext()` = đúng **1 entry** (đối xứng 1-1 với 1 lần `undoLast()` thành công).
- `setHistoryTick` để re-render.

Mỗi creation mới (không phải qua redo):
- `redoStackRef.current = []` — clear redo khi user tạo nhánh history mới.

**Refactor**: trích đoạn re-create object từ `SerializedElement` (hiện inline trong `useEffect` initial-state) thành function nội bộ `recreateFromLogEntry(entry, board, objMap)` để cả load + redo dùng chung.

**MiniBoardHandle** thêm:
```ts
redo: () => void;
canRedo: () => boolean;
```

Subscribe callback (đã có `subscribe(emitState)`) sẽ tự bắn khi `historyTick` đổi → consumer nhận `canRedo` mới.

**Keyboard listener (đã có):** thêm 2 nhánh
```ts
if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && e.shiftKey) { redo; }
if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { redo; }
```
Vẫn `preventDefault + stopPropagation` capture-phase để override Excalidraw.

### 2. 2D editor: propagate state + UI

**File:** `src/stamps/geometry-2d/editor/EditorPanel.tsx`
- `GeomBoardState` thêm `canRedo: boolean`
- `emitState()` đọc thêm `h.canRedo()`
- `GeometryEditorPanelHandle` thêm `redo: () => void`

**File:** `src/stamps/geometry-2d/editor/LeftPanel.tsx`
- Thêm `RedoIcon` (mirror UndoIcon, flip horizontal)
- `GeometryLeftPanelProps` thêm `onRedo: () => void; canRedo: boolean`
- Desktop section "Bố cục": thêm button Redo bên phải Undo, cùng style, `title="Làm lại (Ctrl/Cmd+Shift+Z)"`, `aria-label="Làm lại"`
- Mobile `actions` array: thêm action thứ 2 (Redo) ngay sau Undo (consistency với desktop, khi user mở drawer)

**File:** `src/stamps/geometry-2d/editor/EditorPanel.tsx` (mobile header bar)
- `Props` thêm `onUndo?, onRedo?, canUndo?, canRedo?` (host pass xuống)
- Trong nhánh `{isMobile && ...}` của header gradient emerald-teal: thêm 2 icon-only button **Undo** + **Redo** ngay TRƯỚC button "Chèn", style đồng bộ ("inline-flex h-9 w-9 rounded transition hover:bg-white/15", disabled opacity-50)
- Icon dùng chung file `LeftPanel.tsx` (export `UndoIcon`, `RedoIcon`)

**File:** `src/Whiteboard.tsx` (hoặc nơi render `GeometryStampHost` 2D)
- Wire `canRedo` từ `GeomBoardState` xuống `LeftPanel` + `EditorPanel`, `onUndo`/`onRedo` → `editorRef.current?.undo()`/`.redo()`

### 3. 3D Scene3D: history layer

**File:** `src/stamps/geometry-3d/editor/scene/Scene3D.ts`

Thêm type internal:
```ts
type SceneSnapshot = {
  objects: ReadonlyMap<string, Scene3DObject>;  // shallow clone Map; objects coi như immutable except point.constraint
  order: readonly string[];
  counter: number;
};
```

**API mới (public):**
```ts
snapshot(): SceneSnapshot;
undo(): void;
redo(): void;
canUndo(): boolean;
canRedo(): boolean;
onHistoryChange(cb: () => void): () => void;

// Cho drag UI: lưu snapshot at drag-start, commit ở drag-end
pushUndoCheckpoint(prev: SceneSnapshot): void;

// Cho initial-state load: bypass history
withoutHistory(fn: () => void): void;
```

**Internal:**
```ts
private historyPast: SceneSnapshot[] = [];
private historyFuture: SceneSnapshot[] = [];
private historyListeners = new Set<() => void>();
private historySuspended = false;

private cloneSnapshot(): SceneSnapshot { /* deep clone đủ sâu: Map mới, objects shallow clone từng entry (vì point.constraint là mutable trong drag flow) */ }
private restore(snap: SceneSnapshot): void { /* replace state, emit 'reset', emit 'add' for each obj */ }
private capture(): void { /* if suspended: return; push current snapshot to past; clear future; notify */ }
private notifyHistoryChange(): void;
```

**Built-in mutations** tự `capture()` trước khi mutate:
- `addPoint`, `addObject`, `delete`, `reset`
- `insert(obj)` — capture by default. Initial-state path dùng `withoutHistory` để bypass.

**`undo()`:**
1. Nếu `historyPast.length === 0` → return
2. Push `snapshot()` hiện tại vào `historyFuture`
3. Pop từ `historyPast` → `restore(popped)`
4. `notifyHistoryChange()`

**`redo()`:** mirror, từ `historyFuture` → `historyPast`.

**`withoutHistory(fn)`:**
```ts
const prev = this.historySuspended;
this.historySuspended = true;
try { fn(); } finally { this.historySuspended = prev; }
```

**`pushUndoCheckpoint(prev)`:**
- Bỏ qua nếu `historySuspended`
- Push `prev` vào `historyPast`; clear `historyFuture`; notify

### 4. 3D EditorPanel: drag flow

**File:** `src/stamps/geometry-3d/editor/EditorPanel.tsx`

Thêm ref:
```ts
const dragSnapshotRef = useRef<SceneSnapshot | null>(null);
```

`shouldStartPointDrag`: khi return `true` (drag thật sự bắt đầu), set `dragSnapshotRef.current = scene.snapshot()`.

`onPointerDragEnd`:
```ts
const snap = dragSnapshotRef.current;
dragSnapshotRef.current = null;
if (snap) scene.pushUndoCheckpoint(snap);
```

(Per-frame `scene.emitChange()` không snapshot — drag chỉ ghi 1 history entry duy nhất ở end.)

**Initial-state load** (`useEffect` hiện có): bọc trong `scene.withoutHistory(() => { ... })`.

### 5. 3D JxgRenderer: handle reset event

**File:** `src/stamps/geometry-3d/editor/renderer/JxgRenderer.ts`

Verify renderer subscribe `scene.on('reset', ...)`. Nếu chưa:
- Trên reset: xoá tất cả JSXGraph object đang track + clear internal map. Subsequent `add` event sẽ tự tái dựng từng object.

Nếu đã có → giữ nguyên, chỉ xác nhận round-trip undo → restore → reset+add → JxgRenderer rebuild đúng visual.

### 6. 3D host: wire undo/redo + shortcuts

**File:** `src/stamps/geometry-3d/host.tsx`

State mới:
```ts
const [canUndo, setCanUndo] = useState(false);
const [canRedo, setCanRedo] = useState(false);
```

`useEffect` subscribe lúc mount:
```ts
const unsub = sceneRef.current.onHistoryChange(() => {
  setCanUndo(sceneRef.current!.canUndo());
  setCanRedo(sceneRef.current!.canRedo());
});
return unsub;
```

Wire vào `LeftPanel` (cả desktop và mobile):
- `onUndo={() => sceneRef.current?.undo()}`
- `onRedo={() => sceneRef.current?.redo()}`
- `canUndo={canUndo}`, `canRedo={canRedo}`

**Global keyboard listener** (mới, trong `host.tsx`):
```ts
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    const ae = document.activeElement as HTMLElement | null;
    const inField = !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));
    if (inField) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault(); e.stopPropagation();
      sceneRef.current?.undo();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && e.shiftKey) {
      e.preventDefault(); e.stopPropagation();
      sceneRef.current?.redo();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault(); e.stopPropagation();
      sceneRef.current?.redo();
    }
  };
  window.addEventListener('keydown', onKey, { capture: true });
  return () => window.removeEventListener('keydown', onKey, { capture: true });
}, []);
```

### 7. 3D LeftPanel: thêm Redo button

**File:** `src/stamps/geometry-3d/editor/LeftPanel.tsx`

- Thêm `RedoIcon` (mirror `UndoIcon`), export `UndoIcon`+`RedoIcon` để host dùng chung
- `LeftPanelProps` thêm `onRedo: () => void; canRedo: boolean`
- Desktop `Góc nhìn` section: thêm button Redo bên cạnh Undo, cùng style, `title="Làm lại (Ctrl/Cmd+Shift+Z)"`, `data-testid="redo-btn"`
- Mobile drawer `actions`: thêm action thứ 2 Redo (consistency với desktop, khi user mở drawer)

**Mobile header bar (`host.tsx` nhánh `isMobile`)**:
- Thêm 2 icon-only button **Undo** + **Redo** ngay TRƯỚC button "Chèn" trong header gradient emerald-teal
- Style giống các icon button khác trong header: `inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15 disabled:opacity-40`
- `disabled={!canUndo}` / `disabled={!canRedo}` (state đã có trong host từ subscribe)
- `data-testid="undo-btn-mobile"`, `data-testid="redo-btn-mobile"`

## Data flow

```
2D:
[user click tool/point]
  → MiniBoard creates JXG object + push creationLog
  → redoStack cleared
  → emitState (canUndo=true, canRedo=false)
  → LeftPanel buttons rerender

[user Ctrl+Z]
  → keyboard listener → undoLast
  → pop creationLog → push redoStack → b.removeObject
  → emitState (canRedo=true)

[user Ctrl+Shift+Z]
  → redoNext
  → pop redoStack → recreateFromLogEntry → push creationLog
  → emitState

3D:
[user click "Point" tool, click ground]
  → controller.consumeHit → scene.addPoint(constraint)
  → scene.capture() (push current to past, clear future)
  → mutate (objects map + order)
  → emit 'add'
  → JxgRenderer creates JXG point
  → historyChange → host setState({canUndo:true, canRedo:false})

[user drag point]
  → drag-start: dragSnapshotRef = scene.snapshot()
  → drag-move: scene.emitChange (NO history)
  → drag-end: scene.pushUndoCheckpoint(dragSnapshotRef)
  → historyChange

[user Ctrl+Z]
  → host listener → scene.undo()
  → push current → future, pop past → restore
  → emit 'reset' + 'add' for each object → JxgRenderer rebuild
  → historyChange → setState
```

## Edge cases & quyết định

| Tình huống | Xử lý |
|---|---|
| Undo khi history rỗng | No-op |
| Redo khi future rỗng | No-op |
| Mutation mới sau undo | Clear `historyFuture` / `redoStackRef` (chuẩn) |
| Initial-state load (cả 2D và 3D) | Bypass history (2D: pre-fill `creationLogRef` rồi không tính là undo-able; 3D: `scene.withoutHistory`) |
| Drag 3D không có thay đổi (mousedown rồi up không di chuyển) | Vẫn snapshot ở down nhưng `pushUndoCheckpoint` ở up — sẽ tạo no-op history entry. **Quyết định**: chấp nhận trong v1 (đơn giản); v2 có thể compare snapshot bằng deep equals để bỏ entry trùng. |
| Property mutation 2D (mutateObject patch) | Không thuộc creationLog → không undo-able trong v1. Ghi chú trong code, future work. |
| Property mutation 3D (chưa có UI nhưng có `emitChange` cho drag) | Drag = 1 entry. Các mutate khác chưa expose UI nên skip v1. |
| Window blur / editor unmount giữa drag | Drag handler cleanup tự gọi → `pushUndoCheckpoint` nếu snapshot != null |
| Memory: history vô hạn | V1 không limit. Scene 3D đến vài chục object/snapshot, tổng vài MB là trần thực tế. V2 cap ở 100 entry. |

## Testing strategy

### Unit tests mới

**`src/stamps/geometry-3d/editor/scene/__tests__/Scene3D.test.ts`** (mở rộng nếu đã có, hoặc tạo mới):
- `snapshot()` capture đầy đủ + immutable
- `addPoint` → `undo()` → trở lại trạng thái rỗng + emit 'reset'
- `addPoint` → `undo()` → `redo()` → trạng thái = sau addPoint
- 2 `addPoint` → 2 `undo()` → 1 `redo()` → có 1 point
- `addPoint` → `undo()` → `addPoint` mới → `historyFuture` rỗng (`canRedo === false`)
- `withoutHistory(() => { scene.insert(...) })` → `historyPast` không thay đổi
- `pushUndoCheckpoint(snap)` → push đúng + clear future

**`src/stamps/geometry-2d/editor/__tests__/MiniBoard.redo.test.tsx`** (mới):
- Tạo point qua handle → undo → canRedo=true
- redo → object xuất hiện lại trong `getCreationLog()`
- Tạo entry mới sau undo → redoStack cleared
- Shortcut Ctrl+Shift+Z dispatch event → object restored

**`src/stamps/geometry-2d/editor/__tests__/LeftPanel.test.tsx`** (mở rộng):
- Render với `canRedo=true` → button Redo enabled
- Click Redo → `onRedo` được gọi
- Mobile drawer: action "Làm lại" hiện trong list

**`src/stamps/geometry-3d/editor/__tests__/EditorPanel.test.tsx`** (mở rộng):
- Mock `shouldStartPointDrag` return true → `dragSnapshotRef` được set
- `onPointerDragEnd` → `scene.pushUndoCheckpoint` được gọi

**`src/stamps/geometry-3d/__tests__/host.test.tsx`** (mở rộng nếu đã có):
- Mount host → fire 'Z' với Ctrl → `scene.undo()` được gọi
- Fire Ctrl+Shift+Z → `scene.redo()` được gọi
- `canUndo`/`canRedo` propagate đúng vào LeftPanel props

### Regression

Chạy lại toàn bộ existing tests (`npm test`):
- 2D `MiniBoard.test.tsx`, `EditorPanel.test.tsx`, `LeftPanel.test.tsx`
- 3D `Scene3D.test.ts`, `EditorPanel.test.tsx`, `LeftPanel.test.tsx`, `host.test.tsx`
- Top-level `Whiteboard.test.tsx`

Mọi assertion về handle (`undo`, `canUndo`) phải vẫn pass + thêm cho `redo`, `canRedo`.

### Manual smoke test (sau khi code xong)

1. Mở 2D stamp → vẽ 3 đoạn → Ctrl+Z × 3 → 3 đoạn biến mất → Ctrl+Shift+Z × 3 → cả 3 quay lại.
2. Mở 3D stamp → tạo 2 point + 1 segment → Ctrl+Z × 3 → empty → Ctrl+Shift+Z × 3 → khôi phục.
3. Drag 1 point sang vị trí mới → Ctrl+Z → trở về vị trí cũ.
4. Mobile: header bar có 2 icon-only Undo+Redo ngay trước "Chèn", luôn hiện; tap được không cần mở drawer. Mở drawer cũng thấy 2 action tương ứng.
5. Reopen stamp đã chèn → undo/redo state khởi tạo rỗng (history không persist qua serialize — đúng).

## Files thay đổi

```
M  src/stamps/geometry-2d/editor/MiniBoard.tsx              (~+60 LoC: redoStack, redoNext, recreateFromLogEntry refactor, keyboard nhánh redo)
M  src/stamps/geometry-2d/editor/EditorPanel.tsx            (~+25 LoC: canRedo state, redo handle, mobile header undo/redo buttons)
M  src/stamps/geometry-2d/editor/LeftPanel.tsx              (~+45 LoC: RedoIcon, props, button, mobile drawer action, export icons)
M  src/Whiteboard.tsx                                       (~+5 LoC: wire canRedo/onRedo)

M  src/stamps/geometry-3d/editor/scene/Scene3D.ts           (~+90 LoC: snapshot, undo, redo, history APIs)
M  src/stamps/geometry-3d/editor/EditorPanel.tsx            (~+10 LoC: dragSnapshotRef + drag flow + withoutHistory init)
M  src/stamps/geometry-3d/editor/renderer/JxgRenderer.ts    (~+10 LoC nếu cần handle 'reset' chưa có)
M  src/stamps/geometry-3d/editor/LeftPanel.tsx              (~+45 LoC: RedoIcon, props, button, mobile drawer action, export icons)
M  src/stamps/geometry-3d/host.tsx                          (~+50 LoC: canUndo/canRedo state, subscribe, keyboard listener, mobile header undo/redo buttons, wire LeftPanel)

A  src/stamps/geometry-3d/editor/scene/__tests__/Scene3D.history.test.ts
A  src/stamps/geometry-2d/editor/__tests__/MiniBoard.redo.test.tsx
M  src/stamps/geometry-2d/editor/__tests__/LeftPanel.test.tsx
M  src/stamps/geometry-3d/editor/__tests__/LeftPanel.test.tsx
M  src/stamps/geometry-3d/editor/__tests__/EditorPanel.test.tsx
```

## Out of scope (v1)

- Property mutation (mutateObject) chưa đưa vào history — chỉ creation + delete + drag.
- Limit kích thước history stack (v1 unlimited; v2 cap 100).
- Persist history qua serialize/deserialize (history reset khi reopen stamp — đúng theo UX).
- Toolbar Excalidraw bên ngoài: không đụng. Khi editor đóng, undo/redo trở về Excalidraw mặc định.
- Undo/redo cho LaTeX stamp (chỉ render KaTeX, không có nội dung edit-step để undo).
