# DSL kind modules refactor — design

**Date:** 2026-05-29
**Status:** Approved (brainstorm) — revised 2026-05-29 for compound primitive support
**Related:**
- [[2026-05-25-phase2-dsl-transpiler-design]] — original DSL transpiler design
- [[2026-05-23-tier-e-derived-primitives-design]] — Constraint2D State (Tier E)
- GitHub issue #40 — AI figure generation phase 2

## User intent

> "Mỗi tool vẽ hình nằm trong 1 block logic riêng để thêm bớt dễ dàng và có thể thêm các tool khác một cách dễ dàng như vẽ đường tròn bàng tiếp, đường tròn Euler, đường thẳng Simson, ... Chấp nhận hi sinh công sức hiện tại để dễ dàng thêm thắt hơn trong tương lai."

This refactor optimizes for **future-extensibility above current-LOC-savings**. Acceptable to throw away the existing per-stage switch dispatch in favor of self-contained per-tool modules.

## Context / Motivation

The `geometry-2d` DSL transpiler currently has **4 duplicated kind enumerations** scattered across files (22 kinds total: 11 points + 11 shapes):

- `dsl/schema.ts` — Zod `discriminatedUnion` listing every kind (in `DslPoint` and `DslShape`)
- `dsl/transpile.ts:hintOf` — `switch` mapping kind → `'point' | 'segment' | 'line' | 'ray' | 'lineConstruction' | 'circle'`
- `dsl/transpile/refs.ts` — `LINE_LIKE_SHAPE_KINDS` / `CIRCLE_KINDS` Sets + a switch in `collectRefs`
- `dsl/transpile/ids.ts` — `prefixFor` switch mapping kind → ID prefix character
- Plus `dsl/transpile/emitPoint.ts` (97 LOC) + `dsl/transpile/emitShape.ts` (75 LOC) — large per-kind switches with the actual emit logic

Adding one new primitive currently requires touching **~10 logic touch points across 9 production files** — ~5 of which are pure enumeration updates that must stay in lockstep. With **>10 primitives planned** (transforms, additional centers, decorations) **plus** compound primitives the user explicitly wants (excircle, Euler line/circle, Simson line, etc.), this duplication is a major bottleneck.

Tests are strong (79 cases, 9 fixtures roundtrip) — they are the safety net for the refactor.

## Goals

1. **Per-tool isolation.** Each DSL kind owns its schema, refs, emit logic, prefix, role, and category in one self-contained file.
2. **Adding a new primitive = 1 new file** in `dsl/kinds/<category>/` + 1 registry entry + downstream changes outside DSL (`Constraint2D` variant, `point.ts` create logic, fixture, test).
3. **Compound emit supported.** A kind module can emit 1 *primary* entity plus N *auxiliary* (anonymous, internal) entities — enabling future compounds like Simson line (1 line + 3 hidden perpFeet) without changing the interface.
4. **No behavior change for the 22 existing kinds.** All 79 existing tests pass throughout every phase.
5. **Public API stability.** Consumers importing from `dsl/schema.ts` and `dsl/index.ts` see no breaking changes (re-exports stay).

## Non-goals

- ❌ Refactor `Constraint2D` State model (Tier E is stable).
- ❌ Modify `core/scene/kinds/point.ts` renderer.
- ❌ Implement any new primitive in this refactor (excenter, excircle, transforms, Euler, Simson — all follow-up PRs).
- ❌ Modify AI side (`ai/tools.ts` auto-derives from Zod; `ai/prompt.ts` updates when primitives are added later).
- ❌ Migrate fixtures format.

## Design

### Target directory layout

```
src/stamps/geometry-2d/dsl/
├── kinds/
│   ├── _types.ts             ← DslKindModule interface, EmitContext, EmittedNode
│   ├── _shared.ts            ← helpers: resolveTriangle, resolveSegment, etc.
│   ├── _shared.test.ts
│   ├── points/
│   │   ├── free.ts
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
│   │   ├── segment.ts
│   │   ├── line.ts
│   │   ├── ray.ts
│   │   ├── perpendicular.ts
│   │   ├── parallel.ts
│   │   ├── perpBisector.ts
│   │   ├── angleBisector.ts
│   │   └── tangent.ts
│   ├── polygons/
│   │   └── polygon.ts
│   ├── circles/
│   │   ├── circleCP.ts
│   │   └── circle3.ts
│   └── compound/              ← empty initially; future Simson/Euler/excircle live here
├── registry.ts               ← import all kinds → build KIND_REGISTRY + DslEntitySchema
├── transpile.ts              ← thin orchestrator
├── transpile/
│   ├── symbols.ts            (unchanged)
│   ├── cycles.ts             (reads collectRefs via registry)
│   ├── ids.ts                (reads prefix via registry; handles auxiliary id namespacing)
│   ├── errors.ts             (unchanged)
│   └── refs.ts               (thin wrapper calling registry)
├── schema.ts                 ← thin re-export from registry (keeps public API stable)
└── fixtures/                 (unchanged)
```

