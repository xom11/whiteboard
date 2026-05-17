// src/stamps/graph-2d/editor/theme.ts
export interface GraphPalette {
  axis: string;
  grid: string;
  label: string;
  background: string;
}

export function graphPaletteFor(isDark: boolean): GraphPalette {
  return {
    axis: isDark ? '#cbd5e1' : '#94a3b8',
    grid: isDark ? '#475569' : '#e2e8f0',
    label: isDark ? '#e2e8f0' : '#0f172a',
    background: isDark ? '#0f172a' : '#ffffff',
  };
}
