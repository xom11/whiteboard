import type { State, SceneObject } from '../../../core/scene/types';

export function makeObj(
  id: string,
  kind: string,
  label: string,
  attrs: Record<string, unknown>,
): SceneObject {
  return {
    id,
    kind,
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs,
  };
}

export function makeState2D(objs: SceneObject[]): State {
  return {
    objects: Object.fromEntries(objs.map((o) => [o.id, o])),
    order: objs.map((o) => o.id),
    counter: objs.length,
    meta: { domain: '2d', version: 1 },
  };
}

export function makeState3D(objs: SceneObject[]): State {
  return {
    objects: Object.fromEntries(objs.map((o) => [o.id, o])),
    order: objs.map((o) => o.id),
    counter: objs.length,
    meta: { domain: '3d', version: 1 },
  };
}