After Phase 7, `transpile/emitPoint.ts` and `transpile/emitShape.ts` are deleted.

### Module interface

`dsl/kinds/_types.ts`:

```ts
import { z } from 'zod';
import type { SceneObject } from '../../../../core/scene/types';

export type KindRole =
  | 'point'
  | 'segment'
  | 'line'
  | 'ray'
  | 'lineConstruction'  // perpendicular, parallel, perpBisector, angleBisector, tangent
  | 'circle'
  | 'polygon';

export type KindCategory = 'points' | 'lines' | 'polygons' | 'circles' | 'compound';

export interface EmitContext {
  /** Look up the scene-object id assigned to a DSL symbol name. */
  resolveId(name: string): string;
  /** Generate a unique auxiliary id for an internal entity (not addressable from DSL). */
  mintAuxId(parentName: string, suffix: string): string;
  /** Hint lookup for intersection-style emit that needs to know what a referenced symbol is. */
  hintOf(name: string): KindRole;
}

export interface EmittedEntity {
  /** Whether this is the *primary* (named-by-user) entity or an *auxiliary* (internal) one. */
  role: 'primary' | 'auxiliary';
  object: SceneObject;
}

export interface DslKindModule<TKind extends string = string, TInput = unknown> {
  kind: TKind;
  role: KindRole;
  category: KindCategory;
  /** Single-char prefix for primary-id generation (e.g. 'M' for midpoint, 'L' for line). */
  prefix: string;
  /** Zod variant for this kind. The `kind` field must be `z.literal(this.kind)`. */
  schema: z.ZodObject<any>;
  /** Names this entity references (for refs validation + cycle detection). */
  collectRefs: (entity: TInput) => string[];
  /**
   * Emit one primary entity plus zero or more auxiliary entities.
   * The first element MUST have role 'primary'.
   */
  emit: (entity: TInput, ctx: EmitContext) => EmittedEntity[];
}
```

`emit` returns an **array** of entities so compound kinds (future Simson line, Euler line/circle, etc.) can declaratively produce multiple scene objects from a single DSL declaration. All 22 existing kinds return a single-element array `[{ role: 'primary', object }]`.

### Registry assembly

`dsl/registry.ts`:

```ts
// imports: 22 kind modules (kept terse — flat imports from category subfolders)
import { module as freeModule } from './kinds/points/free';
// ... etc

const ALL_MODULES = [
  freeModule, midpointModule, /* ... 22 entries */
] as const;

export const KIND_REGISTRY: ReadonlyMap<string, DslKindModule> =
  new Map(ALL_MODULES.map(m => [m.kind, m]));

export const DslEntitySchema = z.discriminatedUnion(
  'kind',
  ALL_MODULES.map(m => m.schema) as [z.ZodObject<any>, z.ZodObject<any>, ...z.ZodObject<any>[]],
);

// Derived sets (replace hard-coded LINE_LIKE_SHAPE_KINDS / CIRCLE_KINDS)
export const POINT_KINDS = new Set(
  ALL_MODULES.filter(m => m.role === 'point').map(m => m.kind),
);
export const LINE_LIKE_SHAPE_KINDS = new Set(
  ALL_MODULES.filter(m => m.role === 'segment' || m.role === 'line' || m.role === 'ray' || m.role === 'lineConstruction').map(m => m.kind),
);
export const CIRCLE_KINDS = new Set(
  ALL_MODULES.filter(m => m.role === 'circle').map(m => m.kind),
);
```

### Pipeline (unchanged semantics)

```
DSL JSON → DslEntitySchema.parse → buildSymbols → validateRefs → detectCycles → assignIds → emit → State
                                                                                                  ↓
                                                                              registry.get(kind).emit(entity, ctx)
                                                                                                  ↓
                                                                              [primary, ...auxiliaries] all flatten into State.objects
```

`transpile.ts` becomes a thin orchestrator. `transpile/emitPoint.ts` + `transpile/emitShape.ts` are deleted in Phase 7. `assignIds` is extended to know about auxiliary ids (Phase 7 update; pre-existing 22 kinds emit no auxiliaries so behavior unchanged).

