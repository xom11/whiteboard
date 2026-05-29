# DSL Kind Modules Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `geometry-2d` DSL transpiler so each draw-tool (DSL kind) lives in its own self-contained module under `dsl/kinds/<category>/<kind>.ts`, replacing 4 duplicated kind-enumerations and 2 large emit switch dispatchers.

**Architecture:** Per-kind feature modules + central registry. Each module owns `{ kind, role, category, prefix, schema, collectRefs, emit }`. Top-level transpile becomes thin orchestrator. `emit` returns `EmittedEntity[]` (primary + optional auxiliaries) so future compound primitives (Simson line, Euler circle, excircle, etc.) can land in a single file.

**Tech Stack:** TypeScript strict, Zod 3.x (discriminatedUnion), Jest 29 + ts-jest, existing `Constraint2D` State model (Tier E).

**Reference spec:** `docs/superpowers/specs/2026-05-29-dsl-kind-modules-refactor-design.md`

**Migration order:** 2 PRs across 7 phases. PR1 = Phase 1-4 (metadata + lookup migration). PR2 = Phase 5-7 (emit migration + cleanup). Each phase ends with `npm test` + `npm run typecheck` green before commit.

---

## File Structure

### New files (created across phases)

```
src/stamps/geometry-2d/dsl/
├── kinds/
│   ├── _types.ts                       ← Task 1: interfaces (DslKindModule, EmitContext, EmittedEntity, KindRole, KindCategory)
│   ├── _shared.ts                      ← Task 1: empty exports; populated in Task 8/9 with emit helpers
│   ├── points/
│   │   ├── free.ts                     ← Task 2
│   │   ├── midpoint.ts
│   │   ├── onSegment.ts
│   │   ├── onLine.ts
│   │   ├── onCircle.ts
│   │   ├── perpFoot.ts
│   │   ├── circumcenter.ts
│   │   ├── incenter.ts
│   │   ├── centroid.ts
│   │   ├── orthocenter.ts
│   │   └── intersection.ts
│   ├── lines/
│   │   ├── segment.ts                  ← Task 3
│   │   ├── line.ts
│   │   ├── ray.ts
│   │   ├── perpendicular.ts
│   │   ├── parallel.ts
│   │   ├── perpBisector.ts
│   │   ├── angleBisector.ts
│   │   └── tangent.ts
│   ├── polygons/
│   │   └── polygon.ts                  ← Task 4
│   ├── circles/
│   │   ├── circleCP.ts                 ← Task 4
│   │   └── circle3.ts
│   ├── __tests__/
│   │   ├── registry.test.ts            ← Task 13
│   │   └── _shared.test.ts             ← Task 13
│   └── compound/                       ← Empty; future Simson/Euler/excircle land here
└── registry.ts                         ← Task 1: empty maps; populated in Task 5
```

### Modified files (per phase)

- **Task 5** (Phase 2 finalize): `dsl/transpile/refs.ts` — replace `collectRefs` switch + `LINE_LIKE_SHAPE_KINDS` / `CIRCLE_KINDS` Sets with registry lookups.
- **Task 6** (Phase 3): `dsl/transpile/ids.ts` — replace `prefixFor` switch with registry lookup.
- **Task 7** (Phase 4): `dsl/transpile.ts` — replace `hintOf` switch with registry role lookup.
- **Task 10** (Phase 5 finalize): `dsl/transpile.ts` — change emit dispatch from `emitPoint`/`emitShape` to registry.
- **Task 11** (Phase 6): `dsl/schema.ts` — rebuild `DslPoint`/`DslShape`/`DslInput` from registry.
- **Task 12** (Phase 7): delete `dsl/transpile/emitPoint.ts` + `dsl/transpile/emitShape.ts`. Implement `mintAuxId` in transpile.

### Reference data — Kind catalog (22 total)

| # | Kind | Category | Role | Prefix | collectRefs (names) |
|---|---|---|---|---|---|
| 1 | `free` | points | point | `p` | `[]` |
| 2 | `midpoint` | points | point | `p` | `[p1, p2]` |
| 3 | `onSegment` | points | point | `p` | `[segmentId]` |
| 4 | `onLine` | points | point | `p` | `[lineId]` |
| 5 | `onCircle` | points | point | `p` | `[circleId]` |
| 6 | `perpFoot` | points | point | `p` | `[from, onLine]` |
| 7 | `circumcenter` | points | point | `p` | `[...vertices]` |
| 8 | `incenter` | points | point | `p` | `[...vertices]` |
| 9 | `centroid` | points | point | `p` | `[...vertices]` |
| 10 | `orthocenter` | points | point | `p` | `[...vertices]` |
| 11 | `intersection` | points | point | `i` | `[ref1, ref2]` |
| 12 | `segment` | lines | segment | `s` | `[p1, p2]` |
| 13 | `line` | lines | line | `l` | `[p1, p2]` |
| 14 | `ray` | lines | ray | `r` | `[origin, through]` |
| 15 | `perpendicular` | lines | lineConstruction | `l` | `[throughPoint, toLine]` |
| 16 | `parallel` | lines | lineConstruction | `l` | `[throughPoint, toLine]` |
| 17 | `perpBisector` | lines | lineConstruction | `l` | `[p1, p2]` |
| 18 | `angleBisector` | lines | lineConstruction | `l` | `[p1, vertex, p2]` |
| 19 | `tangent` | lines | lineConstruction | `l` | `[throughPoint, toCircle]` |
| 20 | `polygon` | polygons | polygon | `poly` | `[...vertices]` |
| 21 | `circleCP` | circles | circle | `c` | `[center, surfacePoint]` |
| 22 | `circle3` | circles | circle | `c` | `[p1, p2, p3]` |

Source of truth: `src/stamps/geometry-2d/dsl/schema.ts` (variants), `dsl/transpile/refs.ts:148-176` (collectRefs), `dsl/transpile/ids.ts:7-27` (prefix), `dsl/transpile.ts:13-33` (role/hint).

---

# PR1 — Metadata migration (Tasks 1-7, Phases 1-4)

## Task 1: Phase 1 — Create skeleton files

