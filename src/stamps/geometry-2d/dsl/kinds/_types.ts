// src/stamps/geometry-2d/dsl/kinds/_types.ts
import type { z } from 'zod';
import type { SceneObject } from '../../../../core/scene/types';

export type KindRole =
  | 'point'
  | 'segment'
  | 'line'
  | 'ray'
  | 'lineConstruction'
  | 'circle'
  | 'polygon';

export type KindCategory = 'points' | 'lines' | 'polygons' | 'circles' | 'compound';

export interface EmitContext {
  /** Look up the scene-object id assigned to a DSL symbol name. */
  resolveId(name: string): string;
  /** Hint lookup for intersection-style emit needing to know what a referenced symbol is. */
  hintOf(name: string): KindRole;
  /** Generate a unique auxiliary id for an internal entity (not addressable from DSL). */
  mintAuxId(parentName: string, suffix: string): string;
}

export interface EmittedEntity {
  /** The first emitted entity per kind MUST have role 'primary'. */
  role: 'primary' | 'auxiliary';
  object: SceneObject;
}

export interface DslKindModule<TKind extends string = string, TInput = unknown> {
  kind: TKind;
  role: KindRole;
  category: KindCategory;
  prefix: string;
  schema: z.ZodObject<any>;
  collectRefs: (entity: TInput) => string[];
  emit: (entity: TInput, ctx: EmitContext) => EmittedEntity[];
}

/**
 * Factory that widens a typed module into the registry's generic shape.
 * Each kind module exports its module via this factory so `ALL_MODULES`
 * in registry.ts can be typed as ReadonlyArray<DslKindModule> without a cast.
 */
export function defineModule<TKind extends string, TInput>(
  m: DslKindModule<TKind, TInput>,
): DslKindModule {
  return m as DslKindModule;
}
