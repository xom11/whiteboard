# Thu gọn panel thuộc tính của Excalidraw

Ngày: 2026-07-29
Issue: [Hoctotbachkhoa/hoctotbachkhoa#528](https://github.com/Hoctotbachkhoa/hoctotbachkhoa/issues/528) — "Cần ẩn block hỗ trợ của bút vẽ"

## Vấn đề

Panel thuộc tính bên trái (Stroke / Background / Stroke width / Opacity / Layers) hiện
suốt khi giáo viên chọn bút hoặc shape, chiếm một dải dọc lớn của bảng nhưng ít khi
được dùng. Cần một nút thu gọn.

Panel này do Excalidraw render: `Section.selected-shape-actions` bọc `Island` mang class
`CLASSES.SHAPE_ACTIONS_MENU` (đã verify trong bundle 0.18.1: giá trị = `"App-menu__left"`),
hiện khi `showSelectedShapeActions(appState, elements)` trả về true — tức là hễ active tool
khác `selection`/`hand`/`eraser`/`laser`, hoặc có element đang chọn. Với bút vẽ thì luôn true.

## Tại sao không dùng API sẵn có của Excalidraw

Đã tra `@excalidraw/excalidraw@0.18.1` (`dist/types/excalidraw/types.d.ts:484`):

- `UIOptions` chỉ có `dockedSidebarBreakpoint`, `canvasActions`, `tools` — **không** có
  mục nào cho panel thuộc tính.
- Thứ gần nhất là **zen mode** (prop `zenModeEnabled`, hoặc phím `Alt+Z` sẵn có). Cơ chế:
  gắn class `transition-left` → `transform: translate(-999px, 0)`.
- Zen mode **ẩn nhiều hơn mức cần**: ngoài panel thuộc tính còn kéo đi `layer-ui__wrapper__footer-left`
  (**undo/redo**), `footer-right`, `top-right` (thư viện), và đổi toolbar sang dạng zen.
  Undo/redo là thao tác thiết yếu khi dạy → không chấp nhận được.
- Truyền prop `zenModeEnabled` còn khoá luôn toggle nội bộ của Excalidraw
  (`predicate: (elements, appState, appProps) => typeof appProps.zenModeEnabled === "undefined"`).

⟹ Tự làm nút thu gọn, phạm vi đúng một panel. Sửa ở repo `whiteboard` vì panel do
`<Excalidraw>` bên trong `Whiteboard.tsx` render; consumer chỉ cần bump version.

## Thiết kế

### Nguồn sự thật

Một state `propsCollapsed: boolean` trong `src/Whiteboard.tsx`, mặc định `false`.
**Không** persist (mỗi lần load lại panel hiện). Không đụng `appState` của Excalidraw,
không đụng scene / sessionStorage / IndexedDB → không ảnh hưởng persistence và sync.

### Nút toggle — đặt BÊN TRONG Island

Ràng buộc phát hiện khi lập plan: `.App-menu__left` là **`position: absolute`** (CSS gốc
của Excalidraw). Nó không chiếm chỗ trong flow của `.App-menu_top__left`, nên nếu portal
nút thành *sibling* của panel thì nút sẽ nằm ngay dưới hamburger và **đè lên panel**.
Không dùng flow layout được.

⟹ Component mới `src/ui/PropsPanelToggle.tsx` portal nút vào **bên trong** Island
`.App-menu__left`. Khi mở, nút `position: absolute` ở góc trên-phải panel; khi thu gọn,
nút về `position: static` và chính Island co lại quanh nó thành một tab nhỏ.

Icon `«` (thu) / `»` (mở), kèm `title`/`aria-label` tiếng Việt và `aria-expanded`.
Tái dùng pattern portal + `MutationObserver` của `src/pdf/PdfImporterButton.tsx`.

### Cách thu gọn

CSS thuần. Wrapper sẵn có (`src/Whiteboard.tsx:252`) thêm class `wb-props-collapsed`:

```css
.wb-props-collapsed .excalidraw .App-menu__left {
  width: auto; min-width: 0; padding: 0.25rem; overflow: visible;
}
.wb-props-collapsed .excalidraw .App-menu__left > *:not(.wb-props-toggle-mount) {
  display: none;
}
.wb-props-collapsed .excalidraw .wb-props-toggle { position: static; }
```

Tức là **không** `display: none` cả Island (làm vậy thì mất luôn nút mở lại, phải dựng
nút thứ hai và tự tính toạ độ). Thay vào đó ẩn nội dung (`.panelColumn`) và để Island
co về đúng kích thước cái nút.

### Điều kiện render nút

Nút chỉ render khi `!readOnly` **và** `.App-menu__left` đang có trong DOM. Vì nút là con
của Island nên nó sống/chết theo panel, không cần đồng bộ gì thêm:

| Tình huống | Kết quả |
|---|---|
| Mobile (dùng `App-mobile-menu`) | Không có Island → nút không render. Desktop-only, đúng phạm vi issue. |
| Tool = selection, không chọn gì | Excalidraw gỡ panel → nút biến mất (không có gì để ẩn). |
| Đang mở stamp editor (tool = `hand`) | Panel vắng → nút vắng. |
| `collapsed = true` | Island vẫn render (chỉ co lại) → nút vẫn hiện → mở lại được. |
| Chọn tool khác khi đang thu gọn | Island remount, class `wb-props-collapsed` vẫn còn → vẫn thu gọn. |
| `readOnly` (viewModeEnabled) | Panel không render → nút không render. |

### Luồng

click nút → `setPropsCollapsed(v => !v)` → wrapper đổi class → CSS ẩn/hiện panel.
Không có side effect nào khác.

## Rủi ro

Ta bám vào class nội bộ `.App-menu__left` (Island) và `.panelColumn` (nội dung panel) của
Excalidraw. Nếu 0.19 đổi tên: mất target portal → nút không hiện (fail-safe, UI về đúng như
hiện tại); hoặc `.panelColumn` đổi tên → thu gọn không ẩn hết nội dung. E2E bắt được cả hai
khi bump version.

## Test

**Jest** (`src/ui/__tests__/PropsPanelToggle.test.tsx`): dựng DOM giả có `.App-menu__left` →

- nút mount vào bên trong Island;
- click → gọi `onToggle`, `aria-expanded` đổi;
- `readOnly` / thiếu `.App-menu__left` → không render nút.

**Playwright** (`tests/e2e/props-panel-collapse.spec.ts`) — bắt buộc, theo lệ repo là phải
verify trên UI thật trước khi kết luận fix:

1. mở demo, chọn bút → `.App-menu__left` visible, chụp screenshot;
2. click nút thu → assert panel **không** visible, chụp screenshot;
3. click lại → panel visible trở lại.

## Cố ý KHÔNG làm (YAGNI)

- Không persist trạng thái (đã chốt với user).
- Không thêm prop cho consumer bật/tắt tính năng.
- Không thêm phím tắt (Excalidraw đã có `Alt+Z` cho zen mode).
- Không làm mobile (panel mobile là bottom sheet, không chiếm diện tích ngang).
- Không đụng zen mode.