**Files:**
- Create: `src/stamps/geometry-2d/dsl/names.ts` (extracted from schema.ts to break the future registry ↔ schema cycle)
- Create: `src/stamps/geometry-2d/dsl/kinds/_types.ts`
- Create: `src/stamps/geometry-2d/dsl/kinds/_shared.ts`
- Create: `src/stamps/geometry-2d/dsl/registry.ts`
- Modify: `src/stamps/geometry-2d/dsl/schema.ts` — re-export `NameZ` from `./names` (keeps public API stable, no behavior change)
- Create: `src/stamps/geometry-2d/dsl/kinds/points/.gitkeep`
- Create: `src/stamps/geometry-2d/dsl/kinds/lines/.gitkeep`
- Create: `src/stamps/geometry-2d/dsl/kinds/polygons/.gitkeep`
- Create: `src/stamps/geometry-2d/dsl/kinds/circles/.gitkeep`
- Create: `src/stamps/geometry-2d/dsl/kinds/compound/.gitkeep`

- [ ] **Step 0: Extract `NameZ` to `dsl/names.ts`**

```ts
// src/stamps/geometry-2d/dsl/names.ts
import { z } from 'zod';

// Label-style name: chữ cái Latin đầu, cho phép unicode prime (') + subscript ₀-₉.
// Max length 12 ký tự. Phân biệt hoa/thường.
export const NameZ = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_'₀-₉]{0,11}$/);
```

Then in `src/stamps/geometry-2d/dsl/schema.ts`, replace lines 5-8 (the inline `NameZ` definition) with a re-export so existing consumers see no change:

```ts
// src/stamps/geometry-2d/dsl/schema.ts (top of file)
import { z } from 'zod';
export { NameZ } from './names';
import { NameZ } from './names';  // also import locally for use in the discriminatedUnion below
```

Keep the rest of `schema.ts` (lines 10-72) unchanged.

- [ ] **Step 1: Create `kinds/_types.ts` with interfaces**

```ts
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
```

- [ ] **Step 2: Create `kinds/_shared.ts` (empty exports placeholder)**

```ts
// src/stamps/geometry-2d/dsl/kinds/_shared.ts
// Shared emit helpers — populated in Phase 5 (emit migration).
export {};
```

- [ ] **Step 3: Create `registry.ts` (empty maps)**

```ts
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
```

- [ ] **Step 4: Create `.gitkeep` files for empty category folders**

```bash
touch src/stamps/geometry-2d/dsl/kinds/points/.gitkeep
touch src/stamps/geometry-2d/dsl/kinds/lines/.gitkeep
touch src/stamps/geometry-2d/dsl/kinds/polygons/.gitkeep
touch src/stamps/geometry-2d/dsl/kinds/circles/.gitkeep
touch src/stamps/geometry-2d/dsl/kinds/compound/.gitkeep
```

- [ ] **Step 5: Run typecheck + tests to confirm no regression**

```bash
npm run typecheck
npm test
```

Expected: typecheck green, all 79 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds src/stamps/geometry-2d/dsl/registry.ts
git commit -m "refactor(dsl): scaffold kinds/ + registry skeleton (Phase 1)"
```

---

## Task 2: Phase 2a — Create 11 `points/` modules with schema + collectRefs

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/points/{free,midpoint,onSegment,onLine,onCircle,perpFoot,circumcenter,incenter,centroid,orthocenter,intersection}.ts`

Each module follows this template. Real schemas mirror `dsl/schema.ts:10-34` exactly. `prefix` placeholder is empty string (filled in Task 6). `emit` is a throw stub (filled in Task 8).

- [ ] **Step 1: Create `points/midpoint.ts` as exemplar**

```ts
// src/stamps/geometry-2d/dsl/kinds/points/midpoint.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslPointT, { kind: 'midpoint' }>;

export const midpointModule: DslKindModule<'midpoint', Input> = {
  kind: 'midpoint',
  role: 'point',
  category: 'points',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('midpoint'),
    p1: NameZ,
    p2: NameZ,
  }),
  collectRefs: (e) => [e.p1, e.p2],
  emit: () => {
    throw new Error('midpoint.emit: not yet migrated (Phase 5 / Task 8)');
  },
};
```

- [ ] **Step 2: Create remaining 10 `points/` modules**

Use the same template. The variant body (between `kind: z.literal(...)` and the closing brace) comes from `dsl/schema.ts:10-34`. `collectRefs` body from the table above.

Export names: `freeModule`, `onSegmentModule`, `onLineModule`, `onCircleModule`, `perpFootModule`, `circumcenterModule`, `incenterModule`, `centroidModule`, `orthocenterModule`, `intersectionModule`.

Notes:
- `free` schema includes `x: z.number().finite(), y: z.number().finite()`. `collectRefs: () => []`.
- `onSegment` includes `segmentId: NameZ, t: z.number().min(0).max(1)`. `collectRefs: (e) => [e.segmentId]`.
- `onLine` includes `lineId: NameZ, t: z.number().finite()`. `collectRefs: (e) => [e.lineId]`.
- `onCircle` includes `circleId: NameZ, theta: z.number().finite()`. `collectRefs: (e) => [e.circleId]`.
- `perpFoot` includes `from: NameZ, onLine: NameZ`. `collectRefs: (e) => [e.from, e.onLine]`.
- The 4 centers (`circumcenter`, `incenter`, `centroid`, `orthocenter`) share `vertices: z.tuple([NameZ, NameZ, NameZ])`. `collectRefs: (e) => [...e.vertices]`.
- `intersection` includes `ref1: NameZ, ref2: NameZ, branch: z.union([z.literal(0), z.literal(1)]).optional()`. `collectRefs: (e) => [e.ref1, e.ref2]`.

- [ ] **Step 3: Typecheck + test**

```bash
npm run typecheck
npm test
```

Expected: typecheck green (modules exist but are not imported anywhere yet), tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/points
git commit -m "refactor(dsl): add 11 points/ kind modules with schema + collectRefs (Phase 2a)"
```

---

## Task 3: Phase 2b — Create 8 `lines/` modules

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/lines/{segment,line,ray,perpendicular,parallel,perpBisector,angleBisector,tangent}.ts`

