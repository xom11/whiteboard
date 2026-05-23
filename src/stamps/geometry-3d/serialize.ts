// src/stamps/geometry-3d/serialize.ts
//
// Sau Tier D PR 3: customData.jsonState chỉ chứa `JSON.stringify(state)`.
// View info (bbox3D/azimuth/elevation) nằm trong `state.meta.view` (View3D shape).
//
// Type guard `isGeometry3DCustomData` giữ ở đây để index.tsx + host import từ
// 1 chỗ.

import { serializeScene, deserializeScene } from '../shared/serializeScene';
import type { State, View3D } from '../../core/scene';
import type { BaseStampCustomData } from '../shared/types';

export interface Geometry3DCustomData extends BaseStampCustomData {
  kind: 'geometry3d';
  version: 2;
  jsonState: string;
}

export function isGeometry3DCustomData(data: unknown): data is Geometry3DCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<Geometry3DCustomData>;
  return (
    d.kind === 'geometry3d' &&
    d.version === 2 &&
    typeof d.jsonState === 'string'
  );
}

export function serializeBoard3D(state: State, view: View3D): string {
  const withView: State = {
    ...state,
    meta: { domain: '3d', version: state.meta.version, view },
  };
  return serializeScene(withView);
}

export function deserializeBoard3D(raw: string): State {
  return deserializeScene('3d', raw);
}
