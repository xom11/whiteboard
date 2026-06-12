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
  'line-or-circle': (s) => isLineLike(s) || isCircleLike(s),
  shape: (s) => !!s && s.role === 'shape',
  'any-existing': (s) => !!s,
};
const ROLE_EXPECTED: Record<RefRole, string> = {
  point: 'point',
  'line-like': 'line-like',
  circle: 'circle',
  segment: 'segment',
  'line-or-circle': 'line-like hoặc circle',
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

  // Registry-driven DUY NHẤT (switch legacy đã xoá 2026-06-12): mọi kind khai
  // refSpecs trong module của nó — mảng tĩnh, hàm theo entity cho discriminated
  // union (arcMidpoint/pointAtDistance), dotted path cho ref nested. Kind không
  // khai refSpecs → không validate (parity switch cũ: circleDiameter/
  // mixtilinearPoint/onPerpBisector vốn không có case).
  const runSpecs = (owner: string, entity: DslPointT | DslShapeT): void => {
    const mod = KIND_REGISTRY.get(entity.kind);
    const raw = mod?.refSpecs;
    if (!raw) return;
    const specs: readonly RefSpec[] =
      typeof raw === 'function' ? raw(entity as never) : raw;
    for (const spec of specs) {
      // field hỗ trợ dotted path ('distance.circle') cho ref nested trong
      // object con (vd pointAtDistance.distance.*).
      const val = spec.field
        .split('.')
        .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], entity);
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
  };
  for (const p of dsl.points) runSpecs(p.name, p);
  for (const s of dsl.shapes) runSpecs(s.name, s);

  return { errors };
}

// Helper export cho cycles.ts: collect refs cho mỗi entity (name) trả về list ref names.
export function collectRefs(entity: DslPointT | DslShapeT): string[] {
  const mod = KIND_REGISTRY.get(entity.kind);
  if (!mod) throw new Error(`collectRefs: no registry entry for kind "${entity.kind}"`);
  return mod.collectRefs(entity as never);
}