- [ ] **Step 1: Create `lines/perpendicular.ts` as exemplar**

```ts
// src/stamps/geometry-2d/dsl/kinds/lines/perpendicular.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'perpendicular' }>;

export const perpendicularModule: DslKindModule<'perpendicular', Input> = {
  kind: 'perpendicular',
  role: 'lineConstruction',
  category: 'lines',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('perpendicular'),
    throughPoint: NameZ,
    toLine: NameZ,
  }),
  collectRefs: (e) => [e.throughPoint, e.toLine],
  emit: () => {
    throw new Error('perpendicular.emit: not yet migrated (Phase 5 / Task 9)');
  },
};
```

- [ ] **Step 2: Create remaining 7 `lines/` modules**

Variant bodies from `dsl/schema.ts:36-62`. Roles + collectRefs from table:
- `segment`: role `'segment'`, schema `{ name, kind: 'segment', p1, p2 }`, refs `[e.p1, e.p2]`
- `line`: role `'line'`, schema `{ name, kind: 'line', p1, p2 }`, refs `[e.p1, e.p2]`
- `ray`: role `'ray'`, schema `{ name, kind: 'ray', origin, through }`, refs `[e.origin, e.through]`
- `parallel`: role `'lineConstruction'`, schema `{ name, kind: 'parallel', throughPoint, toLine }`, refs `[e.throughPoint, e.toLine]`
- `perpBisector`: role `'lineConstruction'`, schema `{ name, kind: 'perpBisector', p1, p2 }`, refs `[e.p1, e.p2]`
- `angleBisector`: role `'lineConstruction'`, schema `{ name, kind: 'angleBisector', p1, vertex, p2 }`, refs `[e.p1, e.vertex, e.p2]`
- `tangent`: role `'lineConstruction'`, schema includes `branch: z.union([z.literal(0), z.literal(1), z.literal('on')]).optional()`, refs `[e.throughPoint, e.toCircle]`

Export names: `segmentModule`, `lineModule`, `rayModule`, `parallelModule`, `perpBisectorModule`, `angleBisectorModule`, `tangentModule`.

- [ ] **Step 3: Typecheck + test**

```bash
npm run typecheck && npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/lines
git commit -m "refactor(dsl): add 8 lines/ kind modules with schema + collectRefs (Phase 2b)"
```

---

## Task 4: Phase 2c — Create `polygons/` + `circles/` modules (3 total)

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/polygons/polygon.ts`
- Create: `src/stamps/geometry-2d/dsl/kinds/circles/circleCP.ts`
- Create: `src/stamps/geometry-2d/dsl/kinds/circles/circle3.ts`

- [ ] **Step 1: Create `polygons/polygon.ts`**

```ts
// src/stamps/geometry-2d/dsl/kinds/polygons/polygon.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'polygon' }>;

export const polygonModule: DslKindModule<'polygon', Input> = {
  kind: 'polygon',
  role: 'polygon',
  category: 'polygons',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('polygon'),
    vertices: z.array(NameZ).min(3),
  }),
  collectRefs: (e) => [...e.vertices],
  emit: () => {
    throw new Error('polygon.emit: not yet migrated (Phase 5 / Task 9)');
  },
};
```

- [ ] **Step 2: Create `circles/circleCP.ts`**

```ts
// src/stamps/geometry-2d/dsl/kinds/circles/circleCP.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'circleCP' }>;

export const circleCPModule: DslKindModule<'circleCP', Input> = {
  kind: 'circleCP',
  role: 'circle',
  category: 'circles',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circleCP'),
    center: NameZ,
    surfacePoint: NameZ,
  }),
  collectRefs: (e) => [e.center, e.surfacePoint],
  emit: () => {
    throw new Error('circleCP.emit: not yet migrated (Phase 5 / Task 9)');
  },
};
```

- [ ] **Step 3: Create `circles/circle3.ts`**

```ts
// src/stamps/geometry-2d/dsl/kinds/circles/circle3.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'circle3' }>;

export const circle3Module: DslKindModule<'circle3', Input> = {
  kind: 'circle3',
  role: 'circle',
  category: 'circles',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circle3'),
    p1: NameZ,
    p2: NameZ,
    p3: NameZ,
  }),
  collectRefs: (e) => [e.p1, e.p2, e.p3],
  emit: () => {
    throw new Error('circle3.emit: not yet migrated (Phase 5 / Task 9)');
  },
};
```

- [ ] **Step 4: Typecheck + test**

```bash
npm run typecheck && npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/polygons src/stamps/geometry-2d/dsl/kinds/circles
git commit -m "refactor(dsl): add polygons/ + circles/ kind modules (Phase 2c)"
```

---

## Task 5: Phase 2 finalize — Wire registry, swap `refs.ts` to registry lookup

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/registry.ts` — populate `ALL_MODULES` with all 22 imports
- Modify: `src/stamps/geometry-2d/dsl/transpile/refs.ts` — replace `collectRefs` switch + Sets with registry lookups

- [ ] **Step 1: Populate `ALL_MODULES` in `registry.ts`**

Replace the `ALL_MODULES = [...]` line with:

```ts
import { freeModule } from './kinds/points/free';
import { midpointModule } from './kinds/points/midpoint';
import { onSegmentModule } from './kinds/points/onSegment';
import { onLineModule } from './kinds/points/onLine';
import { onCircleModule } from './kinds/points/onCircle';
import { perpFootModule } from './kinds/points/perpFoot';
import { circumcenterModule } from './kinds/points/circumcenter';
import { incenterModule } from './kinds/points/incenter';
import { centroidModule } from './kinds/points/centroid';
import { orthocenterModule } from './kinds/points/orthocenter';
import { intersectionModule } from './kinds/points/intersection';
import { segmentModule } from './kinds/lines/segment';
import { lineModule } from './kinds/lines/line';
import { rayModule } from './kinds/lines/ray';
import { perpendicularModule } from './kinds/lines/perpendicular';
import { parallelModule } from './kinds/lines/parallel';
import { perpBisectorModule } from './kinds/lines/perpBisector';
import { angleBisectorModule } from './kinds/lines/angleBisector';
import { tangentModule } from './kinds/lines/tangent';
import { polygonModule } from './kinds/polygons/polygon';
import { circleCPModule } from './kinds/circles/circleCP';
import { circle3Module } from './kinds/circles/circle3';

const ALL_MODULES: ReadonlyArray<DslKindModule> = [
  freeModule, midpointModule, onSegmentModule, onLineModule, onCircleModule,
  perpFootModule, circumcenterModule, incenterModule, centroidModule,
  orthocenterModule, intersectionModule,
  segmentModule, lineModule, rayModule,
  perpendicularModule, parallelModule, perpBisectorModule,
  angleBisectorModule, tangentModule,
  polygonModule,
  circleCPModule, circle3Module,
];
```

