# DSL kind modules refactor — design

**Date:** 2026-05-29
**Status:** Approved (brainstorm)
**Related:**
- [[2026-05-25-phase2-dsl-transpiler-design]] — original DSL transpiler design
- [[2026-05-23-tier-e-derived-primitives-design]] — Constraint2D State (Tier E)
- GitHub issue #40 — AI figure generation phase 2

## Context / Motivation

The `geometry-2d` DSL transpiler currently has **4 duplicated kind enumerations** scattered across files:

- `dsl/schema.ts` — Zod `discriminatedUnion` listing every kind
- `dsl/transpile.ts:hintOf` — `switch` mapping kind → `'point' | 'shape'`
- `dsl/transpile/refs.ts` — `LINE_LIKE_SHAPE_KINDS` / `CIRCLE_KINDS` Sets + a switch in `collectRefs`
- `dsl/transpile/ids.ts` — `prefixFor` switch mapping kind → ID prefix character

Adding one new primitive (e.g. `excenter`) currently requires touching **~10 logic touch points across 9 production files** — `~5 of which are pure enumeration updates that must stay in lockstep`. The user plans to add **>10 primitives** over time (transforms `reflect/rotate/translate/dilate`, additional centers, decorations-as-kinds, etc.), so this duplication is a real bottleneck.

Tests are strong (79 cases, 9 fixtures roundtrip) — they are the safety net for the refactor.

## Goals

1. **Single source of truth per kind.** Each DSL kind owns its schema, refs, emit logic, prefix, and role in one file.
2. **Adding a new primitive = 1 new file** in `dsl/kinds/` + 1 registry entry + downstream changes outside DSL (`Constraint2D` variant, `point.ts` create logic, fixture, test).
3. **No behavior change.** All 79 existing tests pass throughout every phase.
4. **Public API stability.** Consumers importing from `dsl/schema.ts` and `dsl/index.ts` see no breaking changes.

## Non-goals

- ❌ Refactor `Constraint2D` State model (Tier E is stable).
- ❌ Modify `core/scene/kinds/point.ts` renderer.
- ❌ Add new primitives (excenter, transforms, decorations) in this scope — follow-up PRs.
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
│   ├── midpoint.ts           ← 1 file per kind
│   ├── intersection.ts
│   ├── perpFoot.ts
│   ├── circumcenter.ts
│   ├── incenter.ts
│   ├── centroid.ts
│   ├── orthocenter.ts
│   ├── onSegment.ts
│   ├── onCircle.ts
│   ├── onLine.ts
│   ├── perpendicular.ts
│   ├── parallel.ts
│   ├── perpBisector.ts
│   ├── angleBisector.ts
│   ├── tangent.ts
│   └── circumscribed.ts
├── registry.ts               ← import all kinds → build KIND_REGISTRY + DslEntitySchema
├── transpile.ts              ← thin orchestrator
├── transpile/
│   ├── symbols.ts            (unchanged)
│   ├── cycles.ts             (reads collectRefs via registry)
│   ├── ids.ts                (reads prefix via registry)
│   ├── errors.ts             (unchanged)
│   └── refs.ts               (thin wrapper calling registry)
├── schema.ts                 ← thin re-export from registry (keeps public API stable)
└── fixtures/                 (unchanged)
```

After Phase 7, `transpile/emitPoint.ts` and `transpile/emitShape.ts` are deleted; their per-kind logic lives in `kinds/<kind>.ts`.

### Module interface

`dsl/kinds/_types.ts`:

```ts
import { z } from 'zod';

export type KindRole = 'point' | 'shape';
export type ShapeCategory = 'line' | 'circle';

export interface EmitContext {
  resolveSymbol(name: string): ResolvedRef;
  // additional fields added only as concrete needs surface during Phase 5
}

export interface DslKindModule<TKind extends string = string, TInput = unknown> {
  kind: TKind;
  role: KindRole;
  shapeCategory?: ShapeCategory;          // required iff role === 'shape'
  prefix: string;                          // single ID prefix char, e.g. 'M', 'I', 'L', 'C'
  schema: z.ZodObject<{ kind: z.ZodLiteral<TKind> } & Record<string, z.ZodTypeAny>>;
  collectRefs: (entity: TInput) => string[];
  emit: (entity: TInput, ctx: EmitContext) => EmittedNode;
}
```

### Registry assembly

`dsl/registry.ts`:

```ts
import { midpointModule } from './kinds/midpoint';
import { intersectionModule } from './kinds/intersection';
// ... 13 more imports

const ALL_MODULES = [
  midpointModule,
  intersectionModule,
  // ...
] as const;

export const KIND_REGISTRY: ReadonlyMap<string, DslKindModule> =
  new Map(ALL_MODULES.map(m => [m.kind, m]));

export const DslEntitySchema = z.discriminatedUnion(
  'kind',
  ALL_MODULES.map(m => m.schema) as [z.ZodObject<any>, z.ZodObject<any>, ...z.ZodObject<any>[]],
);

// Derived sets (replaces hard-coded LINE_LIKE_SHAPE_KINDS / CIRCLE_KINDS)
export const POINT_KINDS = new Set(ALL_MODULES.filter(m => m.role === 'point').map(m => m.kind));
export const LINE_LIKE_SHAPE_KINDS = new Set(
  ALL_MODULES.filter(m => m.role === 'shape' && m.shapeCategory === 'line').map(m => m.kind),
);
export const CIRCLE_KINDS = new Set(
  ALL_MODULES.filter(m => m.role === 'shape' && m.shapeCategory === 'circle').map(m => m.kind),
);
```

### Top-level transpile flow (unchanged semantics)

```
DSL JSON → DslEntitySchema.parse → resolveSymbols → checkCycles → emitAll → Constraint2D State
                                            ↓                ↓
                               registry.collectRefs   registry.emit
