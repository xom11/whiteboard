# Changelog

## 0.6.1 — 2026-05-15

### Fixed (geometry-3d E2E hotfixes)
- **Bug #4** — JSXGraph mesh3d/bounding-box SVG path tràn sang LeftPanel chặn pointer events. `overflow: hidden` trên `MiniBoard3D` container.
- **Bug #7** — `view.create('polyhedron3d', [facesAsRefs], ...)` crash trong JSXGraph 1.12 (`Cannot read 'length' of undefined`). Refactor `finishPolyhedron` → emit N `polygon3d` per face. Unblocks 6 tools: tetrahedron, parallelepiped, prism, pyramid, cone, cylinder.
- **Bug #9** — `line3d` mặc định không vẽ stroke trong view3d projection. Thêm `strokeColor`/`strokeWidth`/`visible:true`/`fixed:true`. Segment + line giờ render visible.
- **Bug #10** — `findExistingPointAt` đọc `obj.coords.scrCoords` luôn `undefined` (point3d không có property này — phải đọc từ `obj.element2D.coords.scrCoords`). Polygon/prism/pyramid close detection + label anchor giờ hoạt động đúng.
- **Bug #11** — `view.create('text3d', [pointRef, text], …)` silently render empty. JSXGraph 1.12 yêu cầu `[[x,y,z], text]` hoặc `[x,y,z,text]`. Switch sang literal coords (anchored qua `pushedPointCoords` map).
- PICK threshold 12 → 18px để click hit-test rộng rãi hơn.

### Removed
- **Tool `solidofrevolution`** (Bug #8) — `solidofrevolution3d` không tồn tại trong JSXGraph 1.12.2 runtime. Tool palette 16 → 15 tools. Có thể re-introduce sau khi xác định element name đúng.

### Verified
- E2E batch (Vite demo + Playwright synthetic clicks) — 14/14 active tools render visible artifacts, editor không tự đóng across ~50 clicks, 0 console errors.
- 157/157 unit tests pass.

## 0.6.0 — 2026-05-15

### Added
- **Geometry-3D stamp** (`geometry3dStamp`) — hình học không gian lớp 11/12 dùng JSXGraph 3D primitives. Shortcut `D`. Tool palette 16 tools:
  - Cơ bản: điểm, đoạn thẳng, đường thẳng, mặt phẳng, tam giác, đa giác
  - Khối đa diện: tứ diện, hình hộp, lăng trụ, chóp
  - Khối cong: mặt cầu, hình nón, hình trụ, khối tròn xoay
  - Khác: nhãn
- Roundtrip edit qua creation-log JSON: double-click stamp → reopen editor với state cũ + có thể đổi góc nhìn.
- Snapshot SVG (cùng pipeline với 2D + LaTeX) khi commit. View state (azimuth, elevation, bbox3D) lưu trong customData.
- Auto-regenerate SVG file sau reload qua `StampType.restoreFileFromCustomData`.

### Removed (breaking changes — xoá alias @deprecated từ 0.5.0)
- `isMathStamp` xoá — dùng `isStampElement` (đã có trong 0.5.0).
- `MathStampCustomData` xoá — dùng `StampCustomData` (đã có trong 0.5.0).
- `restoreMissingMathStampFiles` xoá — dùng `restoreMissingStampFiles` (đã có trong 0.5.0).

Consumer migration: nếu vẫn dùng tên cũ, đổi sang tên mới trước khi bump.

## 0.5.0 — 2026-05-15

### Reorganized
- Đổi `src/stamp/` → `src/stamps/` (registry-driven, by-feature). Mỗi stamp tự đóng gói trong `geometry-2d/`, `latex/`. Common code ở `shared/`.
- Tách `JSXGraphMiniBoard.tsx` (1654 dòng) thành `MiniBoard.tsx` (1289 dòng) + `tools.tsx` (224 dòng) + `handlers.ts` (482 dòng). Theme đã có sẵn ở `theme.ts`. styles.ts không tách (toàn bộ attribute construction nằm trong `useCallback` body, không có pure helper để move).

### Renamed (consumer action: dùng tên mới, alias `@deprecated` sẽ xoá ở 0.6.0)
- `isMathStamp` → `isStampElement`
- `MathStampCustomData` → `StampCustomData`
- `restoreMissingMathStampFiles` → `restoreMissingStampFiles`

### Added
- `StampType.restoreFileFromCustomData?` — mỗi stamp tự khai báo cách regenerate SVG file khi reload từ persisted snapshot. `restoreMissingStampFiles` giờ ưu tiên path này; legacy `renderSvgFromCustomData` vẫn được giữ làm fallback cho stamp chưa migrate (sẽ xoá ở 0.6.0).
- Public barrel `src/stamps/index.ts` re-export sạch.
