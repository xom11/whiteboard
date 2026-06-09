// src/stamps/geometry-2d/dsl/serialize.ts
//
// Reverse path: SceneObject → DSL entity. Counterpart cho `transpile` (forward
// DSL → State). Dùng cho tab Đối tượng hiển thị mô tả DSL-style + reuse khi
// muốn export state về DSL.
//
// Lossless với mọi primitive DSL v1 hỗ trợ. Out-of-DSL state (vector, distance,
// angle, arc, sector, onAxis/onPolygon/transformed constraint, polygon regular,
// angleBisectorLines) → fallback `{ ok: false; reason }` không drop.

import type { SceneObject, State } from '../../../core/scene/types';
import type { Constraint2D } from '../../../core/scene/kinds/2d-constraint';
import type { LineConstruction, LineAttrs } from '../../../core/scene/kinds/line';
import type { CircleAttrs } from '../../../core/scene/kinds/circle';
import type { PolygonAttrs } from '../../../core/scene/kinds/polygon';
import type { SegmentAttrs } from '../../../core/scene/kinds/segment';
import type { RayAttrs } from '../../../core/scene/kinds/ray';
import type { IntersectionAttrs } from '../../../core/scene/kinds/intersection';
import type { PointAttrs } from '../../../core/scene/kinds/point';
import type { DslInputT, DslPointT, DslShapeT } from './schema';
import { POINT_KINDS } from './registry';

export type SerializeReason =
  | 'unsupported-kind'
  | 'unsupported-constraint'
  | 'unsupported-construction'
  | 'unresolved-ref'
  | 'invalid-label';

export type SerializedEntity =
  | { ok: true; entity: DslPointT | DslShapeT }
  | { ok: false; reason: SerializeReason; detail?: string };

export interface UnsupportedEntry {
  id: string;
  label: string;
  kind: string;
  reason: SerializeReason;
  detail?: string;
}

export interface SerializeStateResult {
  dsl: DslInputT;
  unsupported: UnsupportedEntry[];
}

