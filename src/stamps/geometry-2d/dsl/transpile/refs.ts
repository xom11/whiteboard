// src/stamps/geometry-2d/dsl/transpile/refs.ts
import type { DslInputT, DslPointT, DslShapeT } from '../schema';
import { KIND_REGISTRY, LINE_LIKE_SHAPE_KINDS, CIRCLE_KINDS } from '../registry';
import type { RefRole, RefSpec } from '../kinds/_types';
import type { Symbol } from './symbols';
import { mkError, type TranspileError } from './errors';

function isPointLike(sym: Symbol | undefined): boolean {
  return !!sym && sym.role === 'point';
}

function isLineLike(sym: Symbol | undefined): boolean {
  if (!sym || sym.role !== 'shape') return false;
  return LINE_LIKE_SHAPE_KINDS.has((sym.entity as DslShapeT).kind);
}

function isCircleLike(sym: Symbol | undefined): boolean {
  if (!sym || sym.role !== 'shape') return false;
  return CIRCLE_KINDS.has((sym.entity as DslShapeT).kind);
}

function isSegmentExact(sym: Symbol | undefined): boolean {
  return !!sym && sym.role === 'shape' && (sym.entity as DslShapeT).kind === 'segment';
}

const ROLE_PREDICATE: Record<RefRole, (s: Symbol | undefined) => boolean> = {
  point: isPointLike,
  'line-like': isLineLike,
  circle: isCircleLike,
  segment: isSegmentExact,
  shape: (s) => !!s && s.role === 'shape',
  'any-existing': (s) => !!s,
};
const ROLE_EXPECTED: Record<RefRole, string> = {
  point: 'point',
  'line-like': 'line-like',
  circle: 'circle',
  segment: 'segment',
  shape: 'shape',
  'any-existing': 'tồn tại',
};

export interface RefsResult {
  errors: TranspileError[];
}

