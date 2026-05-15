# Geometry Tools Audit & Object Selection — Design (2026-05-15)

## Bối cảnh

`JSXGraphMiniBoard` hiện có 27 tools (di chuyển, điểm, đoạn thẳng, đường thẳng, tia, vector, vuông góc, song song, đa giác, đường tròn, đo lường, biến hình…). User báo lỗi cụ thể với tool **đoạn thẳng**:

> Click vào 1 điểm → click vào không gian trống → bị lỗi (đáng lẽ phải tạo điểm mới rồi vẽ đoạn). Click vào điểm khác thì nối 2 điểm — case này có thể đang đúng.

Mặc nhiên còn bug ở các tool khác chưa khảo hết. User cũng muốn thêm **chức năng chọn đối tượng** (selection) tương tự GeoGebra.

## Mục tiêu

1. Mỗi tool phải work với cả "click điểm có sẵn" và "click không gian trống → tự tạo điểm mới" (trừ những tool yêu cầu nghiêm ngặt như `midpoint` cần 2 điểm sẵn).
2. Phát hiện + fix bug khác (live preview, polygon close-loop, transform replay, ESC cancel…).
3. Thêm tool **Object Selection** (multi-select, marquee, bulk delete, group drag).
4. Giữ Jest test xanh, không hồi quy.

## Phạm vi

- ✅ JSXGraphMiniBoard + tool catalog
- ✅ Demo harness (`examples/playground/`)
- ✅ E2E test qua Playwright MCP
- ❌ KHÔNG đụng LaTeX editor
- ❌ KHÔNG đụng Excalidraw base behavior

## Approach

### Test infrastructure

- **Demo harness**: `examples/playground/` — Vite + React + TS, mount `ExcalidrawWhiteboardView`. Có button "Open Geometry Editor" để render thẳng `JSXGraphMiniBoard` (đỡ phải qua Excalidraw mỗi vòng). Dev server 5173.
- **Playwright MCP**: navigate localhost:5173, dùng `browser_evaluate` để inject helper gọi trực tiếp board API (lấy ra `JXG.JSXGraph.boards`) nhằm xác nhận state, dùng `browser_click` cho UI test.

### Reference: GeoGebra

1 lần survey navigate `geogebra.org/geometry`, screenshot từng tool, ghi behavior vào `docs/superpowers/specs/2026-05-15-geogebra-behavior-notes.md`:
- Click empty space khi cần điểm → tự tạo?
- Live preview giữa các click?
- Snap khi gần điểm có sẵn?
- ESC/right-click cancel?
- Snap distance threshold?

### Loop per tool

Cho mỗi tool trong TOOLS[]:
1. **Test happy path**: click đúng số object cần, expect output đúng loại
2. **Test edge — click empty**: nếu tool accept point, click empty phải tạo điểm
3. **Test edge — ESC**: ấn ESC giữa chừng phải clear pending state
4. **Test edge — click cùng object 2 lần**: phải reject hoặc fall through hợp lý
5. So sánh với geogebra notes → tìm gap
6. Fix bug → re-run → viết Jest regression cạnh `__tests__/`
7. Commit `fix(stamp): <tool> <gist>` + push main

### Object Selection feature

- Icon: mũi tên hollow (khác Move). Group: `move` (cùng nhóm).
- State: `selectedIds: Set<string>`
- Click 1 object: `selectedIds = {id}`
- Shift+click: toggle id trong set
- Click empty (no drag): `selectedIds = {}`
- Drag empty space: marquee rectangle, on release select tất cả object trong khung
- Render halo: outline 2px dashed accent color (xanh aqua) bao quanh selected
- DEL key: xoá tất cả selected (cascade-aware như delete tool)
- Drag selected point: di chuyển cả nhóm cùng delta

## Risks

- **GeoGebra paywall/login**: fallback dùng general knowledge
- **JSXGraph re-render lag với halo**: nếu chậm, throttle/redraw on idle
- **Demo harness build conflict**: link `file:..` (relative path) thay vì `link:..` để bypass workspace resolution

## Stopping criterion

- 27 tools pass happy path + 2 edge cases (click-empty, ESC)
- Object Selection feature work
- `npm test` green
- `npm run typecheck` green
- Console không error khi click qua các tool
- Tự đánh giá UX so với geogebra: không kỳ cục, hợp lý

## Test plan (artefacts)

- `examples/playground/` — demo app
- `docs/superpowers/specs/2026-05-15-geogebra-behavior-notes.md` — observed geogebra behaviors
- `src/stamp/__tests__/JSXGraphMiniBoard.tools.test.tsx` — Jest regression suite per tool
- Commit + push per fix
