// src/stamps/graph-2d/serialize.ts
//
// graph-2d đã dùng plain State (không envelope) ngay từ đầu. Sau Tier D PR 3,
// thin wrapper qua shared helper cho serialize. parseSceneState giữ behavior
// null-on-invalid để host/index.tsx có thể discriminate "customData hỏng".

import { serializeScene } from '../shared/serializeScene';
import type { State } from '../../core/scene/types';

export function stringifySceneState(state: State): string {
  return serializeScene(state);
}

export function parseSceneState(json: string): State | null {
  if (!json) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Partial<State>;
  if (v.meta?.domain !== 'graph2d') return null;
  if (!v.meta?.view || typeof v.meta.view !== 'object') return null;
  if (typeof v.counter !== 'number') return null;
  if (!Array.isArray(v.order)) return null;
  if (!v.objects || typeof v.objects !== 'object') return null;
  return raw as State;
}