### Designed for future extensibility (out of refactor scope, illustrating fit)

These are NOT implemented in this refactor; they motivate the design.

| Future kind | Category | Primary | Auxiliaries |
|---|---|---|---|
| `excenter` | `points/` | 1 point (Constraint2D.excenter or composed from 2 angleBisector + intersection) | none |
| `excircle` (đường tròn bàng tiếp) | `circles/` | 1 circle | 1 hidden excenter point + 1 hidden tangent foot |
| `eulerLine` (đường thẳng Euler) | `compound/` | 1 line through circumcenter + centroid + orthocenter | 3 hidden center points |
| `eulerCircle` / `ninePointCircle` (đường tròn Euler / 9 điểm) | `compound/` | 1 circle | 9 hidden derived points |
| `simsonLine` (đường thẳng Simson) | `compound/` | 1 line | 3 hidden perpFoot points |
| `reflect` / `rotate` / `translate` / `dilate` | `points/` (transforms) | 1 point | none |

Adding any of these = 1 new file in the appropriate category folder + 1 registry entry + (for atomic kinds) `Constraint2D` variant + `point.ts` create logic + fixture/test. **No existing kind module is touched.**

## Migration plan — 7 phases, 2 PRs

PR1 = Phase 1-4 (metadata + lookups, no emit change).
PR2 = Phase 5-7 (emit migration + cleanup).
Each phase ends with 79 tests + typecheck green before commit.

### Phase 1 — Skeleton (PR1)

- Create `kinds/_types.ts`, `kinds/_shared.ts` (empty), `registry.ts` (empty map).
- Create category folders: `kinds/points/`, `kinds/lines/`, `kinds/polygons/`, `kinds/circles/`, `kinds/compound/` (empty).
- Import `KIND_REGISTRY` in `transpile.ts` (no-op usage).
- ✅ Tests green.

### Phase 2 — Migrate `collectRefs` (PR1)

- For each of 22 kinds: create `kinds/<category>/<kind>.ts` exporting `{ kind, role, category, collectRefs }`. Schema/emit/prefix are placeholder values (filled in later phases).
- Register all modules in `KIND_REGISTRY`.
- Replace `transpile/refs.ts:collectRefs` switch with `KIND_REGISTRY.get(entity.kind).collectRefs(entity)`.
- Replace `LINE_LIKE_SHAPE_KINDS` / `CIRCLE_KINDS` Sets with derivations from registry.
- ✅ Tests green.

### Phase 3 — Migrate `prefix` (PR1)

- Each kind module sets concrete `prefix` value (matches current `ids.ts:prefixFor` output).
- Replace `transpile/ids.ts:prefixFor` switch with `KIND_REGISTRY.get(kind).prefix`.
- ✅ Tests green.

### Phase 4 — Migrate `hintOf` (PR1)

- Replace `transpile.ts:hintOf` switch with `KIND_REGISTRY.get(kind).role`.
- ✅ Tests green. **PR1 ready for review.**

### Phase 5 — Migrate `emit` (PR2)

- For each kind module, implement `emit(entity, ctx)` returning `[{ role: 'primary', object }]`. Move logic from `transpile/emitPoint.ts` or `transpile/emitShape.ts` switch case into the kind file.
- Extract shared helpers (resolve 3 triangle vertices, resolve 2 segment endpoints, etc.) into `kinds/_shared.ts`.
- Build `EmitContext` minimally — start with `resolveId(name)` + `hintOf(name)` (intersection needs both). Add `mintAuxId` as a no-op stub for now (no kind uses it yet).
- After each kind migrated, replace its switch case in `emitPoint.ts` / `emitShape.ts` with a registry dispatch fallback. Keep old switch cases until all kinds migrated.
- After last kind migrated, the old switches become unreachable.
- ✅ Tests green after each kind. **Phase 5 is the highest-risk phase — run full test suite after every kind migrated.**

### Phase 6 — Migrate `schema` (PR2)

- Each kind module sets concrete `schema` (Zod variant).
- `dsl/schema.ts` rebuilds `DslEntitySchema` from registry. Keep public exports (`DslPoint`, `DslShape`, `DslInput`, `NameZ`, `DslPointT`, `DslShapeT`, `DslInputT`) identical via re-export.
- ✅ Tests green.

### Phase 7 — Cleanup (PR2)

