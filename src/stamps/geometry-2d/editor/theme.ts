// Theme-aware palette cho geometry stamps.
//
// Dùng `Theme2D` từ `core/scene/render/types2d` (cùng abstraction graph-2d).
// JxgRenderer nhận theme qua constructor options và phân phối qua RenderCtx
// đến mỗi kind handler — không cần sentinel string trong attrs nữa.

import { type Theme2D } from '../../../core/scene/render/types2d';

export const themeStroke = (dark: boolean): string => (dark ? '#e2e8f0' : '#0f172a');
export const themeAxis = (dark: boolean): string => (dark ? '#cbd5e1' : '#94a3b8');
export const themeGrid = (dark: boolean): string => (dark ? '#475569' : '#e2e8f0');
export const themeLabel = (dark: boolean): string => (dark ? '#e2e8f0' : '#000000');

export function paletteFor(isDark: boolean): Theme2D {
  const stroke = themeStroke(isDark);
  return {
    stroke,
    fill: '#60a5fa',
    axis: themeAxis(isDark),
    grid: themeGrid(isDark),
    label: themeLabel(isDark),
    // Geometry-2d điểm fill = stroke color (đồng bộ chấm điểm với nét vẽ).
    pointFill: stroke,
  };
}
