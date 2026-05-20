// src/stamps/graph-2d/editor/theme.ts
import type { Theme2D } from '../../../core/scene/render/types2d';
import { DEFAULT_THEME_2D } from '../../../core/scene/render/types2d';

export const GRAPH_THEME_LIGHT: Theme2D = {
  ...DEFAULT_THEME_2D,
};

export const GRAPH_THEME_DARK: Theme2D = {
  ...DEFAULT_THEME_2D,
  stroke: '#f1f5f9',
  fill: '#3b82f6',
  label: '#f1f5f9',
  axis: '#475569',
  grid: '#334155',
  pointFill: '#93c5fd',
};

export function paletteFor(isDark: boolean): Theme2D {
  return isDark ? GRAPH_THEME_DARK : GRAPH_THEME_LIGHT;
}

export const FUNCTION_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#9333ea',
  '#ea580c', '#0891b2', '#db2777', '#65a30d',
] as const;

export const FUNCTION_NAMES = ['f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'] as const;
export const PARAMETER_NAMES = ['a', 'b', 'c', 'd', 'k', 't', 'm', 'n'] as const;
