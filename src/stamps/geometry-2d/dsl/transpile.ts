// src/stamps/geometry-2d/dsl/transpile.ts
import type { SceneObject, State } from '../../../core/scene/types';
import { createEmptyState } from '../../../core/scene/types';
import { DslInput, type DslPointT, type DslShapeT } from './schema';
import { buildSymbols } from './transpile/symbols';
import { validateRefs } from './transpile/refs';
import { detectCycles } from './transpile/cycles';
import { assignIds } from './transpile/ids';
import { emitPoint, type EntityKindHint } from './transpile/emitPoint';
import { emitShape } from './transpile/emitShape';
import { mkError, type TranspileError, type TranspileResult } from './transpile/errors';
import { KIND_REGISTRY } from './registry';

function hintOf(entity: DslPointT | DslShapeT): EntityKindHint {
  const mod = KIND_REGISTRY.get(entity.kind);
  if (!mod) throw new Error(`hintOf: no registry entry for kind "${entity.kind}"`);
  // 'polygon' role maps to 'point' for legacy MVP behavior (polygon never used as ref target).
  return mod.role === 'polygon' ? 'point' : (mod.role as EntityKindHint);
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
  const dsl = parsed.data;

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

  // Stage 6: emit
  const objects: Record<string, SceneObject> = {};
  const order: string[] = [];

  for (const p of dsl.points) {
    const obj = emitPoint(p, ids, kindHints);
    objects[obj.id] = obj;
    order.push(obj.id);
  }
  for (const s of dsl.shapes) {
    const obj = emitShape(s, ids);
    objects[obj.id] = obj;
    order.push(obj.id);
  }

  const empty = createEmptyState('2d');
  const state: State = {
    objects,
    order,
    counter: order.length,
    meta: empty.meta,
  };
  return { ok: true, state };
}
