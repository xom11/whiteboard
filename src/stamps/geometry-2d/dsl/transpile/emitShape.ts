// src/stamps/geometry-2d/dsl/transpile/emitShape.ts
import type { SceneObject } from '../../../../core/scene/types';
import type { DslShapeT } from '../schema';

function r(ids: Map<string, string>, name: string): string {
  const id = ids.get(name);
  if (!id) throw new Error(`emitShape: id not assigned for "${name}"`);
  return id;
}

export function emitShape(s: DslShapeT, ids: Map<string, string>): SceneObject {
  const id = r(ids, s.name);
  const base = {
    label: s.name,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
  };

  switch (s.kind) {
    case 'segment':
      return { id, kind: 'segment', ...base, attrs: { p1: r(ids, s.p1), p2: r(ids, s.p2) } };

    case 'line':
      return { id, kind: 'line', ...base, attrs: { p1: r(ids, s.p1), p2: r(ids, s.p2) } };

    case 'ray':
      return { id, kind: 'ray', ...base, attrs: { origin: r(ids, s.origin), through: r(ids, s.through) } };

    case 'polygon':
      return { id, kind: 'polygon', ...base, attrs: { vertices: s.vertices.map((v) => r(ids, v)) } };

    case 'perpendicular':
    case 'parallel':
      return {
        id, kind: 'line', ...base,
        attrs: { construction: { kind: s.kind, throughPoint: r(ids, s.throughPoint), toLine: r(ids, s.toLine) } },
      };

    case 'perpBisector':
      return {
        id, kind: 'line', ...base,
        attrs: { construction: { kind: 'perpBisector', p1: r(ids, s.p1), p2: r(ids, s.p2) } },
      };

    case 'angleBisector':
      return {
        id, kind: 'line', ...base,
        attrs: { construction: { kind: 'angleBisector', p1: r(ids, s.p1), vertex: r(ids, s.vertex), p2: r(ids, s.p2) } },
      };

    case 'tangent': {
      const construction: Record<string, unknown> = {
        kind: 'tangent',
        throughPoint: r(ids, s.throughPoint),
        toCircle: r(ids, s.toCircle),
      };
      if (s.branch !== undefined) construction.branch = s.branch;
      return { id, kind: 'line', ...base, attrs: { construction } };
    }

    case 'circleCP':
      return {
        id, kind: 'circle', ...base,
        attrs: { center: r(ids, s.center), surfacePoint: r(ids, s.surfacePoint) },
      };

    case 'circle3':
      return {
        id, kind: 'circle', ...base,
        attrs: { construction: { kind: 'circumscribed', p1: r(ids, s.p1), p2: r(ids, s.p2), p3: r(ids, s.p3) } },
      };
  }
}
