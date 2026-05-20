# Geometry 2D — tab "Đối tượng" trong LeftPanel (mirror 3D)

**Ngày**: 2026-05-20
**Trạng thái**: Draft → chờ user review
**Người soạn**: Brainstorming session

## Bối cảnh

`@xom11/whiteboard` đang có hai stamp hình học: 2D và 3D. Sau Scene v2 (Phase 1, v0.12.0), cả hai stamp dùng chung core store ở `src/core/scene/` và component `ObjectListPanel` ở `src/core/scene/ui/`.

3D LeftPanel hiện đã đặt `ObjectListPanel` vào một tab "📐 Đối tượng" nằm cạnh tab "🧰 Công cụ" — UX gọn, nhất quán với GeoGebra. 2D LeftPanel thì chưa: `ObjectListPanel` đang treo bên phải MiniBoard như một cột riêng (`w-56 border-l`, dòng 237-245 của `EditorPanel.tsx`), tốn chiều ngang và đặc biệt rất chật trên mobile.

Mục tiêu là đưa 2D về cùng pattern UX với 3D — và trong quá trình đó, gom phần shell + tab pill về một component chung để 2D/3D không drift về sau.

## Mục tiêu

- 2D LeftPanel có 2 tab "🧰 Công cụ" / "📐 Đối tượng" giống 3D.
- Trên desktop, bỏ cột phải hiện tại ở `EditorPanel.tsx` (2D) — MiniBoard chiếm toàn bộ chiều ngang.
- Trên mobile, drawer có 2 tab tương ứng. Tính năng này bật cho cả 2D và 3D (cùng hưởng cải tiến).
- Shell + tab pill được trích thành component shared ở `src/core/scene/ui/LeftPanelShell.tsx`. 2D và 3D đều consume — không có drift trong tương lai.
- Hành vi rename/đổi màu giữ stub như hiện tại (Phase 3, ngoài scope). Toggle visible/locked + Delete vẫn chạy như cũ.

## Phi mục tiêu

- Không sửa nội bộ `ObjectListPanel`/`ObjectRow`/`ObjectRowMenu`. Chỉ tái sử dụng.
- Không thêm chức năng rename/changeColor (Phase 3).
- Không đụng `pdf/`, `latex/`, scene store reducer, hoặc serialize layer.
- Không thêm keyboard shortcut chuyển tab (YAGNI).

## Architecture

```
src/core/scene/ui/
├── LeftPanelShell.tsx        ← MỚI: Shell + TabPill + Section, source-of-truth UI
├── ObjectListPanel.tsx       (giữ nguyên)
├── ObjectRow.tsx             (giữ nguyên)
└── kindMeta.ts               (giữ nguyên)

src/stamps/shared/
└── MobileToolDrawer.tsx      ← MỞ RỘNG: optional prop `objectsTab`

src/stamps/geometry-2d/editor/
├── LeftPanel.tsx             ← REWRITE: consume LeftPanelShell + 2 tab
└── EditorPanel.tsx           ← Bỏ cột phải, đẩy store/selectedId lên LeftPanel qua Host

src/stamps/geometry-3d/editor/
└── LeftPanel.tsx             ← REFACTOR: thay Shell/TabPill local bằng import từ shell

src/stamps/geometry-2d/index.tsx + geometry-3d/index.tsx (Host)
                                ← THÊM props mới để bubble store + selection
```

Cho phép dọn dẹp code trùng lặp cũ (Shell/TabPill/Section, undo/redo icon) trong cùng PR, miễn không kéo theo refactor không liên quan.

## Components & props

### `LeftPanelShell` (mới)

`src/core/scene/ui/LeftPanelShell.tsx`. Export:

```ts
export interface TabSpec<K extends string = string> {
  key: K;
  label: React.ReactNode; // ví dụ "🧰 Công cụ"
  testId?: string;
}

export interface LeftPanelShellProps<K extends string = string> {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  isDark?: boolean;
  /** Có thì render tab row dưới header. Không có hoặc length < 2 → không render row. */
  tabs?: readonly TabSpec<K>[];
  activeTab?: K;
  onTabChange?: (k: K) => void;
  children: React.ReactNode; // body của tab hiện hành — parent quyết định
}

export function LeftPanelShell<K extends string>(props: LeftPanelShellProps<K>): React.ReactElement;
export function TabPill(props: {
  active: boolean;
  onClick: () => void;
  testId?: string;
  children: React.ReactNode;
}): React.ReactElement;
export function Section(props: { label: string; children: React.ReactNode }): React.ReactElement;
```

Stateless. Layout: `<aside role="complementary" className="w-60 ...">` → header (gradient + title + close X) → optional tab row (`role="tablist"`) → body (`role="tabpanel"`, scrollable). Style copy 1-1 từ `Shell` cục bộ trong `geometry-3d/editor/LeftPanel.tsx`.

### `MobileToolDrawer` (mở rộng)

`src/stamps/shared/MobileToolDrawer.tsx`. Thêm prop optional:

