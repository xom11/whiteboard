# Mobile UX/UI cho `@xom11/whiteboard`

**Ngày:** 2026-05-16
**Bối cảnh:** Người dùng yêu cầu tối ưu UI/UX cho điện thoại theo cách Excalidraw đã làm. Đây là design doc tóm tắt — implementation đã đi kèm trong cùng commit để bạn review song song.

## Vấn đề hiện tại

Cả 3 stamp editors (geometry-2D, geometry-3D, LaTeX) đang dùng layout pixel cố định, làm vỡ trải nghiệm trên điện thoại:

- **Geometry-2D Editor:** `w-[640px] max-w-[calc(100vw-280px)]` + sidebar 240px → trên màn hình < 768px chiều rộng bảng vẽ chỉ còn ~160px, không thao tác được.
- **Geometry-3D Editor:** `width: 900, height: 700` hardcoded — overflow ngang + dọc trên iPhone/Android dọc.
- **LaTeX Editor:** `w-[420px]` + sidebar 240px — bị che một phần khi tablet portrait.
- **PropertiesPopover:** Click-outside chỉ lắng nghe `mousedown` (không hỗ trợ touch / pen), position `fixed` với anchor có thể overflow viewport.
- **LeftPanel:** Tooltip dùng `mouseenter` với delay 400ms — hover-only, vô dụng trên touch.
- **Tool buttons:** `h-8` (32px) dưới ngưỡng 44px của Apple HIG cho touch target.
- **CSS:** Chưa có `touch-action: manipulation` → double-tap zoom làm gián đoạn dùng tool.

## Tham khảo Excalidraw 0.18

Khảo sát `node_modules/@excalidraw/excalidraw/dist/prod/index.css` và `types.d.ts`:

- Breakpoint: **450px** primary, **379px** extreme. Toggle class `.excalidraw--mobile` theo width.
- Mobile pattern: dropdown menu **full-width** bottom-anchored, tooltip keybinding ẩn, export modal **full-screen** với `height: calc(100vh - 5rem)`.
- Touch: `-webkit-tap-highlight-color: transparent`, `touch-action: none` cho elements cần custom gesture.
- API: expose `Device` type với `viewport.isMobile`, `editor.isMobile`, `isTouchScreen`.

## Quyết định thiết kế

### Breakpoint

- **Mobile:** width ≤ 768px (tablet portrait + phone). Excalidraw dùng 450 cho toolbar nhỏ; mình dùng 768 vì editor nội dung dày hơn nhiều — sidebar + canvas + footer cùng lúc không khả thi.
- Dùng `matchMedia('(max-width: 768px)')` thay vì window.innerWidth (auto react khi xoay device).
- Cộng thêm `matchMedia('(hover: none)')` để gate hover-only tooltips (hide trên touch).

### Layout transformation (mỗi editor)

| Phần tử | Desktop | Mobile (≤ 768px) |
|---|---|---|
| Editor panel | Centered, fixed pixels | Full-screen `inset: 0`, `100dvh` |
| LeftPanel sidebar | Always visible side-by-side | Off-canvas drawer + backdrop, toggle qua hamburger |
| Header | Title + close | Hamburger + title + Chèn (primary) + Đóng |
| Footer | Visible (hint + actions) | Hidden — actions moved to header |
| PropertiesPopover | Float near anchor | Anchor clamped to viewport (8px margin) |
| Tool buttons | 32px height | 40px height min (touch target) |
| Tooltip | Hover delay 400ms | Hidden (no-hover devices) |

`100dvh` (dynamic viewport height) thay `100vh` để xử lý iOS Safari URL bar collapse.

### Touch event support

- PropertiesPopover click-outside: `mousedown` → `pointerdown` (covers mouse + touch + pen). Whiteboard.tsx đã listen cả 2; chỉ cần fix PropertiesPopover.
- Tool buttons: thêm `touch-action: manipulation` để bỏ 300ms tap delay + ngăn double-tap zoom.
- Tap highlight: `-webkit-tap-highlight-color: transparent` cho buttons (consistent với Excalidraw).

### Drawer pattern (LeftPanel trên mobile)

- Mỗi Host (`geometry-2d/index.tsx`, etc.) quản lý `drawerOpen` state.
- LeftPanel nhận `isMobile`, `drawerOpen`, `onDrawerClose`. Khi mobile + không open: `transform: translateX(-100%)`.
- Khi open: render thêm backdrop `bg-black/40` phía sau, click backdrop = close.
- EditorPanel nhận `isMobile`, `onDrawerToggle`. Hiển thị hamburger button (☰) ở header trái khi mobile.

### Cụ thể không đụng

- KHÔNG sửa Excalidraw base toolbar (Excalidraw đã có mobile menu riêng).
- KHÔNG can thiệp JSXGraph touch handling (đã native support pinch/pan).
- KHÔNG đổi tests đã pass — chỉ thêm coverage nhỏ cho `useIsMobile` nếu hợp lý.

## Risks / trade-offs

1. **Drawer state ở Host**: cần lift state lên `index.tsx` của từng stamp, prop drilling 2 cấp. Acceptable cho 3 host (code lặp nhẹ, vẫn dễ đọc).
2. **PropertiesPopover bottom-clamp**: anchor `screenCoords` từ JSXGraph có thể bị clamp xa khỏi object → user phải scan lại. Trên mobile thì OK vì popover thường che 30-50% màn hình.
3. **Tooltip hide**: long-press tooltip không implement — đơn giản nhất là dựa label aria-label + keyboard a11y vẫn còn. Excalidraw cũng làm tương tự.
4. **Drawer pattern**: dùng CSS transform + transition, không animation library. Add 200ms ease.

## Tệp ảnh hưởng

```
NEW:
  src/stamps/shared/useIsMobile.ts

MODIFIED:
  src/stamps/shared/stamp.css           ← mobile CSS base
  src/stamps/geometry-2d/index.tsx      ← drawer state
  src/stamps/geometry-2d/editor/EditorPanel.tsx
  src/stamps/geometry-2d/editor/LeftPanel.tsx
  src/stamps/geometry-2d/editor/PropertiesPopover.tsx
  src/stamps/geometry-3d/index.tsx
  src/stamps/geometry-3d/editor/EditorPanel.tsx
  src/stamps/geometry-3d/editor/LeftPanel.tsx
  src/stamps/latex/index.tsx
  src/stamps/latex/editor/EditorPopover.tsx
  src/stamps/latex/editor/LeftPanel.tsx
```

## Verification

- `npm test` — toàn bộ tests pass (jsdom default matchMedia → desktop).
- `npm run typecheck` — không type error.
- `npm run build` — build thành công.
- Manual: mở DevTools device emulation (iPhone 14, Pixel 7, iPad Mini portrait) — kiểm tra cả 3 editor open/close, drawer trượt mượt, tool button tap OK.
