// src/core/scene/render/types2d.ts
import type { RenderCtx } from '../types';

export type Theme2D = {
  stroke: string;
  fill: string;
  label: string;
  axis: string;
  grid: string;
  pointFill: string;
};

export const DEFAULT_THEME_2D: Theme2D = {
  stroke: '#0f172a',
  fill: '#60a5fa',
  label: '#0f172a',
  axis: '#94a3b8',
  grid: '#e2e8f0',
  pointFill: '#1e40af',
};

export type RenderCtx2D = RenderCtx & {
  theme: Theme2D;
};