// Đồng bộ với NameZ ở names.ts. Dup ở đây để serializer không phụ thuộc Zod
// parse cho mỗi label (hot path khi tab Đối tượng render hàng chục row).
const NAME_REGEX = /^[A-Za-z][A-Za-z0-9_'₀-₉]{0,11}$/;

function isValidName(s: string): boolean {
  return NAME_REGEX.test(s);
}

function labelOf(id: string, state: State): string | null {
  const obj = state.objects[id];
  return obj ? obj.label : null;
}

function resolveRefs(ids: readonly string[], state: State): string[] | null {
  const out: string[] = [];
  for (const id of ids) {
    const lab = labelOf(id, state);
    if (lab == null || !isValidName(lab)) return null;
    out.push(lab);
  }
  return out;
}

function fail(reason: SerializeReason, detail?: string): SerializedEntity {
  return { ok: false, reason, detail };
}

// ---------------------------------------------------------------------------
// point — drill into Constraint2D
// ---------------------------------------------------------------------------

function serializePoint(obj: SceneObject<PointAttrs>, state: State): SerializedEntity {
  const c: Constraint2D | undefined = obj.attrs?.constraint;
  if (!c) return fail('unsupported-constraint', 'missing');

  switch (c.kind) {
    case 'free':
      return { ok: true, entity: { name: obj.label, kind: 'free', x: c.x, y: c.y } };

    case 'midpoint': {
      const refs = resolveRefs([c.p1, c.p2], state);
      if (!refs) return fail('unresolved-ref', `${c.p1},${c.p2}`);
      return { ok: true, entity: { name: obj.label, kind: 'midpoint', p1: refs[0], p2: refs[1] } };
    }

    case 'onSegment': {
      const refs = resolveRefs([c.segmentId], state);
      if (!refs) return fail('unresolved-ref', c.segmentId);
      return { ok: true, entity: { name: obj.label, kind: 'onSegment', segmentId: refs[0], t: c.t } };
    }

    case 'onLine': {
      const refs = resolveRefs([c.lineId], state);
      if (!refs) return fail('unresolved-ref', c.lineId);
      return { ok: true, entity: { name: obj.label, kind: 'onLine', lineId: refs[0], t: c.t } };
    }

    case 'onCircle': {
      const refs = resolveRefs([c.circleId], state);
      if (!refs) return fail('unresolved-ref', c.circleId);
      return { ok: true, entity: { name: obj.label, kind: 'onCircle', circleId: refs[0], theta: c.theta } };
    }

    case 'perpFoot': {
      const refs = resolveRefs([c.from, c.onLine], state);
      if (!refs) return fail('unresolved-ref', `${c.from},${c.onLine}`);
      return { ok: true, entity: { name: obj.label, kind: 'perpFoot', from: refs[0], onLine: refs[1] } };
    }

    case 'circumcenter':
    case 'incenter':
    case 'centroid':
    case 'orthocenter': {
      const refs = resolveRefs(c.vertices, state);
      if (!refs || refs.length !== 3) return fail('unresolved-ref', c.vertices.join(','));
      return {
        ok: true,
        entity: {
          name: obj.label,
          kind: c.kind,
          vertices: [refs[0], refs[1], refs[2]],
        },
      };
    }

    case 'tangentPointExt': {
      const refs = resolveRefs([c.from, c.circle], state);
      if (!refs) return fail('unresolved-ref', `${c.from},${c.circle}`);
      return {
        ok: true,
        entity: {
          name: obj.label,
          kind: 'tangentPointExt',
          from: refs[0],
          circle: refs[1],
          which: c.which,
        },
      };
    }

    case 'circleIntersection': {
      const refs = resolveRefs([c.c1, c.c2], state);
      if (!refs) return fail('unresolved-ref', `${c.c1},${c.c2}`);
      return {
        ok: true,
        entity: { name: obj.label, kind: 'circleIntersection', c1: refs[0], c2: refs[1], which: c.which },
      };
    }

    case 'circleSecondIntersection': {
      const refs = resolveRefs([c.c1, c.c2, c.exclude], state);
      if (!refs) return fail('unresolved-ref', `${c.c1},${c.c2},${c.exclude}`);
      return {
        ok: true,
        entity: { name: obj.label, kind: 'circleSecondIntersection', c1: refs[0], c2: refs[1], exclude: refs[2] },
      };
    }

    case 'secondIntersection': {
      const refs = resolveRefs([c.line, c.circle, c.other], state);
      if (!refs) return fail('unresolved-ref', `${c.line},${c.circle},${c.other}`);
      return {
        ok: true,
        entity: { name: obj.label, kind: 'secondIntersection', line: refs[0], circle: refs[1], other: refs[2] },
      };
    }

    case 'tangencyPoint': {
      const refs = resolveRefs([c.circle, c.onLine], state);
      if (!refs) return fail('unresolved-ref', `${c.circle},${c.onLine}`);
      return {
        ok: true,
        entity: { name: obj.label, kind: 'tangencyPoint', circle: refs[0], onLine: refs[1] },
      };
    }

    case 'arcMidpoint': {
      const refs = resolveRefs([c.circle, c.a, c.b, c.notContaining], state);
      if (!refs) return fail('unresolved-ref', `${c.circle},${c.a},${c.b},${c.notContaining}`);
      return {
        ok: true,
        entity: {
          name: obj.label,
          kind: 'arcMidpoint',
          circle: refs[0],
          a: refs[1],
          b: refs[2],
          notContaining: refs[3],
        },
      };
    }

    case 'excenter': {
      const refs = resolveRefs([c.vertices[0], c.vertices[1], c.vertices[2], c.opposite], state);
      if (!refs) return fail('unresolved-ref', `${c.vertices.join(',')},${c.opposite}`);
      return {
        ok: true,
        entity: {
          name: obj.label,
          kind: 'excenter',
          vertices: [refs[0], refs[1], refs[2]],
          opposite: refs[3],
        },
      };
    }

    case 'pointAtDistance': {
      const d = c.distance;
      const distRefIds = d.kind === 'circleRadius' ? [d.circle]
        : d.kind === 'segmentLength' ? [d.p1, d.p2] : [];
      const refs = resolveRefs([c.from, c.through, ...distRefIds], state);
      if (!refs) return fail('unresolved-ref', [c.from, c.through, ...distRefIds].join(','));
      let distance: import('./schema').DslDistanceSpec;
      if (d.kind === 'circleRadius') {
        distance = { kind: 'circleRadius', circle: refs[2] };
      } else if (d.kind === 'segmentLength') {
        distance = { kind: 'segmentLength', p1: refs[2], p2: refs[3] };
      } else {
        distance = { kind: 'literal', value: d.value };
      }
      // scale/offset OPTIONAL (Issue #46 nhóm C): chỉ ghi khi có → distance cũ
      // KHÔNG mọc key (additive, golden không đổi).
      if (d.scale !== undefined) distance.scale = d.scale;
      if (d.offset !== undefined) distance.offset = d.offset;
      return {
        ok: true,
        entity: { name: obj.label, kind: 'pointAtDistance', from: refs[0], through: refs[1], distance },
      };
    }

    // Out of DSL v1:
    case 'onAxis':
    case 'onPolygon':
    case 'transformed':
    case 'onPerpendicular':
    case 'onPerpBisector':
    case 'onCircleAroundPoint':
      return fail('unsupported-constraint', c.kind);

    default: {
      // exhaustive guard
      const _exhaust: never = c;
      void _exhaust;
      return fail('unsupported-constraint');
    }
  }
}

// ---------------------------------------------------------------------------
// intersection — branch field only for non-lineLine
// ---------------------------------------------------------------------------

function serializeIntersection(
  obj: SceneObject<IntersectionAttrs>,
  state: State,
): SerializedEntity {
  const a = obj.attrs;
  const refs = resolveRefs([a.ref1, a.ref2], state);
  if (!refs) return fail('unresolved-ref', `${a.ref1},${a.ref2}`);
  if (a.kind === 'lineLine') {
    return { ok: true, entity: { name: obj.label, kind: 'intersection', ref1: refs[0], ref2: refs[1] } };
  }
  return {
    ok: true,
    entity: {
      name: obj.label,
      kind: 'intersection',
      ref1: refs[0],
      ref2: refs[1],
      branch: a.branch,
    },
  };
}

// ---------------------------------------------------------------------------
// segment / ray
// ---------------------------------------------------------------------------

function serializeSegment(obj: SceneObject<SegmentAttrs>, state: State): SerializedEntity {
  const refs = resolveRefs([obj.attrs.p1, obj.attrs.p2], state);
  if (!refs) return fail('unresolved-ref', `${obj.attrs.p1},${obj.attrs.p2}`);
  return { ok: true, entity: { name: obj.label, kind: 'segment', p1: refs[0], p2: refs[1] } };
}

function serializeRay(obj: SceneObject<RayAttrs>, state: State): SerializedEntity {
  const refs = resolveRefs([obj.attrs.origin, obj.attrs.through], state);
  if (!refs) return fail('unresolved-ref', `${obj.attrs.origin},${obj.attrs.through}`);
  return { ok: true, entity: { name: obj.label, kind: 'ray', origin: refs[0], through: refs[1] } };
}

// ---------------------------------------------------------------------------
// line — no construction → 'line'; construction → matching DSL kind
// ---------------------------------------------------------------------------

function serializeLine(obj: SceneObject<LineAttrs>, state: State): SerializedEntity {
  const a = obj.attrs;
  const c: LineConstruction | undefined = a.construction;
  if (!c) {
    if (!a.p1 || !a.p2) return fail('unsupported-construction', 'missing p1/p2');
    const refs = resolveRefs([a.p1, a.p2], state);
    if (!refs) return fail('unresolved-ref', `${a.p1},${a.p2}`);
    return { ok: true, entity: { name: obj.label, kind: 'line', p1: refs[0], p2: refs[1] } };
  }

  switch (c.kind) {
    case 'perpendicular':
    case 'parallel': {
      const refs = resolveRefs([c.throughPoint, c.toLine], state);
      if (!refs) return fail('unresolved-ref', `${c.throughPoint},${c.toLine}`);
      return {
        ok: true,
        entity: { name: obj.label, kind: c.kind, throughPoint: refs[0], toLine: refs[1] },
      };
    }

    case 'perpBisector': {
      const refs = resolveRefs([c.p1, c.p2], state);
      if (!refs) return fail('unresolved-ref', `${c.p1},${c.p2}`);
      return { ok: true, entity: { name: obj.label, kind: 'perpBisector', p1: refs[0], p2: refs[1] } };
    }

    case 'angleBisector': {
      const refs = resolveRefs([c.p1, c.vertex, c.p2], state);
      if (!refs) return fail('unresolved-ref', `${c.p1},${c.vertex},${c.p2}`);
      return {
        ok: true,
        entity: {
          name: obj.label,
          kind: 'angleBisector',
          p1: refs[0],
          vertex: refs[1],
          p2: refs[2],
        },
      };
    }

    case 'tangent': {
      const refs = resolveRefs([c.throughPoint, c.toCircle], state);
      if (!refs) return fail('unresolved-ref', `${c.throughPoint},${c.toCircle}`);
      const entity: DslShapeT =
        c.branch !== undefined
          ? {
              name: obj.label,
              kind: 'tangent',
              throughPoint: refs[0],
              toCircle: refs[1],
              branch: c.branch,
            }
          : { name: obj.label, kind: 'tangent', throughPoint: refs[0], toCircle: refs[1] };
      return { ok: true, entity };
    }

    case 'lineThrough': {
      const refs = resolveRefs(c.points, state);
      if (!refs) return fail('unresolved-ref', c.points.join(','));
      return { ok: true, entity: { name: obj.label, kind: 'lineThrough', points: refs } };
    }

    case 'radicalAxis': {
      const refs = resolveRefs([c.circle1, c.circle2], state);
      if (!refs) return fail('unresolved-ref', `${c.circle1},${c.circle2}`);
      return { ok: true, entity: { name: obj.label, kind: 'radicalAxis', circle1: refs[0], circle2: refs[1] } };
    }

    case 'angleBisectorLines':
      return fail('unsupported-construction', 'angleBisectorLines');

    default: {
      const _exhaust: never = c;
      void _exhaust;
      return fail('unsupported-construction');
    }
  }
}

// ---------------------------------------------------------------------------
// polygon — no construction OK; 'regular' unsupported
// ---------------------------------------------------------------------------

function serializePolygon(obj: SceneObject<PolygonAttrs>, state: State): SerializedEntity {
  const a = obj.attrs;
  if (a.construction) return fail('unsupported-construction', a.construction.kind);
  if (!Array.isArray(a.vertices) || a.vertices.length < 3) {
    return fail('unsupported-construction', 'missing vertices');
  }
  const refs = resolveRefs(a.vertices, state);
  if (!refs) return fail('unresolved-ref', a.vertices.join(','));
  return { ok: true, entity: { name: obj.label, kind: 'polygon', vertices: refs } };
}

// ---------------------------------------------------------------------------
// circle — no construction → circleCP; 'circumscribed' → circle3
// ---------------------------------------------------------------------------

function serializeCircle(obj: SceneObject<CircleAttrs>, state: State): SerializedEntity {
  const a = obj.attrs;
  const c = a.construction;
  if (!c) {
    // center + radius (DSL circleCR) — ưu tiên trước center/surfacePoint.
    if (typeof a.radius === 'number') {
      if (!a.center) return fail('unsupported-construction', 'missing center');
      const refs = resolveRefs([a.center], state);
      if (!refs) return fail('unresolved-ref', `${a.center}`);
      return {
        ok: true,
        entity: { name: obj.label, kind: 'circleCR', center: refs[0], radius: a.radius },
      };
    }
    if (!a.center || !a.surfacePoint) {
      return fail('unsupported-construction', 'missing center/surfacePoint');
    }
    const refs = resolveRefs([a.center, a.surfacePoint], state);
    if (!refs) return fail('unresolved-ref', `${a.center},${a.surfacePoint}`);
    return {
      ok: true,
      entity: { name: obj.label, kind: 'circleCP', center: refs[0], surfacePoint: refs[1] },
    };
  }
  if (c.kind === 'circumscribed') {
    const refs = resolveRefs([c.p1, c.p2, c.p3], state);
    if (!refs) return fail('unresolved-ref', `${c.p1},${c.p2},${c.p3}`);
    return {
      ok: true,
      entity: { name: obj.label, kind: 'circle3', p1: refs[0], p2: refs[1], p3: refs[2] },
    };
  }
  if (c.kind === 'incircle') {
    const refs = resolveRefs([c.p1, c.p2, c.p3], state);
    if (!refs) return fail('unresolved-ref', `${c.p1},${c.p2},${c.p3}`);
    return {
      ok: true,
      entity: { name: obj.label, kind: 'incircle', vertices: [refs[0], refs[1], refs[2]] },
    };
  }
  if (c.kind === 'excircle') {
    const refs = resolveRefs([c.p1, c.p2, c.p3, c.opposite], state);
    if (!refs) return fail('unresolved-ref', `${c.p1},${c.p2},${c.p3},${c.opposite}`);
    return {
      ok: true,
      entity: { name: obj.label, kind: 'excircle', vertices: [refs[0], refs[1], refs[2]], opposite: refs[3] },
    };
  }
  if (c.kind === 'diameter') {
    const refs = resolveRefs([c.p1, c.p2], state);
    if (!refs) return fail('unresolved-ref', `${c.p1},${c.p2}`);
    return {
      ok: true,
      entity: { name: obj.label, kind: 'circleDiameter', p1: refs[0], p2: refs[1] },
    };
  }
  return fail('unsupported-construction');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function serializeObject(obj: SceneObject, state: State): SerializedEntity {
  if (!isValidName(obj.label)) {
    return fail('invalid-label', obj.label);
  }
  switch (obj.kind) {
    case 'point':
      return serializePoint(obj as SceneObject<PointAttrs>, state);
    case 'segment':
      return serializeSegment(obj as SceneObject<SegmentAttrs>, state);
    case 'ray':
      return serializeRay(obj as SceneObject<RayAttrs>, state);
    case 'line':
      return serializeLine(obj as SceneObject<LineAttrs>, state);
    case 'polygon':
      return serializePolygon(obj as SceneObject<PolygonAttrs>, state);
    case 'circle':
      return serializeCircle(obj as SceneObject<CircleAttrs>, state);
    case 'intersection':
      return serializeIntersection(obj as SceneObject<IntersectionAttrs>, state);
    default:
      return fail('unsupported-kind', obj.kind);
  }
}

export function serializeState(state: State): SerializeStateResult {
  const points: DslPointT[] = [];
  const shapes: DslShapeT[] = [];
  const unsupported: UnsupportedEntry[] = [];

  for (const id of state.order) {
    const obj = state.objects[id];
    if (!obj) continue;
    const r = serializeObject(obj, state);
    if (!r.ok) {
      unsupported.push({
        id: obj.id,
        label: obj.label,
        kind: obj.kind,
        reason: r.reason,
        detail: r.detail,
      });
      continue;
    }
    if (POINT_KINDS.has(r.entity.kind)) {
      points.push(r.entity as DslPointT);
    } else {
      shapes.push(r.entity as DslShapeT);
    }
  }

  return {
    dsl: { version: 1, points, shapes },
    unsupported,
  };
}
