# 3D SVG export spike — kết quả

**Ngày chạy:** (điền sau)
**JSXGraph version:** 1.12.x (deps hiện có)
**Người chạy:** (user)

## Cách chạy

Mở file `scripts/spike-jsxgraph-3d.html` trong Chrome / Firefox / Safari (file:// hoặc local server). Quan sát phần `#stats` và `#out`.

## Kết quả

| Element | SVG markup? | Số node | Ghi chú |
|---|---|---|---|
| Tổng `<svg>` xuất hiện | (YES/NO) | — | Nếu NO → renderer fallback canvas, Option B |
| `<polygon>` (tetrahedron + parallelepiped) | (YES/NO) | (số) | |
| `<ellipse>` hoặc `<circle>` (sphere outline) | (YES/NO) | (số) | |
| `<text>` (point labels A, B, C, D) | (YES/NO) | (số) | `JXG.Options.text.display = 'internal'` đã set |
| `<image>` (raster fallback) | (YES/NO) | (số) | Nếu có → JSXGraph đang rasterize 1 phần |

## Quyết định

- [ ] **Option A — SVG OK**: pipeline SVG dùng nguyên như geometry-2d. Tiếp tục Phase B với render.ts dùng `'renderer:svg'` và clone `<svg>` outerHTML.
- [ ] **Option B — SVG fail / partial**: fallback PNG dataURL. `MiniBoard3D.snapshotSVG()` → `snapshotPNG()` dùng `canvas.toDataURL('image/png')`. Render offscreen wrapper `<svg><image href="data:image/png;base64,..." /></svg>`. Cập nhật spec `§5.6` + thêm task B-extra cho fallback.

## Action items

(điền sau khi chạy)