```ts
objectsTab?: {
  label: React.ReactNode;          // mặc định "📐 Đối tượng"
  render: () => React.ReactNode;   // <ObjectListPanel store={...} />
};
```

Hành vi:
- Khi `objectsTab` không truyền: behaviour cũ — chỉ tools (zero regression).
- Khi `objectsTab` truyền: drawer body render row TabPill ở trên, state nội bộ `mobileTab: 'tools' | 'objects'`. Tab `tools` hiển thị groups như cũ; tab `objects` gọi `objectsTab.render()`.
- Mỗi lần `drawerOpen` chuyển `false → true`: reset `mobileTab` về `'tools'`. Lý do: tool chọn là hành động chính khi mở drawer.

### `geometry-2d/editor/LeftPanel.tsx`

Thêm props mới (mirror 3D):

```ts
store?: Store;                              // null → ẩn tab "Đối tượng"
selectedObjectId?: string;
onObjectSelect?: (id: string) => void;
```

Desktop:
- `<LeftPanelShell title="Hình học" icon={GeometryIconHeader} tabs={…} activeTab={…} onTabChange={…}>` 
- `tabs` = `[{key:'tools', label:'🧰 Công cụ'}, {key:'objects', label:'📐 Đối tượng'}]`. Nếu `!store` thì truyền `tabs={undefined}` → không có tab row, body chỉ render tools.
- Body tab `tools`: Section "Bố cục" (axis/grid + undo/redo) + tool palette + chord hint — giữ nguyên cấu trúc hiện tại, chỉ rút gọn để bỏ `Shell` cục bộ.
- Body tab `objects`: `<ObjectListPanel store={store!} selectedId={selectedObjectId} onSelect={onObjectSelect} />`.

Mobile:
- `<MobileToolDrawer …` truyền `objectsTab={ render: () => <ObjectListPanel store={store!} … /> }` khi `store` có. Khi không có, không truyền (drawer giữ behaviour cũ).

### `geometry-3d/editor/LeftPanel.tsx`

Refactor không thay đổi UX:
- Xoá định nghĩa `Shell`, `TabPill`, `Section` cục bộ.
- `DesktopPanel` đổi sang dùng `<LeftPanelShell tabs={[…]} activeTab={tab} onTabChange={setTab}>` — thân của 2 tab tách thành 2 nhánh dựa trên `tab`.
- `MobilePanel` truyền `objectsTab` cho `MobileToolDrawer` (đây là feature add cho 3D mobile, khớp ý "UX 2D-3D giống nhau").

### `geometry-2d/editor/EditorPanel.tsx`

Bỏ block:

```tsx
{sceneStoreRef.current && (
  <div className="w-56 border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto">
    <ObjectListPanel store={sceneStoreRef.current} selectedId={selectedId} onSelect={handleSelectObject} />
  </div>
)}
```

→ MiniBoard wrapper `<div className="flex-1">` chiếm toàn bộ chiều ngang phần body.

Đổi `sceneStoreRef` (ref) → `sceneStore` (state) để LeftPanel ở parent re-render khi store ready. Bubble lên parent (Host) qua một prop callback mới (`onStoreReady?: (s: Store) => void`), hoặc đẩy chung qua `onStateChange` đã có nếu shape cho phép — quyết định cụ thể trong implementation plan.

`handleSelectObject` (gọi `handleRef.current?.highlight(id)`) vẫn ở `EditorPanel`, nhưng exposed ra parent qua `useImperativeHandle` hoặc một prop callback. Host nhận id từ LeftPanel, gọi xuống. Chi tiết cách wire để plan quyết.

### Host (`geometry-2d/index.tsx`)

Lifted state mới: `sceneStore` + `selectedObjectId`. Pass xuống LeftPanel (props mới) + nhận callback từ EditorPanel để cập nhật. Pattern này giống cách Host hiện đã lift `activeTool`, `showAxis`, ... — nên không tạo concept mới.

## Data flow

```
MiniBoard.useSceneStore() ──► EditorPanel.handleReady() ──► Host.sceneStore (state)
                                                                │
                                                                ▼
                                                    LeftPanel.props.store
                                                                │
                                                                ▼
                                          ObjectListPanel (useSyncExternalStore)
                                                                │ user click row
                                                                ▼ onSelect(id)
                                                    Host.onObjectSelect(id)
                                                                │
                                                                ▼
                                              EditorPanel.imperative.highlight(id)
                                                                │
                                                                ▼
                                                    MiniBoard.handle.highlight(id)
```

## Edge cases

