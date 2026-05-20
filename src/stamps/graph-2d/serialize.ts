// src/stamps/graph-2d/serialize.ts
// Serialize/deserialize graph2d scene State ↔ JSON string.
// Format: plain State JSON (objects/order/counter/meta).
import type { State } from '../../core/scene/types';

/**
 * Serialize State thành JSON string để lưu vào customData.
 */
export function stringifySceneState(state: State): string {
  return JSON.stringify(state);
}

/**
 * Parse JSON string thành State. Trả về null nếu:
 * - JSON không hợp lệ
 * - domain không phải 'graph2d'
 * - thiếu các trường bắt buộc
 */
export function parseSceneState(json: string): State | null {
  try {
    const raw = JSON.parse(json);
    if (!raw || typeof raw !== 'object') return null;
    if (raw.meta?.domain !== 'graph2d') return null;
    if (raw.meta?.version !== 1) return null;
    if (typeof raw.counter !== 'number') return null;
    if (!Array.isArray(raw.order)) return null;
    if (!raw.objects || typeof raw.objects !== 'object') return null;
    return raw as State;
  } catch {
    return null;
  }
}
