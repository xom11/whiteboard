// src/stamps/graph-2d/types.ts
import type { BaseStampCustomData } from '../shared/types';

export interface Graph2DCustomData extends BaseStampCustomData {
  kind: 'graph2d';
  version: 2;
  jsonState: string;
}

export function isGraph2DCustomData(data: unknown): data is Graph2DCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<Graph2DCustomData>;
  return d.kind === 'graph2d' && d.version === 2 && typeof d.jsonState === 'string';
}
