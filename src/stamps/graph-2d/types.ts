// src/stamps/graph-2d/types.ts
import type { BaseStampCustomData } from '../shared/types';

export interface Graph2DCustomData extends BaseStampCustomData {
  kind: 'graph2d';
  version: 2;
  sceneJson: string;
  svgWidth: number;
  svgHeight: number;
}

export function isGraph2DCustomData(data: unknown): data is Graph2DCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<Graph2DCustomData>;
  return d.kind === 'graph2d' && d.version === 2 && typeof d.sceneJson === 'string';
}
