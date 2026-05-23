// src/stamps/geometry-2d/serialize.ts
//
// Sau Tier D PR 3: customData.jsonState chỉ chứa `JSON.stringify(state)`
// (không còn envelope `{version, bbox, state, showAxis, showGrid}`).
// View info (bbox/axis/grid) nằm trong `state.meta.view` (View2D shape).

import { serializeScene, deserializeScene } from '../shared/serializeScene';
import type { State, View2D } from '../../core/scene';

export function serializeBoard(state: State, view: View2D): string {
  const withView: State = {
    ...state,
    meta: { domain: '2d', version: state.meta.version, view },
  };
  return serializeScene(withView);
}

export function deserializeBoard(raw: string): State {
  return deserializeScene('2d', raw);
}