1. **Store chưa ready khi LeftPanel mount**: `store` undefined → LeftPanel truyền `tabs={undefined}` → render giống behaviour cũ (chỉ tools). Khi `handleReady` fire (sau khi MiniBoard mount), Host setState → re-render LeftPanel với tab Đối tượng xuất hiện.
2. **Store rỗng (chưa có object nào)**: tab Đối tượng vẫn render, `ObjectListPanel` hiển thị "Chưa có đối tượng nào".
3. **Mobile drawer mở-đóng-mở**: `mobileTab` reset về `tools` mỗi lần `drawerOpen` đổi `false → true`.
4. **Re-edit stamp cũ**: state cũ deserialize → store có objects → tab Đối tượng list đầy ngay khi mở editor. Không code thêm.
5. **A11y**: `role="tablist"` cho row, `role="tab"` + `aria-selected` cho mỗi TabPill, `role="tabpanel"` cho body, `aria-controls`/`aria-labelledby` liên kết tab ↔ panel.
6. **Highlight loop**: không. LeftPanel click → callback → Host → EditorPanel.highlight → MiniBoard. ObjectListPanel rerender vì store đổi (nếu highlight có dispatch action) nhưng không re-trigger click handler.
7. **Dark mode**: prop `isDark` truyền qua `LeftPanelShell`. Class `theme--dark` áp dụng giống 3D Shell.

## Testing strategy

### Unit (Jest + jsdom)

- `src/core/scene/ui/__tests__/LeftPanelShell.test.tsx` (mới)
  - Render với 0, 1, 2 tab — verify row hiển thị khi `tabs.length >= 2`.
  - Click TabPill → `onTabChange` được gọi với key đúng.
  - Click close → `onClose`.
  - A11y: roles `complementary`, `tablist`, `tab`, `tabpanel` có mặt.

- `src/stamps/shared/__tests__/MobileToolDrawer.test.tsx` (bổ sung)
  - Khi `objectsTab` không truyền: behaviour cũ — không có tab row, render tools.
  - Khi `objectsTab` truyền: tab row có, mặc định active = `tools`, switch sang `objects` thì `objectsTab.render()` được gọi.
  - Đóng-mở drawer: `mobileTab` reset về `tools`.

### Integration

- `src/stamps/geometry-2d/editor/__tests__/LeftPanel.test.tsx` (mới hoặc bổ sung)
  - Render với store có sẵn (tạo bằng `createEmptyState('2d')` rồi dispatch ADD vài object).
  - Click tab "Đối tượng" → list xuất hiện, có rows đúng số.
  - Click 1 row → `onObjectSelect` được gọi với id đúng.

- `src/stamps/geometry-2d/__tests__/integration/re-edit-2d.test.tsx` (chỉnh nếu cần)
  - Hiện đang mount `ObjectListPanel` trực tiếp — verify không break, không cần đổi nhiều.

- `src/stamps/geometry-3d/editor/__tests__/` 
  - Nếu có test cho LeftPanel hiện tại, verify pass sau refactor. Snapshot có thể đổi (do hoán đổi cấu trúc Shell → LeftPanelShell) — accept update nếu UI không vỡ.

### Smoke

- `npm run typecheck` xanh.
- `npm test` toàn bộ xanh.

### Manual checklist

- Desktop 2D: tạo vài điểm/đoạn → mở tab "Đối tượng" → list đầy → click row → MiniBoard highlight object đó.
- Desktop 2D: re-edit stamp cũ → tab "Đối tượng" list đầy ngay khi editor mở.
- Mobile 2D (≤ 768px): mở drawer → 2 tab pill → switch → list hiển thị.
- Desktop 3D: refactor không vỡ — tab Công cụ / Đối tượng vẫn chạy.
- Mobile 3D: drawer có thêm tab Đối tượng (feature add) — xem được object.
- Dark mode 2D + 3D: cả 2 tab và body render đúng tông.

## Rủi ro

- **Refactor 3D LeftPanel khi đang stable**: 3D LeftPanel vừa được mở rộng cho mobile drawer. Trích `Shell` → `LeftPanelShell` có khả năng vỡ snapshot test 3D. Mitigation: chạy test full suite sau từng commit; rewrite snapshot nếu chỉ thay đổi nội bộ (không vỡ behaviour).
- **Store lifting qua Host**: cần verify Host hiện tại có cấu trúc lifted state phù hợp. Nếu Host phức tạp/khó modify, fallback: render LeftPanel bên trong EditorPanel (bỏ qua Host) — Section Architecture sẽ cập nhật trong plan nếu phương án 1 không khả thi.
- **Mobile drawer 3D có thêm tab Đối tượng**: thay đổi behavior mobile 3D. Đã thống nhất với user (UX 2D-3D giống nhau).

## Out of scope cho lần này

- Wire rename/changeColor cho ObjectRowMenu (Phase 3 cũ vẫn nguyên).
- Keyboard shortcut chuyển tab.
- Object search/filter trong list.
- Multi-select objects.

## Acceptance criteria

1. 2D LeftPanel desktop có 2 tab "🧰 Công cụ" / "📐 Đối tượng" — switch hoạt động.
2. 2D EditorPanel desktop không còn cột phải `w-56`; MiniBoard chiếm full width.
3. 2D LeftPanel mobile drawer có 2 tab tương ứng.
4. 3D LeftPanel desktop + mobile giữ feature parity, không regression.
5. `Shell`/`TabPill`/`Section` chỉ định nghĩa 1 lần ở `src/core/scene/ui/LeftPanelShell.tsx`; 2D + 3D consume từ đó.
6. `npm run typecheck` + `npm test` xanh.
7. Manual checklist (mục Testing) tick hết.