- [ ] **Step 2: Replace `collectRefs` + Sets in `dsl/transpile/refs.ts`**

Open `dsl/transpile/refs.ts`. Replace lines 12-32 (`LINE_LIKE_SHAPE_KINDS`, `CIRCLE_KINDS` constants and `isLineLike`/`isCircleLike` helpers) with imports + thinner helpers, AND replace `collectRefs` (lines 148-176) with a registry lookup. Final file:

```ts
// src/stamps/geometry-2d/dsl/transpile/refs.ts
import type { DslInputT, DslPointT, DslShapeT } from '../schema';
import { KIND_REGISTRY, LINE_LIKE_SHAPE_KINDS, CIRCLE_KINDS } from '../registry';
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

export interface RefsResult {
  errors: TranspileError[];
}

export function validateRefs(dsl: DslInputT, symbols: Map<string, Symbol>): RefsResult {
  // ... existing body unchanged (lines 38-145 of original file)
}

export function collectRefs(entity: DslPointT | DslShapeT): string[] {
  const mod = KIND_REGISTRY.get(entity.kind);
  if (!mod) throw new Error(`collectRefs: no registry entry for kind "${entity.kind}"`);
  return mod.collectRefs(entity as never);
}
```

Keep the `validateRefs` body as-is (lines 38-145 of the original file). Only the top constants (now imported from registry) and the `collectRefs` function change.

- [ ] **Step 3: Run tests — must catch any registry/refs mismatch**

```bash
npm test
```

If any of the `transpile.refs.test.ts` or `transpile.cycles.test.ts` cases fail, audit the per-kind `collectRefs` against `refs.ts:148-176` original switch. Common error: wrong field name or missing spread on `vertices`.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/registry.ts src/stamps/geometry-2d/dsl/transpile/refs.ts
git commit -m "refactor(dsl): wire registry; refs.ts reads collectRefs from registry (Phase 2 finalize)"
```

---

## Task 6: Phase 3 — Add `prefix` field to all 22 modules + swap `ids.ts`

**Files:**
- Modify: all 22 module files — replace `prefix: ''` with real value
- Modify: `src/stamps/geometry-2d/dsl/transpile/ids.ts` — replace `prefixFor` switch

- [ ] **Step 1: Set `prefix` field on each module**

Per the kind catalog table above. Concretely:

| Module file | prefix |
|---|---|
| `points/free.ts` | `'p'` |
| `points/midpoint.ts` | `'p'` |
| `points/onSegment.ts` | `'p'` |
| `points/onLine.ts` | `'p'` |
| `points/onCircle.ts` | `'p'` |
| `points/perpFoot.ts` | `'p'` |
| `points/circumcenter.ts` | `'p'` |
| `points/incenter.ts` | `'p'` |
| `points/centroid.ts` | `'p'` |
| `points/orthocenter.ts` | `'p'` |
| `points/intersection.ts` | `'i'` |
| `lines/segment.ts` | `'s'` |
| `lines/line.ts` | `'l'` |
| `lines/ray.ts` | `'r'` |
| `lines/perpendicular.ts` | `'l'` |
| `lines/parallel.ts` | `'l'` |
| `lines/perpBisector.ts` | `'l'` |
| `lines/angleBisector.ts` | `'l'` |
| `lines/tangent.ts` | `'l'` |
| `polygons/polygon.ts` | `'poly'` |
| `circles/circleCP.ts` | `'c'` |
| `circles/circle3.ts` | `'c'` |

- [ ] **Step 2: Rewrite `dsl/transpile/ids.ts`**

```ts
// src/stamps/geometry-2d/dsl/transpile/ids.ts
import type { Symbol } from './symbols';
import { KIND_REGISTRY } from '../registry';

export function assignIds(symbols: Map<string, Symbol>): Map<string, string> {
  const counters = new Map<string, number>();
  const ids = new Map<string, string>();
  for (const [name, sym] of symbols.entries()) {
    const mod = KIND_REGISTRY.get(sym.entity.kind);
    if (!mod) throw new Error(`assignIds: no registry entry for kind "${sym.entity.kind}"`);
    const prefix = mod.prefix;
    counters.set(prefix, (counters.get(prefix) ?? 0) + 1);
    ids.set(name, `${prefix}${counters.get(prefix)}`);
  }
  return ids;
}
```

Note: ID counters are now a generic `Map<prefix, count>` rather than the typed `{ p, i, s, l, r, poly, c }` record. This is intentional — adding a future prefix doesn't require touching this file.

- [ ] **Step 3: Run tests**

```bash
npm test
```

If `transpile.emit.test.ts` or fixture tests fail with id-mismatch errors, double-check the prefix table.

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck
git add src/stamps/geometry-2d/dsl/kinds src/stamps/geometry-2d/dsl/transpile/ids.ts
git commit -m "refactor(dsl): registry-driven prefix lookup; ids.ts reads from registry (Phase 3)"
```

---

## Task 7: Phase 4 — Swap `hintOf` in `transpile.ts`

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/transpile.ts`

- [ ] **Step 1: Replace the `hintOf` function**

Replace `transpile.ts:13-33` (the entire `hintOf` function) with:

```ts
import { KIND_REGISTRY } from './registry';
// ... other imports unchanged ...

