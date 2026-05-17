import type { BaseStampCustomData } from '../shared/types';

export interface LatexCustomData extends BaseStampCustomData {
  kind: 'latex';
  version: 1;
  src: string;
  displayMode: boolean;
}

export function isLatexCustomData(data: unknown): data is LatexCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<LatexCustomData>;
  return d.kind === 'latex' && d.version === 1 && typeof d.src === 'string';
}
