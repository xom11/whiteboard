# Changelog

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
