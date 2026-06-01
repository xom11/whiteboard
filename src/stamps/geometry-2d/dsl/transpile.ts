// src/stamps/geometry-2d/dsl/transpile.ts
import type { SceneObject, State } from '../../../core/scene/types';
import { createEmptyState } from '../../../core/scene/types';
import { DslInput, type DslInputT, type DslPointT, type DslShapeT } from './schema';
import { buildSymbols } from './transpile/symbols';
import { validateRefs } from './transpile/refs';
import { detectCycles } from './transpile/cycles';
import { assignIds } from './transpile/ids';
import type { EntityKindHint } from './transpile/emitPoint';
import { mkError, type TranspileError, type TranspileResult } from './transpile/errors';
import { KIND_REGISTRY } from './registry';
import type { EmitContext, EmittedEntity, KindRole } from './kinds/_types';

function hintOf(entity: DslPointT | DslShapeT): EntityKindHint {
  // points (including intersection) are point-like at scene level.
  if ('kind' in entity) {
    switch (entity.kind) {
      case 'free': case 'midpoint': case 'onSegment': case 'onLine':
      case 'onCircle': case 'perpFoot': case 'circumcenter':
      case 'incenter': case 'centroid': case 'orthocenter': case 'intersection':
        return 'point';
      case 'segment':  return 'segment';
      case 'line':     return 'line';
      case 'ray':      return 'ray';
      case 'polygon':  return 'point'; // not used as ref target in MVP
      case 'perpendicular': case 'parallel': case 'perpBisector':
      case 'angleBisector': case 'tangent':
        return 'lineConstruction';
      case 'circleCP': case 'circle3':
        return 'circle';
    }
  }
  return 'point';
}

function buildEmitContext(
  ids: Map<string, string>,
  kindHints: Map<string, EntityKindHint>,
): EmitContext {
  const auxCounters = new Map<string, number>();
  return {
    resolveId(name) {
      const id = ids.get(name);
      if (!id) throw new Error(`emit: id not assigned for "${name}"`);
      return id;
    },
    hintOf(name) {
      const hint = kindHints.get(name);
      if (!hint) throw new Error(`emit: hint not assigned for "${name}"`);
      // EntityKindHint and KindRole share these literals; safe to widen.
      return hint as KindRole;
    },
    mintAuxId(parentName, suffix) {
      const key = `${parentName}.${suffix}`;
      auxCounters.set(key, (auxCounters.get(key) ?? 0) + 1);
      const seq = auxCounters.get(key)!;
      return `aux_${parentName}_${suffix}${seq}`;
    },
  };
}

export function transpile(dslRaw: unknown): TranspileResult {
  // Stage 1: schema parse
  const parsed = DslInput.safeParse(dslRaw);
  if (!parsed.success) {
    const errors: TranspileError[] = parsed.error.issues.map((iss) =>
      mkError('SCHEMA', iss.message, { path: iss.path.map(String) }),
    );
    return { ok: false, errors };
  }
  // Cast: parsed.data is statically `{[x: string]: any}[]` because the registry
  // stores schemas as the erased `z.ZodObject<any>`. Runtime parse already
  // validated the variant shape, so widening to DslInputT is safe.
  const dsl = parsed.data as DslInputT;

  // Stage 2-4: collect errors
  const { symbols, errors: dupErrors } = buildSymbols(dsl);
  const { errors: refErrors } = validateRefs(dsl, symbols);
  const { errors: cycleErrors } = detectCycles(symbols);

  const allErrors = [...dupErrors, ...refErrors, ...cycleErrors];
  if (allErrors.length > 0) return { ok: false, errors: allErrors };

  // Stage 5: id assignment
  const ids = assignIds(symbols);

  // Build kindHints (DSL name → EntityKindHint) cho intersection inference.
  const kindHints = new Map<string, EntityKindHint>();
  for (const [name, sym] of symbols.entries()) {
    kindHints.set(name, hintOf(sym.entity));
  }

  // Stage 6: emit via registry
  const objects: Record<string, SceneObject> = {};
  const order: string[] = [];
  const ctx = buildEmitContext(ids, kindHints);

  const emitEntity = (entity: DslPointT | DslShapeT) => {
    const mod = KIND_REGISTRY.get(entity.kind);
    if (!mod) throw new Error(`emit: no registry entry for kind "${entity.kind}"`);
    const emitted: EmittedEntity[] = mod.emit(entity as never, ctx);
    for (const ent of emitted) {
      objects[ent.object.id] = ent.object;
      order.push(ent.object.id);
    }
  };

  for (const p of dsl.points) emitEntity(p);
  for (const s of dsl.shapes) emitEntity(s);

  const empty = createEmptyState('2d');
  const state: State = {
    objects,
    order,
    counter: order.length,
    meta: empty.meta,
  };
  return { ok: true, state };
}
