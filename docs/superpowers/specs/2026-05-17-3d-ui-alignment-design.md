# 3D Geometry Editor — Align UI với 2D Geometry

**Ngày:** 2026-05-17
**Scope:** `src/stamps/geometry-3d/editor/` + `src/stamps/geometry-3d/host.tsx`
**Trạng thái:** Approved (user auto-accept), implementation đang chạy.

## Mục tiêu

Đưa UI của 3D editor về cùng ngôn ngữ thiết kế với 2D editor để user không phải học hai flow khác nhau khi switch giữa stamp `geometry` và `geometry3d`.

## Hiện trạng (trước khi sửa)

| | 2D (`geometry-2d`) | 3D (`geometry-3d`) |
|---|---|---|
| Window | 640×540 modal | 1040×600 modal |
| Header | gradient **emerald-600 → teal-600** | gradient **blue-600 → cyan-600** |
| Nút Chèn | footer (Huỷ / Chèn) | header phải |
| LeftPanel | `Shell` w-60, section "Bố cục" + tool groups + chord + tooltip | w-280 tabbed **Tools / Algebra**, zinc palette |
| Tool icons | SVG inline (stroke 1.6, currentColor) | ký tự Unicode (`↖`, `·`, `⟷`, `△`, `◼`…) |
| Selected button | `bg-emerald-600 text-white` | `border-blue-500 bg-blue-50 text-blue-700` |
| Chord shortcut | có (`useChordShortcut`) | không |
| Hover tooltip | portal, 400ms delay | không |
| View options | Trục / Lưới / Undo trong section "Bố cục" | không |
| Mobile | `MobileToolDrawer` (hamburger + chips) | desktop layout giảm xuống |
| Footer | Huỷ + Chèn | không có |
| Algebra panel | n/a | tab riêng (đặc trưng 3D, GeoGebra-style) |

## Thiết kế đích

### 1. Host wrapper (`host.tsx`)
- Vẫn modal `1040×600` (3D cần nhiều không gian hơn cho board).
- Header: gradient `from-emerald-600 to-teal-600` + icon 3D mới (kế thừa `Geometry3DIcon` style) + title "Dựng hình học không gian" + close button.
- Trên mobile: hamburger trái + nút "Chèn" phải trong header (giống 2D mobile).
- **Bỏ nút Chèn khỏi header desktop**, chuyển xuống footer.
- Footer desktop: hint text "Chọn công cụ bên trái…" + `Huỷ` + `Chèn`.

### 2. LeftPanel (`editor/LeftPanel.tsx`)
- Desktop: dùng `Shell` (clone style từ 2D), width `w-60` (240px). Three sections:
  1. **Tabs Tools / Algebra** (giữ phân tab vì Algebra là đặc trưng riêng của 3D).
  2. **Tab Tools** chứa:
     - Section "Góc nhìn": `Trục` checkbox, `Lưới` checkbox, nút Undo.
     - Tool groups (`Cơ bản`, `Điểm`, `Đường thẳng`, `Mặt phẳng`, `Khối đa diện`, `Khối cong`) — mỗi group render grid 4-col, có chord letter, tooltip hover (reuse `useToolHoverTooltip` từ 2D, hoặc trích thành shared helper).
  3. **Tab Algebra** giữ `AlgebraList` hiện tại (zinc → slate để match palette 2D).
- Mobile: `MobileToolDrawer` (shared). Hamburger từ header host. Tools tab + Algebra toggle in-drawer.

### 3. Tool icons (`editor/toolPanel/icons.tsx` — mới)
SVG mới cho 17 tool, style đồng nhất 2D (`viewBox="0 0 24 24"`, stroke 1.6, currentColor):
move, point, pointOnObject, segment, line, ray, vector, polygon, plane, pyramid, prism, tetrahedron, cube, sphere, cylinder, cone (+ alias move-tool nếu cần).

