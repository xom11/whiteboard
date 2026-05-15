// Theme-aware palette cho geometry stamps.
//
// Creation log của JSXGraphMiniBoard lưu attrs dưới dạng "sentinel" string
// (`@stroke`, `@axis`, `@grid`, `@label`) thay vì màu cụ thể. Khi:
//   1. Editor render real-time → resolve theo `isDark` của editor.
//   2. Offscreen re-render (sau reload / sau khi switch theme) → resolve theo
//      `isDark` của canvas Excalidraw hiện tại.
//
// Nhờ vậy stamp tự đổi màu khi user switch dark/light, giống các nét vẽ
// native của Excalidraw.

export const themeStroke = (dark: boolean) => (dark ? '#e2e8f0' : '#0f172a');
export const themeAxis = (dark: boolean) => (dark ? '#cbd5e1' : '#94a3b8');
export const themeGrid = (dark: boolean) => (dark ? '#475569' : '#e2e8f0');
export const themeLabel = (dark: boolean) => (dark ? '#e2e8f0' : '#000000');

export interface GeomPalette {
  stroke: string;
  axis: string;
  grid: string;
  label: string;
}

export function paletteFor(isDark: boolean): GeomPalette {
  return {
    stroke: themeStroke(isDark),
    axis: themeAxis(isDark),
    grid: themeGrid(isDark),
    label: themeLabel(isDark),
  };
}

const SENTINEL_MAP: Record<string, keyof GeomPalette> = {
  '@stroke': 'stroke',
  '@axis': 'axis',
  '@grid': 'grid',
  '@label': 'label',
};

/**
 * Walk attrs object/array/string và thay sentinel bằng màu thực từ palette.
 * Đệ quy để hỗ trợ nested attrs (ví dụ polygon's `borders.strokeColor`).
 * Trả về object mới — input giữ nguyên (immutable, an toàn cho log).
 */
export function resolveAttrColors<T>(attrs: T, palette: GeomPalette): T {
  if (typeof attrs === 'string') {
    const key = SENTINEL_MAP[attrs];
    return (key ? palette[key] : attrs) as T;
  }
  if (Array.isArray(attrs)) {
    return attrs.map((a) => resolveAttrColors(a, palette)) as unknown as T;
  }
  if (attrs && typeof attrs === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(attrs as Record<string, unknown>)) {
      out[k] = resolveAttrColors(v, palette);
    }
    return out as T;
  }
  return attrs;
}
