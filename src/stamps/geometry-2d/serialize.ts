// src/stamps/geometry-2d/serialize.ts
//
// Format v2: { version: 2, bbox, state, showAxis, showGrid }
// `state` là core/scene `State` (objects/order/counter/meta). Replay = JxgRenderer
// diff state → JSXGraph board (xem src/core/scene/render/2d/JxgRenderer.ts).
//
// Format v1 cũ (SerializedElement[] creation log) KHÔNG còn back-compat —
// deserialize trả về empty state, log warning. Decision đã agreed ở Phase 1.
import type { State } from '../../core/scene';
import { createEmptyState, migrateState } from '../../core/scene';

export interface SerializedBoard {
  version: 2;
  bbox: [number, number, number, number];
  state: State;
  showAxis?: boolean;
  showGrid?: boolean;
}

export function serializeBoard(
  bbox: [number, number, number, number],
  state: State,
  options: { showAxis?: boolean; showGrid?: boolean } = {},
): SerializedBoard {
  return {
    version: 2,
    bbox,
    state,
    showAxis: !!options.showAxis,
    showGrid: !!options.showGrid,
  };
}

export function deserializeBoard(raw: unknown): SerializedBoard {
  if (raw && typeof raw === 'object' && (raw as { version?: number }).version === 2) {
    const r = raw as SerializedBoard;
    return {
      version: 2,
      bbox: r.bbox,
      state: migrateState(r.state),
      showAxis: !!r.showAxis,
      showGrid: !!r.showGrid,
    };
  }
  // Format không nhận diện được (vd v1 cũ với SerializedElement[]) → wipe.
  console.warn('[2d/serialize] format không nhận diện hoặc v1 cũ — dùng state rỗng');
  return {
    version: 2,
    bbox: [-5, 5, 5, -5],
    state: createEmptyState('2d'),
    showAxis: false,
    showGrid: false,
  };
}