export function validateRefs(dsl: DslInputT, symbols: Map<string, Symbol>): RefsResult {
  const errors: TranspileError[] = [];

  const check = (
    owner: string,
    field: string,
    refName: string,
    predicate: (s: Symbol | undefined) => boolean,
    expected: string,
  ) => {
    const sym = symbols.get(refName);
    if (!sym) {
      errors.push(mkError('UNKNOWN_REF',
        `${owner}.${field} tham chiếu "${refName}" không tồn tại`,
        { path: [owner, field] }));
      return;
    }
    if (!predicate(sym)) {
      errors.push(mkError('KIND_MISMATCH',
        `${owner}.${field}="${refName}" sai kiểu (cần ${expected}, gặp ${sym.role === 'point' ? 'point' : (sym.entity as DslShapeT).kind})`,
        { path: [owner, field] }));
    }
  };

  // Registry-driven pass: kind nào khai refSpecs thì validate ở đây, switch bỏ qua.
  const handledByRegistry = new Set<string>();
  const runSpecs = (owner: string, entity: DslPointT | DslShapeT): boolean => {
    const mod = KIND_REGISTRY.get(entity.kind);
    const raw = mod?.refSpecs;
    if (!raw) return false;
    const specs: readonly RefSpec[] =
      typeof raw === 'function' ? raw(entity as never) : raw;
    for (const spec of specs) {
      const val = (entity as Record<string, unknown>)[spec.field];
      const names: string[] = spec.many
        ? ((val as string[]) ?? [])
        : val == null
          ? []
          : [val as string];
      names.forEach((refName, i) => {
        const field = spec.many ? `${spec.field}[${i}]` : spec.field;
        check(owner, field, refName, ROLE_PREDICATE[spec.role], ROLE_EXPECTED[spec.role]);
      });
    }
    handledByRegistry.add(owner);
    return true;
  };
  for (const p of dsl.points) runSpecs(p.name, p);
  for (const s of dsl.shapes) runSpecs(s.name, s);

  for (const p of dsl.points) {
    if (handledByRegistry.has(p.name)) continue;
    switch (p.kind) {
      case 'free': break;
      case 'midpoint':
        check(p.name, 'p1', p.p1, isPointLike, 'point');
        check(p.name, 'p2', p.p2, isPointLike, 'point');
        break;
      case 'onSegment':
        check(p.name, 'segmentId', p.segmentId, isSegmentExact, 'segment');
        break;
      case 'onLine':
        check(p.name, 'lineId', p.lineId, isLineLike, 'line-like');
        break;
      case 'onCircle':
        check(p.name, 'circleId', p.circleId, isCircleLike, 'circle');
        break;
      case 'perpFoot':
        check(p.name, 'from', p.from, isPointLike, 'point');
        check(p.name, 'onLine', p.onLine, isLineLike, 'line-like');
        break;
      case 'circumcenter':
      case 'incenter':
      case 'centroid':
      case 'orthocenter':
        for (let i = 0; i < 3; i++) {
          check(p.name, `vertices[${i}]`, p.vertices[i], isPointLike, 'point');
        }
        break;
      case 'intersection': {
        const refPredicate = (s: Symbol | undefined) => isLineLike(s) || isCircleLike(s);
        check(p.name, 'ref1', p.ref1, refPredicate, 'line-like hoặc circle');
        check(p.name, 'ref2', p.ref2, refPredicate, 'line-like hoặc circle');
        break;
      }
      case 'arcMidpoint':
        check(p.name, 'circle', p.circle, isCircleLike, 'circle');
        check(p.name, 'a', p.a, isPointLike, 'point');
        check(p.name, 'b', p.b, isPointLike, 'point');
        check(p.name, 'notContaining', p.notContaining, isPointLike, 'point');
        break;
      case 'excenter':
        for (let i = 0; i < 3; i++) {
          check(p.name, `vertices[${i}]`, p.vertices[i], isPointLike, 'point');
        }
        check(p.name, 'opposite', p.opposite, isPointLike, 'point');
        break;
      case 'reflectPoint':
        check(p.name, 'of', p.of, isPointLike, 'point');
        check(p.name, 'through', p.through, isPointLike, 'point');
        break;
      case 'reflectLine':
        check(p.name, 'of', p.of, isPointLike, 'point');
        check(p.name, 'through', p.through, isLineLike, 'line-like');
        break;
    }
  }

  for (const s of dsl.shapes) {
    if (handledByRegistry.has(s.name)) continue;
    switch (s.kind) {
      case 'segment':
      case 'line':
        check(s.name, 'p1', s.p1, isPointLike, 'point');
        check(s.name, 'p2', s.p2, isPointLike, 'point');
        break;
      case 'ray':
        check(s.name, 'origin', s.origin, isPointLike, 'point');
        check(s.name, 'through', s.through, isPointLike, 'point');
        break;
      case 'polygon':
        s.vertices.forEach((v, i) =>
          check(s.name, `vertices[${i}]`, v, isPointLike, 'point'));
        break;
      case 'perpendicular':
      case 'parallel':
        check(s.name, 'throughPoint', s.throughPoint, isPointLike, 'point');
        check(s.name, 'toLine', s.toLine, isLineLike, 'line-like');
        break;
      case 'perpBisector':
        check(s.name, 'p1', s.p1, isPointLike, 'point');
        check(s.name, 'p2', s.p2, isPointLike, 'point');
        break;
      case 'angleBisector':
        check(s.name, 'p1', s.p1, isPointLike, 'point');
        check(s.name, 'vertex', s.vertex, isPointLike, 'point');
        check(s.name, 'p2', s.p2, isPointLike, 'point');
        break;
      case 'tangent':
        check(s.name, 'throughPoint', s.throughPoint, isPointLike, 'point');
        check(s.name, 'toCircle', s.toCircle, isCircleLike, 'circle');
        break;
      case 'circleCP':
        check(s.name, 'center', s.center, isPointLike, 'point');
        check(s.name, 'surfacePoint', s.surfacePoint, isPointLike, 'point');
        break;
      case 'circle3':
        check(s.name, 'p1', s.p1, isPointLike, 'point');
        check(s.name, 'p2', s.p2, isPointLike, 'point');
        check(s.name, 'p3', s.p3, isPointLike, 'point');
        break;
    }
  }

  return { errors };
}

// Helper export cho cycles.ts: collect refs cho mỗi entity (name) trả về list ref names.
export function collectRefs(entity: DslPointT | DslShapeT): string[] {
  const mod = KIND_REGISTRY.get(entity.kind);
  if (!mod) throw new Error(`collectRefs: no registry entry for kind "${entity.kind}"`);
  return mod.collectRefs(entity as never);
}
