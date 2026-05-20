// src/stamps/geometry-3d/serialize.ts
import type { State } from '../../core/scene';
import { migrateState, createEmptyState } from '../../core/scene';
import type { BaseStampCustomData } from '../shared/types';

/**
 * View info giữ lại trong format mới để khi re-edit khôi phục được azimuth/
 * elevation/bbox3D mà user đã thiết lập trong editor. Spec PR 1.4.1 chỉ yêu
 * cầu `{version, state}`, nhưng nếu drop view thì re-edit sẽ về DEFAULT_VIEW3D
 * → UX regression. Ta giữ view ở envelope cấp trên, ngoài State.
 */
export type SerializedView3D = {
  azimuth: number;
  elevation: number;
  bbox3D: [number, number, number, number, number, number];
};

export type SerializedBoard3D = {
  version: 2;
  state: State;
  view?: SerializedView3D;
};

export interface Geometry3DCustomData extends BaseStampCustomData {
  kind: 'geometry3d';
  version: 1 | 2;
  jsonState: string;
  svgWidth: number;
  svgHeight: number;
}

export function isGeometry3DCustomData(data: unknown): data is Geometry3DCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<Geometry3DCustomData>;
  return (
    d.kind === 'geometry3d' &&
    (d.version === 1 || d.version === 2) &&
    typeof d.jsonState === 'string'
  );
}

/** Đóng gói State (+ view tuỳ chọn) thành envelope v2 để lưu jsonState. */
export function serializeBoard3D(state: State, view?: SerializedView3D): SerializedBoard3D {
  return view ? { version: 2, state, view } : { version: 2, state };
}

/**
 * Giải mã envelope v2 thành State. Nếu format không nhận diện (vd v1 cũ), trả
 * về State rỗng theo spec PR 1.4.1.
 */
export function deserializeBoard3D(raw: unknown): State {
  if (raw && typeof raw === 'object' && (raw as { version?: unknown }).version === 2) {
    return migrateState((raw as { state: State }).state);
  }
  console.warn('[3d/serialize] format không nhận diện, dùng state rỗng');
  return createEmptyState('3d');
}

/**
 * Trả về cả state lẫn view info nếu có (giúp render.ts + host khôi phục
 * azimuth/elevation/bbox3D khi re-edit hoặc render SVG offscreen).
 */
export function parseSerializedBoard3D(
  raw: unknown,
): { state: State; view?: SerializedView3D } {
  if (raw && typeof raw === 'object' && (raw as { version?: unknown }).version === 2) {
    const envelope = raw as Partial<SerializedBoard3D>;
    const state = envelope.state ? migrateState(envelope.state) : createEmptyState('3d');
    return envelope.view ? { state, view: envelope.view } : { state };
  }
  return { state: createEmptyState('3d') };
}
