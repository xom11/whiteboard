import type { BaseStampCustomData } from '../shared/types';

export interface GeometryCustomData extends BaseStampCustomData {
  kind: 'geometry';
  version: 1;
  jsonState: string;
}

export function isGeometryCustomData(data: unknown): data is GeometryCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<GeometryCustomData>;
  return d.kind === 'geometry' && d.version === 1 && typeof d.jsonState === 'string';
}