### 4. ToolPalette + ToolButton
- Button container đổi sang style 2D: `rounded-md`, `aria-pressed`, `bg-emerald-600 text-white` khi selected, `hover:bg-slate-100` khi idle.
- Bỏ inline `width:80; height:72` → để Tailwind aspect-square layout (kích thước nhỏ giống 2D).
- Hỗ trợ chord letter overlay (`absolute bottom-0 right-0.5 font-mono text-[9px]`).

### 5. Chord shortcut cho 3D
Reuse `useChordShortcut` (shared/`useChordShortcut.ts`). Map:
- `C` → Cơ bản
- `P` → Điểm
- `L` → Đường thẳng
- `M` → Mặt phẳng
- `K` → Khối đa diện
- `V` → Khối cong

(Trùng phim với 2D không sao — chord chỉ active khi editor 3D mở; modal 2D không cùng tồn tại.)

### 6. View options (Trục / Lưới / Undo)
- `Scene3D` chưa có history → giai đoạn này dùng button Undo **disabled** + TODO inline (không scope).
- `showAxis` / `showGrid` state trong `EditorPanel`, prop forward xuống `MiniBoard3D` để tinh chỉnh `VIEW3D_ATTRS` (toggle `xAxis.visible`, `yAxis.visible`, `zAxis.visible`, và xy grid plane). Mặc định cả hai = `true`.

### 7. Footer + StatusHint
- `StatusHint` (hint + hoverLabel) vẫn ở giữa MiniBoard và footer.
- Footer desktop dùng style giống 2D.

### 8. Theme palette
- Update `editor/theme.ts` của 3D: giữ `Geom3DPalette` extra (`view3dBg`, `axisX/Y/Z`), nhưng các UI element (button, header) đọc trực tiếp class Tailwind emerald/slate giống 2D — không cần tham số.

## Phạm vi KHÔNG đụng vào

- Tool handlers (`tools/handlers/*`), `Scene3D`, `JxgRenderer`, `hitTest`, `serialize` — chỉ refactor UI shell.
- 2D editor — giữ nguyên.
- LaTeX stamp — không liên quan.
- Public API + dist/ — sẽ build lại ở bước release (ngoài scope spec này, chỉ là một bước cuối).

## Test plan

1. `npm test` — tất cả test hiện tại pass.
2. Update `__tests__/LeftPanel.test.tsx`: assert có Shell header, có section "Góc nhìn", tabs Tools/Algebra, tool button có emerald style khi pressed.
3. Update `__tests__/EditorPanel.test.tsx`: assert footer có nút "Chèn" desktop, nút "Chèn" trong header mobile.
4. `npm run typecheck` + `npm run build`.
5. Manual smoke (sau khi dev xác nhận): mở stamp 3D, switch Tools/Algebra, vẽ Point/Segment/Cube, Chèn → reopen → state preserved.

## File touch list

- `src/stamps/geometry-3d/host.tsx` — restyle header, thêm footer
- `src/stamps/geometry-3d/editor/LeftPanel.tsx` — rewrite
- `src/stamps/geometry-3d/editor/EditorPanel.tsx` — wire showAxis/showGrid props
- `src/stamps/geometry-3d/editor/MiniBoard3D.tsx` — accept showAxis/showGrid
- `src/stamps/geometry-3d/editor/toolPanel/ToolPalette.tsx` — restyle + chord aware
- `src/stamps/geometry-3d/editor/toolPanel/ToolButton.tsx` — emerald style
- `src/stamps/geometry-3d/editor/toolPanel/icons.tsx` — **mới** (SVG icon set)
- `src/stamps/geometry-3d/editor/toolPanel/chord.ts` — **mới** (map group → letter)
- `src/stamps/geometry-3d/editor/algebraPanel/AlgebraList.tsx` — palette zinc → slate
- `src/stamps/geometry-3d/__tests__/LeftPanel.test.tsx` — update assertions
- `src/stamps/geometry-3d/__tests__/EditorPanel.test.tsx` — update assertions
