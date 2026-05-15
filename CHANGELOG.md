# Changelog

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