function hintOf(entity: DslPointT | DslShapeT): EntityKindHint {
  const mod = KIND_REGISTRY.get(entity.kind);
  if (!mod) throw new Error(`hintOf: no registry entry for kind "${entity.kind}"`);
  // role maps 1:1 onto EntityKindHint except 'polygon' (legacy quirk: not used as ref target).
  return mod.role === 'polygon' ? 'point' : (mod.role as EntityKindHint);
}
```

The `'polygon' → 'point'` mapping preserves the legacy behavior from the original switch (`case 'polygon': return 'point'; // not used as ref target in MVP`). Document this in a `// preserves legacy MVP behavior` comment.

- [ ] **Step 2: Run tests**

```bash
npm test
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/stamps/geometry-2d/dsl/transpile.ts
git commit -m "refactor(dsl): hintOf reads from registry role (Phase 4)"
```

**End of PR1.** Create PR with title `refactor(dsl): registry-driven kind metadata (PR1/2 — Phases 1-4)`. After review + merge, proceed to PR2 below.

---

# PR2 — Emit migration + cleanup (Tasks 8-13, Phases 5-7)

## Task 8: Phase 5a — Add `emit` to 11 `points/` modules + populate `_shared.ts` helpers

**Files:**
- Modify: all 11 `kinds/points/*.ts` files — implement `emit`
- Modify: `src/stamps/geometry-2d/dsl/kinds/_shared.ts` — add helpers

- [ ] **Step 1: Populate `_shared.ts` with point-emit helpers**

```ts
// src/stamps/geometry-2d/dsl/kinds/_shared.ts
import type { SceneObject } from '../../../../core/scene/types';
import type { EmitContext } from './_types';

export const POINT_BASE_FIELDS = {
  visible: true,
  locked: false,
  layer: 'default',
  schemaVersion: 1,
} as const;

/** Wrap a Constraint2D-style attrs into a primary 'point' SceneObject. */
export function emitPointObject(
  id: string,
  name: string,
  constraint: Record<string, unknown>,
): SceneObject {
  return {
    id,
    kind: 'point',
    label: name,
    ...POINT_BASE_FIELDS,
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
```

- [ ] **Step 2: Implement `emit` for the 10 non-intersection point modules**

Use `emitPointObject` from `_shared.ts`. The `constraint` shape is exactly what the original `emitPoint.ts:60-89` switch produces.

Example — `points/midpoint.ts`:

```ts
emit: (e, ctx) => [{
  role: 'primary',
  object: emitPointObject(
    ctx.resolveId(e.name),
    e.name,
    { kind: 'midpoint', p1: ctx.resolveId(e.p1), p2: ctx.resolveId(e.p2) },
  ),
}],
```

Add the import at the top:
```ts
import { emitPointObject, resolveTriangleVertices } from '../_shared';
```

Concrete `constraint` per kind (source: `emitPoint.ts:60-89`):
- `free`: `{ kind: 'free', x: e.x, y: e.y }`
- `midpoint`: `{ kind: 'midpoint', p1: ctx.resolveId(e.p1), p2: ctx.resolveId(e.p2) }`
- `onSegment`: `{ kind: 'onSegment', segmentId: ctx.resolveId(e.segmentId), t: e.t }`
- `onLine`: `{ kind: 'onLine', lineId: ctx.resolveId(e.lineId), t: e.t }`
- `onCircle`: `{ kind: 'onCircle', circleId: ctx.resolveId(e.circleId), theta: e.theta }`
- `perpFoot`: `{ kind: 'perpFoot', from: ctx.resolveId(e.from), onLine: ctx.resolveId(e.onLine) }`
- `circumcenter` / `incenter` / `centroid` / `orthocenter`: `{ kind: <e.kind>, vertices: resolveTriangleVertices(ctx, e.vertices) }`

- [ ] **Step 3: Implement `emit` for `points/intersection.ts` (special — different scene kind)**

```ts
// src/stamps/geometry-2d/dsl/kinds/points/intersection.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import type { DslKindModule } from '../_types';
import { POINT_BASE_FIELDS } from '../_shared';

type Input = Extract<DslPointT, { kind: 'intersection' }>;

export const intersectionModule: DslKindModule<'intersection', Input> = {
  kind: 'intersection',
  role: 'point',
  category: 'points',
  prefix: 'i',
  schema: z.object({
    name: NameZ,
    kind: z.literal('intersection'),
    ref1: NameZ,
    ref2: NameZ,
    branch: z.union([z.literal(0), z.literal(1)]).optional(),
  }),
  collectRefs: (e) => [e.ref1, e.ref2],
  emit: (e, ctx) => {
    const r1IsCircle = ctx.hintOf(e.ref1) === 'circle';
    const r2IsCircle = ctx.hintOf(e.ref2) === 'circle';
    let intersectKind: 'lineLine' | 'lineCircle' | 'circleCircle';
    if (r1IsCircle && r2IsCircle) intersectKind = 'circleCircle';
    else if (r1IsCircle || r2IsCircle) intersectKind = 'lineCircle';
    else intersectKind = 'lineLine';

    const attrs: Record<string, unknown> = {
      kind: intersectKind,
      ref1: ctx.resolveId(e.ref1),
      ref2: ctx.resolveId(e.ref2),
    };
    if (intersectKind !== 'lineLine') {
      attrs.branch = e.branch ?? 0;
    }
    return [{
      role: 'primary',
      object: {
        id: ctx.resolveId(e.name),
        kind: 'intersection',
        label: e.name,
        ...POINT_BASE_FIELDS,
        attrs,
      },
    }];
  },
};
```

- [ ] **Step 4: Tests must still pass — but emit isn't yet dispatched via registry**

Tests will continue to use the old `emitPoint` switch. The new module `emit` functions are written but not exercised yet.

```bash
npm test
```

