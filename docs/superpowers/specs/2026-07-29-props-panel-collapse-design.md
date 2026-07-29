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

### Cách ẩn

CSS thuần. Wrapper sẵn có (`src/Whiteboard.tsx:252`) thêm class khi collapsed:

```css
.wb-props-collapsed .excalidraw .App-menu__left { display: none; }
```

### Nút toggle

Component mới `src/ui/PropsPanelToggle.tsx`, portal vào `.App-menu_top__left` — Stack
chứa nút hamburger + panel thuộc tính, luôn tồn tại trên desktop. Nút là con cuối của
stack nên **tự** nằm dưới panel khi panel hiện, và tụt lên ngay dưới hamburger khi panel
bị ẩn: không tính toạ độ tay, không lệch khi panel cao/thấp theo tool đang chọn.

Icon `«` (thu) / `»` (mở), kèm `title` tiếng Việt và `aria-expanded`.

Tái dùng pattern portal + `MutationObserver` của `src/pdf/PdfImporterButton.tsx`.

### Điều kiện render nút

Nút chỉ render khi `!readOnly` **và** `.App-menu__left` đang có trong DOM. Hệ quả:

| Tình huống | Kết quả |
|---|---|
| Mobile (dùng `App-mobile-menu`) | Không có target → nút không render. Desktop-only, đúng phạm vi issue. |
| Tool = selection, không chọn gì | Excalidraw gỡ panel → nút biến mất (không có gì để ẩn). |
| Đang mở stamp editor (tool = `hand`) | Panel vắng → nút vắng. |
| `collapsed = true` | Panel vẫn trong DOM (chỉ `display:none`) → nút vẫn hiện → mở lại được. |
| `readOnly` (viewModeEnabled) | Panel không render → nút không render. |

### Luồng

click nút → `setPropsCollapsed(v => !v)` → wrapper đổi class → CSS ẩn/hiện panel.
Không có side effect nào khác.

## Rủi ro

Ta bám vào class nội bộ `.App-menu__left` và `.App-menu_top__left` của Excalidraw. Nếu
0.19 đổi tên: mất target portal → nút không hiện (fail-safe, UI về như cũ); hoặc đổi class
Island → nút hiện nhưng bấm không ăn. E2E bắt được cả hai khi bump version.

## Test

**Jest** (`src/ui/__tests__/PropsPanelToggle.test.tsx`): dựng DOM giả có
`.App-menu_top__left` + `.App-menu__left` →

- nút mount vào đúng stack;
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
