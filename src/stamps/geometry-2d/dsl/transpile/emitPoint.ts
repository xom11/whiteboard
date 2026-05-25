// src/stamps/geometry-2d/dsl/transpile/emitPoint.ts
import type { SceneObject } from '../../../../core/scene/types';
import type { DslPointT } from '../schema';

export type EntityKindHint =
  | 'point'
  | 'line'         // DslShape 'line'
  | 'segment'
  | 'ray'
  | 'lineConstruction'  // perpendicular/parallel/perpBisector/angleBisector/tangent
  | 'circle';

function resolveId(ids: Map<string, string>, name: string): string {
  const id = ids.get(name);
  if (!id) throw new Error(`emitPoint: id not assigned for "${name}"`);
  return id;
}

export function emitPoint(
  p: DslPointT,
  ids: Map<string, string>,
  kindHints: Map<string, EntityKindHint>,
): SceneObject {
  const baseId = resolveId(ids, p.name);

  const baseFields = {
    label: p.name,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
  };

  if (p.kind === 'intersection') {
    const r1Hint = kindHints.get(p.ref1);
    const r2Hint = kindHints.get(p.ref2);
    const r1IsCircle = r1Hint === 'circle';
    const r2IsCircle = r2Hint === 'circle';
    let intersectKind: 'lineLine' | 'lineCircle' | 'circleCircle';
    if (r1IsCircle && r2IsCircle) intersectKind = 'circleCircle';
    else if (r1IsCircle || r2IsCircle) intersectKind = 'lineCircle';
    else intersectKind = 'lineLine';

    const attrs: Record<string, unknown> = {
      kind: intersectKind,
      ref1: resolveId(ids, p.ref1),
      ref2: resolveId(ids, p.ref2),
    };
    if (intersectKind !== 'lineLine') {
      attrs.branch = p.branch ?? 0;
    }
    return {
      id: baseId,
      kind: 'intersection',
      ...baseFields,
      attrs,
    };
  }

  let constraint: Record<string, unknown>;
  switch (p.kind) {
    case 'free':
      constraint = { kind: 'free', x: p.x, y: p.y };
      break;
    case 'midpoint':
      constraint = { kind: 'midpoint', p1: resolveId(ids, p.p1), p2: resolveId(ids, p.p2) };
      break;
    case 'onSegment':
      constraint = { kind: 'onSegment', segmentId: resolveId(ids, p.segmentId), t: p.t };
      break;
    case 'onLine':
      constraint = { kind: 'onLine', lineId: resolveId(ids, p.lineId), t: p.t };
      break;
    case 'onCircle':
      constraint = { kind: 'onCircle', circleId: resolveId(ids, p.circleId), theta: p.theta };
      break;
    case 'perpFoot':
      constraint = { kind: 'perpFoot', from: resolveId(ids, p.from), onLine: resolveId(ids, p.onLine) };
      break;
    case 'circumcenter':
    case 'incenter':
    case 'centroid':
    case 'orthocenter':
      constraint = {
        kind: p.kind,
        vertices: [resolveId(ids, p.vertices[0]), resolveId(ids, p.vertices[1]), resolveId(ids, p.vertices[2])],
      };
      break;
  }

  return {
    id: baseId,
    kind: 'point',
    ...baseFields,
    attrs: { constraint },
  };
}
