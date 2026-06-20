// src/stamps/geometry-2d/dsl/kinds/_shared.ts
import type { SceneObject } from '../../../../core/scene/types';
import type { Constraint2D } from '../../../../core/scene/kinds/2d-constraint';
import type { EmitContext } from './_types';

export const POINT_BASE_FIELDS = {
  visible: true,
  locked: false,
  layer: 'default',
  schemaVersion: 1,
} as const;

/** Wrap a Constraint2D attrs into a primary 'point' SceneObject. */
export function emitPointObject(
  id: string,
  name: string,
  constraint: Constraint2D,
  visible = true,
): SceneObject {
  return {
    id,
    kind: 'point',
    label: name,
    ...POINT_BASE_FIELDS,
    visible,
    attrs: { constraint },
  };
}

/** Resolve a triangle's 3 vertex ids. */
export function resolveTriangleVertices(
  ctx: EmitContext,
  vertices: readonly [string, string, string],
): [string, string, string] {
  return [ctx.resolveId(vertices[0]), ctx.resolveId(vertices[1]), ctx.resolveId(vertices[2])];
}

export const SHAPE_BASE_FIELDS = {
  visible: true,
  locked: false,
  layer: 'default',
  schemaVersion: 1,
} as const;
