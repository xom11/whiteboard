// src/core/scene/render/types.ts
import type { RenderCtx } from '../types';

export type Theme3D = {
  point: { size: number; color: string };
  line: { strokeWidth: number; color: string };
  plane: { fillOpacity: number; color: string };
};

export const DEFAULT_THEME_3D: Theme3D = {
  point: { size: 4, color: '#1e40af' },
  line: { strokeWidth: 2, color: '#0f172a' },
  plane: { fillOpacity: 0.15, color: '#60a5fa' },
};

export type RenderCtx3D = RenderCtx & {
  theme: Theme3D;
};