Expected: green.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/stamps/geometry-2d/dsl/kinds
git commit -m "refactor(dsl): implement emit for 11 points/ modules (Phase 5a)"
```

---

## Task 9: Phase 5b — Add `emit` to 11 `lines/` + `polygons/` + `circles/` modules

**Files:**
- Modify: all 8 `kinds/lines/*.ts`, `kinds/polygons/polygon.ts`, 2 `kinds/circles/*.ts`

- [ ] **Step 1: Add a shared helper for shape base fields in `_shared.ts`**

Append to `kinds/_shared.ts`:

```ts
export const SHAPE_BASE_FIELDS = {
  visible: true,
  locked: false,
  layer: 'default',
  schemaVersion: 1,
} as const;
```

- [ ] **Step 2: Implement `emit` for `segment`, `line`, `ray`, `polygon`**

Concrete `emit` bodies (source: `emitShape.ts:21-32`):

`lines/segment.ts`:
```ts
emit: (e, ctx) => [{
  role: 'primary',
  object: {
    id: ctx.resolveId(e.name), kind: 'segment', label: e.name, ...SHAPE_BASE_FIELDS,
    attrs: { p1: ctx.resolveId(e.p1), p2: ctx.resolveId(e.p2) },
  },
}],
```

`lines/line.ts`:
```ts
emit: (e, ctx) => [{
  role: 'primary',
  object: {
    id: ctx.resolveId(e.name), kind: 'line', label: e.name, ...SHAPE_BASE_FIELDS,
    attrs: { p1: ctx.resolveId(e.p1), p2: ctx.resolveId(e.p2) },
  },
}],
```

`lines/ray.ts`:
```ts
emit: (e, ctx) => [{
  role: 'primary',
  object: {
    id: ctx.resolveId(e.name), kind: 'ray', label: e.name, ...SHAPE_BASE_FIELDS,
    attrs: { origin: ctx.resolveId(e.origin), through: ctx.resolveId(e.through) },
  },
}],
```

`polygons/polygon.ts`:
```ts
emit: (e, ctx) => [{
  role: 'primary',
  object: {
    id: ctx.resolveId(e.name), kind: 'polygon', label: e.name, ...SHAPE_BASE_FIELDS,
    attrs: { vertices: e.vertices.map((v) => ctx.resolveId(v)) },
  },
}],
```

- [ ] **Step 3: Implement `emit` for the 5 line-constructions**

All emit `kind: 'line'` with a `construction` attrs payload (source: `emitShape.ts:34-61`).

`lines/perpendicular.ts`:
```ts
emit: (e, ctx) => [{
  role: 'primary',
  object: {
    id: ctx.resolveId(e.name), kind: 'line', label: e.name, ...SHAPE_BASE_FIELDS,
    attrs: { construction: { kind: 'perpendicular', throughPoint: ctx.resolveId(e.throughPoint), toLine: ctx.resolveId(e.toLine) } },
  },
}],
```

`lines/parallel.ts`: same shape but `kind: 'parallel'` inside `construction`.

`lines/perpBisector.ts`:
```ts
emit: (e, ctx) => [{
  role: 'primary',
  object: {
    id: ctx.resolveId(e.name), kind: 'line', label: e.name, ...SHAPE_BASE_FIELDS,
    attrs: { construction: { kind: 'perpBisector', p1: ctx.resolveId(e.p1), p2: ctx.resolveId(e.p2) } },
  },
}],
```

`lines/angleBisector.ts`:
```ts
emit: (e, ctx) => [{
  role: 'primary',
  object: {
    id: ctx.resolveId(e.name), kind: 'line', label: e.name, ...SHAPE_BASE_FIELDS,
    attrs: { construction: { kind: 'angleBisector', p1: ctx.resolveId(e.p1), vertex: ctx.resolveId(e.vertex), p2: ctx.resolveId(e.p2) } },
  },
}],
```

`lines/tangent.ts`:
```ts
emit: (e, ctx) => {
  const construction: Record<string, unknown> = {
    kind: 'tangent',
    throughPoint: ctx.resolveId(e.throughPoint),
    toCircle: ctx.resolveId(e.toCircle),
  };
  if (e.branch !== undefined) construction.branch = e.branch;
  return [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name), kind: 'line', label: e.name, ...SHAPE_BASE_FIELDS,
      attrs: { construction },
    },
  }];
},
```

- [ ] **Step 4: Implement `emit` for `circleCP` and `circle3`**

`circles/circleCP.ts`:
```ts
emit: (e, ctx) => [{
  role: 'primary',
  object: {
    id: ctx.resolveId(e.name), kind: 'circle', label: e.name, ...SHAPE_BASE_FIELDS,
    attrs: { center: ctx.resolveId(e.center), surfacePoint: ctx.resolveId(e.surfacePoint) },
  },
}],
```

`circles/circle3.ts`:
```ts
emit: (e, ctx) => [{
  role: 'primary',
  object: {
    id: ctx.resolveId(e.name), kind: 'circle', label: e.name, ...SHAPE_BASE_FIELDS,
    attrs: { construction: { kind: 'circumscribed', p1: ctx.resolveId(e.p1), p2: ctx.resolveId(e.p2), p3: ctx.resolveId(e.p3) } },
  },
}],
```

Note: the original `emitShape.ts:69-73` uses `kind: 'circumscribed'` for `circle3`. Preserve exactly.

- [ ] **Step 5: Tests still use old emit dispatch — verify green**

```bash
npm test
```

Expected: green (new emit code exists but is unreachable).

- [ ] **Step 6: Typecheck + commit**

```bash
npm run typecheck
git add src/stamps/geometry-2d/dsl/kinds
git commit -m "refactor(dsl): implement emit for 8 lines/ + polygons/ + 2 circles/ modules (Phase 5b)"
```

---

## Task 10: Phase 5c — Swap emit dispatch in `transpile.ts` to registry

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/transpile.ts` — replace `emitPoint`/`emitShape` calls with registry dispatch
- Keep (do not delete yet): `dsl/transpile/emitPoint.ts`, `dsl/transpile/emitShape.ts` — deleted in Task 12

- [ ] **Step 1: Add a `buildEmitContext` helper in `transpile.ts`**

Add this function above `transpile()` in `transpile.ts`:

```ts
import type { EmitContext, EmittedEntity } from './kinds/_types';
import { KIND_REGISTRY } from './registry';

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
      // EntityKindHint and KindRole are nearly identical strings — pass through.
      return hint as never;
    },
    mintAuxId(parentName, suffix) {
      const key = `${parentName}.${suffix}`;
      auxCounters.set(key, (auxCounters.get(key) ?? 0) + 1);
      const seq = auxCounters.get(key)!;
      return `aux_${parentName}_${suffix}${seq}`;
    },
  };
}
```

- [ ] **Step 2: Replace the emit loop**

In `transpile.ts`, replace lines 63-76 (the `for` loops over `dsl.points` and `dsl.shapes` that call `emitPoint` and `emitShape`) with:

```ts
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
```

Remove the now-unused imports of `emitPoint` and `emitShape` (lines 9-10).

- [ ] **Step 3: Run full test suite — this is the highest-risk swap**

```bash
npm test
```

If any fixture roundtrip test fails, compare the emitted SceneObject for the failing kind against the original `emitPoint.ts` / `emitShape.ts` switch case. Common issue: wrong attrs field name or missing optional field (`branch` on tangent/intersection).

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck
git add src/stamps/geometry-2d/dsl/transpile.ts
git commit -m "refactor(dsl): emit dispatched via registry (Phase 5c)"
```

---

## Task 11: Phase 6 — Rebuild `dsl/schema.ts` to assemble `DslEntitySchema` from registry

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/schema.ts` — rebuild discriminated unions
- Modify: `src/stamps/geometry-2d/dsl/registry.ts` — populate `DslEntitySchema`

- [ ] **Step 1: Build `DslEntitySchema` in `registry.ts`**

Replace the `DslEntitySchema = z.never()` line with:

```ts
// Top-level entity discriminated union — used by transpile.ts for input validation.
export const DslEntitySchema = z.discriminatedUnion(
  'kind',
  ALL_MODULES.map((m) => m.schema) as unknown as [z.ZodObject<any>, z.ZodObject<any>, ...z.ZodObject<any>[]],
);
```

- [ ] **Step 2: Refactor `dsl/schema.ts` to expose the old API as registry-backed re-exports**

Replace the body of `dsl/schema.ts` with:

```ts
// src/stamps/geometry-2d/dsl/schema.ts
import { z } from 'zod';
import { KIND_REGISTRY, POINT_KINDS } from './registry';

// Name regex stays here — it's referenced by every kind module's schema.
export const NameZ = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_'₀-₉]{0,11}$/);

const allSchemas = Array.from(KIND_REGISTRY.values()).map((m) => m.schema);
const pointSchemas = Array.from(KIND_REGISTRY.values()).filter((m) => POINT_KINDS.has(m.kind)).map((m) => m.schema);
const shapeSchemas = Array.from(KIND_REGISTRY.values()).filter((m) => !POINT_KINDS.has(m.kind)).map((m) => m.schema);

function asTuple(arr: z.ZodObject<any>[]): [z.ZodObject<any>, z.ZodObject<any>, ...z.ZodObject<any>[]] {
  if (arr.length < 2) throw new Error('schema: need at least 2 variants for discriminatedUnion');
  return arr as never;
}

export const DslPoint = z.discriminatedUnion('kind', asTuple(pointSchemas));
export const DslShape = z.discriminatedUnion('kind', asTuple(shapeSchemas));

export const DslInput = z.object({
  version: z.literal(1),
  points: z.array(DslPoint),
  shapes: z.array(DslShape).default([]),
});

export type DslPointT = z.infer<typeof DslPoint>;
export type DslShapeT = z.infer<typeof DslShape>;
export type DslInputT = z.infer<typeof DslInput>;
```

This preserves the public API (`NameZ`, `DslPoint`, `DslShape`, `DslInput`, `DslPointT`, `DslShapeT`, `DslInputT`) but builds the union from registry instead of inline.

- [ ] **Step 3: Tests + typecheck**

```bash
npm test && npm run typecheck
```

The `NameZ` cyclic-import risk is already mitigated — Task 1 Step 0 extracted `NameZ` to `dsl/names.ts`, so modules import from `names.ts` not `schema.ts`. `schema.ts` only re-exports `NameZ` for backward compat. No cycle.

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-2d/dsl/schema.ts src/stamps/geometry-2d/dsl/registry.ts
git commit -m "refactor(dsl): schema.ts assembles DslPoint/DslShape from registry (Phase 6)"
```

---

## Task 12: Phase 7a — Delete obsolete emit files

**Files:**
- Delete: `src/stamps/geometry-2d/dsl/transpile/emitPoint.ts`
- Delete: `src/stamps/geometry-2d/dsl/transpile/emitShape.ts`

- [ ] **Step 1: Delete the two files**

```bash
rm src/stamps/geometry-2d/dsl/transpile/emitPoint.ts
rm src/stamps/geometry-2d/dsl/transpile/emitShape.ts
```

- [ ] **Step 2: Verify no remaining imports**

```bash
grep -rEn 'emitPoint|emitShape' src --include='*.ts' --include='*.tsx'
```

Expected: no matches outside test files. If matches found, remove them.

- [ ] **Step 3: Move `EntityKindHint` type from deleted `emitPoint.ts` into `transpile.ts`**

Since `transpile.ts:hintOf` (Task 7) returns `EntityKindHint` and the type was originally declared in `emitPoint.ts:5-11`, inline it at the top of `transpile.ts`:

```ts
// transpile.ts — add near top, replacing the old `import { ..., type EntityKindHint } from './transpile/emitPoint'`:
type EntityKindHint = 'point' | 'line' | 'segment' | 'ray' | 'lineConstruction' | 'circle';
```

- [ ] **Step 4: Tests + typecheck**

```bash
npm test && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add -A src/stamps/geometry-2d/dsl
git commit -m "refactor(dsl): delete obsolete emitPoint/emitShape; inline EntityKindHint (Phase 7a)"
```

---

## Task 13: Phase 7b — Add registry tests + `_shared` tests

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/__tests__/registry.test.ts`
- Create: `src/stamps/geometry-2d/dsl/kinds/__tests__/_shared.test.ts`

- [ ] **Step 1: Write `registry.test.ts`**

```ts
// src/stamps/geometry-2d/dsl/kinds/__tests__/registry.test.ts
import {
  KIND_REGISTRY,
  POINT_KINDS,
  LINE_LIKE_SHAPE_KINDS,
  CIRCLE_KINDS,
  DslEntitySchema,
} from '../../registry';

describe('registry', () => {
  test('every module has a unique kind string', () => {
    const seen = new Set<string>();
    for (const mod of KIND_REGISTRY.values()) {
      expect(seen.has(mod.kind)).toBe(false);
      seen.add(mod.kind);
    }
  });

  test('module kind matches schema literal', () => {
    for (const mod of KIND_REGISTRY.values()) {
      const parsed = mod.schema.safeParse({ name: 'X', kind: mod.kind });
      // Schema may fail on missing fields but the kind discriminator must match.
      // If the kind is wrong, Zod returns a discriminator error.
      const hasDiscriminatorError =
        !parsed.success && parsed.error.issues.some((i) => i.code === 'invalid_literal');
      expect(hasDiscriminatorError).toBe(false);
    }
  });

  test('POINT_KINDS contains exactly all role=point kinds', () => {
    const expected = new Set(
      Array.from(KIND_REGISTRY.values()).filter((m) => m.role === 'point').map((m) => m.kind),
    );
    expect(POINT_KINDS).toEqual(expected);
  });

  test('LINE_LIKE_SHAPE_KINDS contains segment/line/ray + lineConstruction kinds', () => {
    const expected = new Set(
      Array.from(KIND_REGISTRY.values())
        .filter((m) => ['segment', 'line', 'ray', 'lineConstruction'].includes(m.role))
        .map((m) => m.kind),
    );
    expect(LINE_LIKE_SHAPE_KINDS).toEqual(expected);
  });

  test('CIRCLE_KINDS contains exactly role=circle kinds', () => {
    const expected = new Set(
      Array.from(KIND_REGISTRY.values()).filter((m) => m.role === 'circle').map((m) => m.kind),
    );
    expect(CIRCLE_KINDS).toEqual(expected);
  });

  test('DslEntitySchema parses every kind module exemplar', () => {
    const samples = [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' },
      { name: 'X', kind: 'intersection', ref1: 'a', ref2: 'b' },
      { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
      { name: 'CP', kind: 'circleCP', center: 'O', surfacePoint: 'A' },
    ];
    for (const s of samples) {
      const r = DslEntitySchema.safeParse(s);
      expect(r.success).toBe(true);
    }
  });

  test('registry has 22 kinds (regression guard)', () => {
    expect(KIND_REGISTRY.size).toBe(22);
  });
});
```

- [ ] **Step 2: Write `_shared.test.ts`**

```ts
// src/stamps/geometry-2d/dsl/kinds/__tests__/_shared.test.ts
import { emitPointObject, resolveTriangleVertices, POINT_BASE_FIELDS, SHAPE_BASE_FIELDS } from '../_shared';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (name) => `id_${name}`,
  hintOf: () => 'point',
  mintAuxId: (parent, suffix) => `aux_${parent}_${suffix}1`,
};

describe('_shared helpers', () => {
  test('emitPointObject wraps constraint into SceneObject', () => {
    const obj = emitPointObject('p1', 'A', { kind: 'free', x: 1, y: 2 });
    expect(obj).toEqual({
      id: 'p1',
      kind: 'point',
      label: 'A',
      ...POINT_BASE_FIELDS,
      attrs: { constraint: { kind: 'free', x: 1, y: 2 } },
    });
  });

  test('resolveTriangleVertices maps 3 names through ctx', () => {
    expect(resolveTriangleVertices(ctx, ['A', 'B', 'C'])).toEqual(['id_A', 'id_B', 'id_C']);
  });

  test('POINT_BASE_FIELDS and SHAPE_BASE_FIELDS share visible/locked/layer/schemaVersion', () => {
    expect(POINT_BASE_FIELDS).toEqual({ visible: true, locked: false, layer: 'default', schemaVersion: 1 });
    expect(SHAPE_BASE_FIELDS).toEqual({ visible: true, locked: false, layer: 'default', schemaVersion: 1 });
  });
});
```

- [ ] **Step 3: Add a `mintAuxId` regression test** (locks the contract for future compound primitives)

Append to `registry.test.ts`:

```ts
import { transpile } from '../../transpile';

describe('emit context mintAuxId', () => {
  test('transpile pipeline produces no auxiliary ids for the 22 atomic kinds', () => {
    const dsl = {
      version: 1 as const,
      points: [{ name: 'A', kind: 'free' as const, x: 0, y: 0 }],
      shapes: [],
    };
    const result = transpile(dsl);
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const id of Object.keys(result.state.objects)) {
        expect(id.startsWith('aux_')).toBe(false);
      }
    }
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests (79 original + new registry/_shared/mintAuxId) pass.

- [ ] **Step 5: Final typecheck + commit**

```bash
npm run typecheck
git add src/stamps/geometry-2d/dsl/kinds/__tests__
git commit -m "test(dsl): add registry + _shared + mintAuxId tests (Phase 7b)"
```

**End of PR2.** Create PR with title `refactor(dsl): per-kind emit modules + cleanup (PR2/2 — Phases 5-7)`.

---

# Post-merge checklist

- [ ] Both PRs merged to `main`.
- [ ] Run full `npm test && npm run typecheck && npm run build` on `main` after merge.
- [ ] Manual smoke: open `apps/web` (if available) or sandbox; render a fixture from `dsl/fixtures/triangle-incircle.ts` end-to-end to confirm no behavior regression in the actual UI.
- [ ] Update `MEMORY.md` with a reference to the refactor (link spec + plan).
- [ ] Close GitHub issue tracking the refactor (or update issue #40 with a note that DSL is now extensible for compound primitives).

# Notes for future compound primitives (not in scope)

After this refactor, adding `excircle`, `eulerLine`, `eulerCircle`, or `simsonLine`:

1. Create `kinds/compound/<name>.ts` with full module shape (schema + collectRefs + emit returning multiple `EmittedEntity` — primary + auxiliaries via `ctx.mintAuxId`).
2. Add the entry to `ALL_MODULES` in `registry.ts`.
3. Add a `Constraint2D` variant in `core/scene/kinds/2d-constraint.ts` (if the primary entity isn't expressible by existing constraints).
4. Add create-logic in `core/scene/kinds/point.ts` (if a new constraint variant was introduced).
5. Add a fixture in `dsl/fixtures/`.
6. Add `kinds/compound/__tests__/<name>.test.ts`.

**No other DSL file is touched.** This is the architectural payoff of the refactor.
