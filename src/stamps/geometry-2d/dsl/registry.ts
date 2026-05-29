// src/stamps/geometry-2d/dsl/registry.ts
import { z } from 'zod';
import type { DslKindModule } from './kinds/_types';

const ALL_MODULES: ReadonlyArray<DslKindModule> = [
  // Populated in Task 5 after all 22 kind modules exist.
];

export const KIND_REGISTRY: ReadonlyMap<string, DslKindModule> =
  new Map(ALL_MODULES.map((m) => [m.kind, m]));

export const POINT_KINDS: ReadonlySet<string> = new Set(
  ALL_MODULES.filter((m) => m.role === 'point').map((m) => m.kind),
);

export const LINE_LIKE_SHAPE_KINDS: ReadonlySet<string> = new Set(
  ALL_MODULES.filter(
    (m) =>
      m.role === 'segment' ||
      m.role === 'line' ||
      m.role === 'ray' ||
      m.role === 'lineConstruction',
  ).map((m) => m.kind),
);

export const CIRCLE_KINDS: ReadonlySet<string> = new Set(
  ALL_MODULES.filter((m) => m.role === 'circle').map((m) => m.kind),
);

// Built in Phase 6 (Task 11). Until then `dsl/schema.ts` keeps its inline union.
export const DslEntitySchema: z.ZodTypeAny = z.never();
