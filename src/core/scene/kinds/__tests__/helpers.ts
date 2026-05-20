// src/core/scene/kinds/__tests__/helpers.ts
import type { SceneObject } from '../../types';

export function mkObj<A>(kind: string, id: string, attrs: A): SceneObject<A> {
  return {
    id, kind, label: id, visible: true, locked: false, layer: 'default',
    schemaVersion: 1, attrs,
  };
}
