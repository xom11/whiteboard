# E2E Test Findings — Geometry-3D Stamp (0.6.0)

**Ngày test:** 2026-05-15
**Phương pháp:** Vite demo (`scripts/demo/`) + Playwright MCP browser automation
**Scope:** Smoke test 1 case/tool cho 16 tools 3D
**Trạng thái:** **HALTED** — phát hiện 4 bugs trong phase mở editor + test tool đầu tiên. Khuyến nghị fix trước khi tiếp tục test 16 tools.

---

## Tóm tắt

Trong phiên test E2E đầu tiên cho geometry-3d stamp (0.6.0), em phát hiện **4 bugs** sau khi mới chạy được tool đầu tiên (Point). 1 bug đã được fix tại chỗ trong worktree test, 3 còn lại được note để fix trong hotfix `0.6.1`.

Tools đã test trong phiên này:
- ✅ **Point** — PASS (sau khi fix bug #1, #3)

Còn lại 15 tools chưa kịp test vì editor tự đóng sau commit của Point. Cần fix bug #5 (xem dưới) trước khi tiếp tục.

---

## Bugs phát hiện

### Bug #1 — `EditorPanel` infinite re-render khi MiniBoard3D mount **[FIXED tại chỗ]**

**Hiện tượng:** Bấm `D` để mở editor 3D → React error: `Maximum update depth exceeded` từ `EditorPanel.tsx:35 handleBoardReady`. Editor không render được.

**Nguyên nhân:** `BoardMount` wrapper pattern + `setBoardKey((k) => k + 1)` mỗi khi MiniBoard3D mount → re-render BoardMount → ref callback recreated → React nghĩ ref thay đổi → cleanup (gọi với null) → mount lại (gọi với handle) → vòng lặp. Đây chính là tech debt item #4 đã được note trong final review Phase B.

**Fix đã áp dụng trong test worktree:** Refactor `EditorPanel.tsx`:
- Xoá `BoardMount` wrapper, render `MiniBoard3D` trực tiếp với stable `setBoard` callback (useCallback).
- Thay `setBoardKey(k+1)` bằng `setBoardHandle` với functional-equality guard (`prev === h ? prev : h`).

Sau fix: editor mở sạch, không lỗi.

**Cần làm:** Cherry-pick fix vào main branch như hotfix `0.6.1`.

---

### Bug #2 — Shortcut `D` conflict với Excalidraw Diamond tool **[COSMETIC]**

**Hiện tượng:** Toolbar Excalidraw tooltip vẫn ghi `"Diamond — D or 3"`, mặc dù bấm `D` thực tế mở 3D editor (do `useShortcuts` capture-phase + stopPropagation win).

**Tác động:** UX confusing — học sinh hover Diamond button sẽ nghĩ phím D = Diamond, nhưng bấm D thì mở editor 3D.

**Fix đề xuất:**
- Option A: thay tooltip Diamond tool của Excalidraw qua DOM patch (giống cách `ToolbarInjector` portal).
- Option B: đổi shortcut 3D sang phím khác (vd `Shift+D`, hoặc số chưa dùng nhưng 1-9 đều bị Excalidraw chiếm).
- Option C: chấp nhận cosmetic — document trong CHANGELOG/README.

Recommendation: Option A khi có thời gian (DOM patch tooltip dễ).

---

### Bug #3 — `MiniBoard3D` không wire pointer events vào `handleToolStep` **[FIXED tại chỗ, CRITICAL]**

**Hiện tượng:** Sau khi mở editor 3D + chọn tool, click vào canvas không tạo gì. Module `handlers.ts` hoàn toàn tách rời.

**Nguyên nhân:** B6 implementer tạo `MiniBoard3D.tsx` với đầy đủ handle methods (getCreationLog, getTool, setTool…) nhưng KHÔNG có `board.on('down', …)` hoặc `addEventListener('pointerdown', …)` để gọi `handleToolStep(ctx, tool, hit)`. Toàn bộ handler logic (B7-B9) tồn tại nhưng chết.

Unit tests pass vì test gọi trực tiếp `handleToolStep(ctx, …)` chứ không qua MiniBoard3D.

**Fix đã áp dụng trong test worktree:**
- Import `createHandlerContext`, `handleToolStep`, types từ `./handlers`.
- Trong `useEffect` sau khi tạo `view3d`, tạo `HandlerContext` với `promptCoords`/`promptNumber`/`promptText` callbacks (dùng `window.prompt`), gắn `addEventListener('pointerdown', …)` vào board SVG.
- Helper `findExistingPointAt(clientX, clientY)` chấm điểm dưới chuột bằng cách so coords screen của các point3d trong `objMap` với pointer (PICK threshold 12px).
- Cleanup: removeEventListener trong return của useEffect.

Sau fix: tool Point hoạt động (verified — pointerdown → window.prompt → point3d xuất hiện trong SVG).

**Cần làm:** Cherry-pick fix vào main as hotfix `0.6.1` cùng Bug #1.

---

### Bug #4 — JSXGraph board SVG overflow sang LeftPanel **[LAYOUT]**

**Hiện tượng:** Playwright báo lỗi khi click button trong LeftPanel:
```
<path id="geom3d__...jxgBoard1G72" d=" M 324... L 315... L -140... L -50..." ... intercepts pointer events
```
Một `<path>` của JSXGraph (mesh3d hoặc bounding box) có toạ độ `x = -140` → vượt ra ngoài container → đè lên LeftPanel → block pointer events.

**Tác động:** Người dùng có thể bấm tool button bằng chuột (đè pointer-events: none), nhưng dialog auto-test (Playwright) bị block. Trong production có thể không xuất hiện nếu board bounding-box được clip — nhưng chính trong screenshot thực tế ta thấy mesh đi sang trái panel area.

**Fix đề xuất:**
- CSS `overflow: hidden` trên container của `MiniBoard3D` (`div` quanh canvas).
- Hoặc tăng `z-index` LeftPanel + `pointer-events: auto` trên LeftPanel.
- Hoặc clip JSXGraph SVG với `viewBox` chính xác.

---

### Bug #5 — Editor tự đóng sau mỗi tool action **[CRITICAL]**

**Hiện tượng:** Sau khi tool Point thành công (point3d được tạo), editor 3D tự đóng. User chỉ chèn được 1 element rồi editor commit + đóng.

**Nguyên nhân nghi ngờ:** `Whiteboard.tsx` có outside-click detector — pointerdown ngoài editor panel → tryInsert → close. Nhưng pointerdown của em phát tử SVG board của MiniBoard3D (NẰM TRONG panel) cũng đang trigger commit. Có thể:
- Detector kiểm tra `event.target` không khớp `[data-testid="geom3d-editor-panel"]` vì target là SVG inside, hoặc closest() không tìm thấy data-testid.
- Hoặc detector kiểm tra bằng coords/bounding box + SVG overflow (Bug #4) làm coords nằm ngoài.

**Tác động:** Người dùng KHÔNG THỂ thêm nhiều element trong 1 phiên — chỉ click 1 lần là editor đóng. Geometry-3d trên thực tế **không sử dụng được**.

**Fix đề xuất:**
- Kiểm tra outside-click detector trong `Whiteboard.tsx` — sửa logic kiểm tra target có nằm trong panel hoặc trong `MiniBoard3D` container không.
- Thêm `event.stopPropagation()` trong handler pointerdown của MiniBoard3D.
- Hoặc dùng portal cho EditorPanel để tách hẳn DOM tree.

---

## Phiên 2 (sau khi fix #1, #3, #4, #5) — 14 tools tested

Sau khi fix Bug #1 (re-render loop), #3 (pointer wiring), #4 (SVG overflow CSS), #5 (`data-stamp-area` missing), em chạy E2E batch lại được 14/16 tools (label skipped — cần manual point pick).

### Kết quả

| # | Tool | Result | Note |
|---|---|---|---|
| 1 | move | ✅ PASS | No-op |
| 2 | point | ✅ PASS | +1 ellipse + label, visible |
| 3 | segment | ⚠️ PARTIAL | 2 points OK, **không thấy đoạn** vẽ ra |
| 4 | line | ⚠️ PARTIAL | Same |
| 5 | plane | ✅ PASS | +1 path render, plane xám visible |
| 6 | triangle | ✅ PASS | +1 polygon visible |
| 7 | polygon | ⚠️ | Close detection chưa work với synthetic click |
| 8 | tetrahedron | ❌ FAIL | Bug #7 polyhedron3d format |
| 9 | parallelepiped | ❌ FAIL | Same |
| 10 | prism | ❌ FAIL | Same |
| 11 | pyramid | ❌ FAIL | Same |
| 12 | sphere | ✅ PASS | Sphere xanh visible đẹp |
| 13 | cone | ❌ FAIL | Same |
| 14 | cylinder | ❌ FAIL | Same |
| 15 | solidofrevolution | ❌ FAIL | Bug #8 element không tồn tại |
| 16 | label | ⏭ SKIP | Manual test |

**Visual confirmation:** screenshot `3d-after-16-tool-test.png` cho thấy:
- ✅ Points + labels A-Z (26+ điểm rải trong scene)
- ✅ Sphere xanh tròn rõ
- ✅ Plane xám (tam giác qua 3 điểm) ở upper right
- ❌ KHÔNG có line nào — segment/line tạo dữ liệu nhưng JSXGraph không render visible
- ❌ KHÔNG có khối đa diện nào — polyhedron3d API call fail
- Bug #4 partially visible: "Z" label rò rỉ sang trái LeftPanel area (axis label)

### Bugs phát hiện thêm

#### Bug #6 — `segment3d` không tồn tại trong JSXGraph 1.12.2 **[FIXED]**

JSXGraph 3D không có element `segment3d`. Đã thay bằng `line3d` với `straightFirst:false, straightLast:false`.

#### Bug #7 — `polyhedron3d` API format sai **[NOT FIXED — blocking 6 tools]**

Implementer dùng:
```ts
view.create('polyhedron3d', [facesAsPointRefs], { id })
// facesAsPointRefs = [[A, B, C], [A, B, D], ...]  // each face = array of point objects
```

JSXGraph API thực tế (theo error `Cannot read 'length' of undefined`):
```ts
view.create('polyhedron3d', [
  [[x1,y1,z1], [x2,y2,z2], ...],   // vertices array (coords, not refs)
  [[0,1,2], [0,1,3], ...]           // faces (index arrays)
])
```

**Tác động:** Tetrahedron, Parallelepiped, Prism, Pyramid, Cone, Cylinder — TẤT CẢ 6 solid/curved-approximated tools đều fail. Visual không có khối nào.

**Fix đề xuất:** Thay vì 1 `polyhedron3d` call, dùng N `polygon3d` calls (1 per face). polygon3d đã verify hoạt động (triangle test). Trade-off: nhiều objects hơn nhưng đơn giản + đã proven.

#### Bug #8 — `solidofrevolution3d` không tồn tại runtime **[NOT FIXED]**

Mặc dù tên xuất hiện trong source grep ban đầu, JSXGraph 1.12.2 runtime ném "Unknown element type given: solidofrevolution3d". Có thể element này có ở branch khác hoặc tên thực sự khác (vd `parametricsurface3d` hoặc cần camelCase).

**Fix đề xuất:** Verify với JSXGraph docs/issues. Tạm thời disable tool (remove khỏi TOOLS_3D + handlers) cho 0.6.x. Re-introduce sau khi xác định element thật sự là gì.

#### Bug #9 — `line3d` không render visible **[NOT FIXED]**

Sau khi sửa `segment3d` → `line3d`, segment/line tool tạo log entry nhưng KHÔNG vẽ đường visible. Có thể do JSXGraph view3d project line3d ra SVG element không thuộc query `path`/`polygon`/`ellipse` của em (có thể là `<g>` hoặc tag khác). Hoặc line3d cần explicit `visible: true` / stroke attrs.

**Fix đề xuất:** Thêm console-inspect SVG sau khi tạo line3d để xem nó render ra element gì. Có thể cần stroke attrs: `{ strokeColor: '#0066cc', strokeWidth: 2 }`.

#### Bug #10 — Polygon close detection fail với synthetic click

Polygon tool yêu cầu click trở lại điểm đầu để đóng. Synthetic `dispatchEvent` pointerdown không match `findExistingPointAt` PICK threshold 12px chính xác. Manual user click có thể work nhưng E2E synthetic test thì không.

**Fix đề xuất:** Tăng PICK threshold lên 16-20px hoặc thay đổi cách detect (label-based hover check).

| Tool | Đã test | Note |
|---|---|---|
| 1. Move | ✗ | (tool no-op, không cần click test) |
| 2. **Point** | ✅ PASS | Sau fix #1 #3 |
| 3. Segment | ✗ | Cần fix #5 trước (cần 2 click trong 1 phiên) |
| 4. Line | ✗ | Cần fix #5 |
| 5. Plane | ✗ | Cần fix #5 (3 click) |
| 6. Triangle | ✗ | Cần fix #5 (3 click) |
| 7. Polygon | ✗ | Cần fix #5 (n click + close) |
| 8. Tetrahedron | ✗ | Cần fix #5 (4 click) |
| 9. Parallelepiped | ✗ | Cần fix #5 |
| 10. Prism | ✗ | Cần fix #5 |
| 11. Pyramid | ✗ | Cần fix #5 (5 click) |
| 12. Sphere | ✗ | Cần fix #5 |
| 13. Cone | ✗ | Cần fix #5 (2 click) |
| 14. Cylinder | ✗ | Cần fix #5 |
| 15. Solid of revolution | ✗ | Cần fix #5 |
| 16. Label | ✗ | Cần fix #5 (cần point có sẵn) |

---

## Khuyến nghị

### Hotfix `0.6.1` — phải có trước khi consumer dùng

Priority order:

1. **Bug #5 (Editor auto-close)** — critical, blocks all multi-step tools.
2. **Bug #3 (Pointer wiring)** — critical, đã fix tại worktree test → cherry-pick.
3. **Bug #1 (Infinite re-render)** — critical, đã fix tại worktree test → cherry-pick.
4. **Bug #4 (SVG overflow)** — layout, nhưng cũng có thể là cause của Bug #5.

### Sau hotfix — chạy lại E2E

- 16 tool tests với 1 case mỗi tool (smoke test) — phiên này.
- 60-80 edge case tests (sphere zero-radius, polygon < 3 đỉnh, prism cancel, …) — phiên sau.
- Compare visual với GeoGebra 3D (`geogebra.org/3d`) — cùng tetrahedron tọa độ `(0,0,0)–(2,0,0)–(1,2,0)–(1,1,2)` → so screenshot.

### Tech debt được phát hiện

Code path `B6 MiniBoard3D ←→ B7 handlers.ts` không có integration test — chỉ unit test mỗi bên. Cho lần sau: yêu cầu integration test bắt buộc trong plan khi tách module logic ra khỏi component React.

### Demo page tồn tại

`scripts/demo/` (Vite, port 5173) là môi trường test E2E nhanh cho package này. Đã add `npm run demo` script. Có thể dùng cho dev iteration mà không cần consumer app.

---

## Artifacts

- Screenshots: `demo-initial.png`, `demo-after-css-fix.png`, `3d-editor-opened.png`, `current-state.png` (trong working dir, `.playwright-mcp/`).
- Bug #1 + #3 fixes: trong worktree `worktree-feature-geometry-3d-stamp` (đã merge); cần cherry-pick từ post-merge edits.
- Demo setup: `scripts/demo/{index.html, main.tsx, vite.config.ts, next-dynamic-shim.ts}`.