```

`transpile.ts` becomes a thin orchestrator. `transpile/emitPoint.ts` + `transpile/emitShape.ts` are deleted in Phase 7.

## Migration plan — 7 phases, 2 PRs

PR1 = Phase 1-4 (metadata + lookups, no emit change).
PR2 = Phase 5-7 (emit migration + cleanup).
Each phase ends with 79 tests + typecheck green before commit.

### Phase 1 — Skeleton (PR1)

- Create `kinds/_types.ts`, `kinds/_shared.ts` (empty), `registry.ts` (empty map).
- Import `KIND_REGISTRY` in `transpile.ts` (no-op usage).
- ✅ Tests green.

### Phase 2 — Migrate `collectRefs` (PR1)

- Create `kinds/<kind>.ts` for each of 15 kinds, exporting `{ kind, role, shapeCategory?, collectRefs }`. Schema/emit/prefix are placeholder values (will be filled later phases).
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

- For each kind module, implement `emit(entity, ctx)`. Move logic from `transpile/emitPoint.ts` or `transpile/emitShape.ts` switch case into the corresponding `kinds/<kind>.ts`.
- Extract shared helpers (resolve 3 triangle vertices, resolve 2 segment endpoints, etc.) into `kinds/_shared.ts`.
- After each kind migrated, replace its switch case in `emitPoint.ts` / `emitShape.ts` with a registry dispatch fallback. Keep old switch cases until all kinds migrated.
- After last kind migrated, the old switches become unreachable.
- ✅ Tests green after each kind. **Phase 5 is the highest-risk phase — run full test suite after every kind migrated.**

### Phase 6 — Migrate `schema` (PR2)

- Each kind module sets concrete `schema` (Zod variant).
- `dsl/schema.ts` rebuilds `DslEntitySchema` from registry. Keep public exports (`DslEntitySchema`, `DslPoint`, `DslShape`) identical.
- ✅ Tests green.

### Phase 7 — Cleanup (PR2)

- Delete `transpile/emitPoint.ts`, `transpile/emitShape.ts`.
- Delete obsolete switches in `transpile/refs.ts`, `transpile/ids.ts`, `transpile.ts:hintOf` (replaced by registry lookups in earlier phases — verify no stragglers).
- Add unit tests:
  - `registry.test.ts`: completeness, prefix uniqueness, role consistency, schema discriminator coverage, kind name = schema literal.
  - `kinds/_shared.test.ts`: helper functions.
- ✅ Tests green. **PR2 ready for review.**

## Testing strategy

- **79 existing tests are the safety net.** Every phase ends with full `npm test` + `npm run typecheck` green.
- **No per-kind test colocated** for the 15 existing kinds — they're already covered by `transpile.*.test.ts` integration tests + 9 fixtures. Future new primitives MAY colocate `kinds/__tests__/<kind>.test.ts`.
- **New unit tests in Phase 7:**
  - `registry.test.ts`:
    - Every kind in the runtime registry has a matching Zod schema literal.
    - All prefixes are unique.
    - Every `role === 'shape'` module has a `shapeCategory`.
    - Every `role === 'point'` module has no `shapeCategory`.
  - `kinds/_shared.test.ts`: helpers (resolveTriangle, resolveSegment, etc.).

## Risks

- **Phase 5 emit logic divergence.** Per-kind emit may rely on captured context (resolved symbols, generated IDs). The `EmitContext` interface needs to be designed before Phase 5; if it grows too wide, the abstraction leaks. Mitigation: start with the minimum (`resolveSymbol`) and add fields only as concrete needs arise during migration.
- **Zod discriminated union ordering.** `z.discriminatedUnion` requires a non-empty tuple `[Z, Z, ...Z[]]`. The `ALL_MODULES.map(m => m.schema) as [...]` cast in `registry.ts` is the standard workaround; verify Zod inference still surfaces the right `DslEntity` type.
- **Helper extraction creep.** `_shared.ts` could turn into a dumping ground. Mitigation: only extract a helper when 2+ kind modules use it; keep helpers stateless and small.
- **Cycle/refs subtle regressions.** `collectRefs` ordering matters for cycle detection. Phase 2 must preserve the exact ref list per kind. Mitigation: existing `transpile.cycles.test.ts` + `transpile.refs.test.ts` catch this.

## Open questions

None at the moment. Concrete `EmitContext` shape will be discovered during Phase 5 — defer to the implementation plan.

## Acceptance criteria

- ✅ `dsl/kinds/` contains 15 kind modules + `_types.ts` + `_shared.ts`.
- ✅ `dsl/registry.ts` exports `KIND_REGISTRY`, `DslEntitySchema`, `POINT_KINDS`, `LINE_LIKE_SHAPE_KINDS`, `CIRCLE_KINDS`.
- ✅ `transpile/emitPoint.ts`, `transpile/emitShape.ts` deleted.
- ✅ All switches enumerating kinds in `transpile.ts`, `transpile/refs.ts`, `transpile/ids.ts` are replaced by registry lookups (no kind name appears more than once outside its own module).
- ✅ Adding a hypothetical new primitive `excenter` would require touching ≤ 5 files (kind module + registry entry + Constraint2D variant + point.ts create + fixture/test) — verified by example or follow-up PR.
- ✅ Public API of `dsl/schema.ts` unchanged.
- ✅ 79 existing tests pass + new registry tests added.
- ✅ `npm run typecheck` green.