- Delete `transpile/emitPoint.ts`, `transpile/emitShape.ts`.
- Delete obsolete switches in `transpile/refs.ts`, `transpile/ids.ts`, `transpile.ts:hintOf` (replaced by registry lookups in earlier phases — verify no stragglers).
- Extend `assignIds` to handle the registry-driven flow + flatten primary/auxiliary entities. (Even though no current kind emits auxiliaries, the implementation must exist so future compound kinds can land in a single file.)
- Add unit tests:
  - `registry.test.ts`: completeness, prefix-set uniqueness allowance per role, role consistency, schema discriminator coverage, kind name = schema literal.
  - `kinds/_shared.test.ts`: helper functions.
- ✅ Tests green. **PR2 ready for review.**

## Testing strategy

- **79 existing tests are the safety net.** Every phase ends with full `npm test` + `npm run typecheck` green.
- **No per-kind test colocated** for the 22 existing kinds — they're already covered by `transpile.*.test.ts` integration tests + 9 fixtures. Future new primitives MAY colocate `kinds/<category>/__tests__/<kind>.test.ts`.
- **New unit tests in Phase 7:**
  - `registry.test.ts`:
    - Every kind in the runtime registry has a Zod schema with matching literal.
    - Every `role === 'point'` kind has a prefix in the "point prefix set"; every shape role has a prefix in its respective set (uniqueness *within* role group, not global — `'L'` is OK for both `line` and `lineConstruction` because they share ID space).
    - Module file location matches `category` (e.g. `points/midpoint.ts` has `category: 'points'`).
    - Discriminated-union coverage: every kind in the registry appears in `DslEntitySchema`.
  - `kinds/_shared.test.ts`: helpers (resolveTriangle, resolveSegment, etc.).
- **Per-kind test colocation** is the new norm starting with the first follow-up primitive added after this refactor.

## Risks

- **EmitContext interface leak.** Per-kind emit may rely on captured context. Mitigation: start with the minimum (`resolveId`, `hintOf`, `mintAuxId`), add fields only as concrete needs surface during migration.
- **Zod discriminated union ordering.** `z.discriminatedUnion` requires a non-empty tuple `[Z, Z, ...Z[]]`. The `ALL_MODULES.map(m => m.schema) as [...]` cast in `registry.ts` is the standard workaround; verify Zod inference still surfaces the right type.
- **Cycle/refs subtle regressions.** `collectRefs` ordering matters for cycle detection. Phase 2 must preserve the exact ref list per kind. Mitigation: existing `transpile.cycles.test.ts` + `transpile.refs.test.ts` catch this.
- **Auxiliary id namespacing** (Phase 7) is new logic — no current test covers it. Add 1-2 unit tests for `mintAuxId` collision handling even though no kind uses it yet, to lock the contract for future compounds.
- **Helper extraction creep.** `_shared.ts` could turn into a dumping ground. Mitigation: only extract a helper when 2+ kind modules use it; keep helpers stateless and small.

## Open questions

- Concrete shape of `EmitContext` for `intersection` and `tangent` emit (they need both `resolveId` and `hintOf`). Final signature decided during Phase 5; the design constrains it to "read-only lookups, no mutation".

## Acceptance criteria

- ✅ `dsl/kinds/` contains 22 kind modules organized into subfolders (`points/`, `lines/`, `polygons/`, `circles/`, `compound/`) + `_types.ts` + `_shared.ts`.
- ✅ `dsl/registry.ts` exports `KIND_REGISTRY`, `DslEntitySchema`, `POINT_KINDS`, `LINE_LIKE_SHAPE_KINDS`, `CIRCLE_KINDS`.
- ✅ `transpile/emitPoint.ts`, `transpile/emitShape.ts` deleted.
- ✅ All switches enumerating kinds in `transpile.ts`, `transpile/refs.ts`, `transpile/ids.ts` are replaced by registry lookups (no kind name string appears more than once outside its own kind module file or fixtures).
- ✅ `EmitContext` includes `resolveId`, `hintOf`, and `mintAuxId` — last one is a working implementation even though no migrated kind uses it.
- ✅ Adding a hypothetical compound primitive (e.g. `simsonLine`) would require touching only `kinds/compound/simsonLine.ts` + 1 line in `registry.ts` + downstream consumer files (Constraint2D, point.ts, fixture/test) — no edits to other kind modules.
- ✅ Public API of `dsl/schema.ts` unchanged (DslPoint, DslShape, DslInput, NameZ + type exports).
- ✅ 79 existing tests pass + new registry tests added.
- ✅ `npm run typecheck` green.
