# Phase 2.0 — DSL v1 + Transpiler (no LLM yet)

**Status:** Spec approved by user 2026-05-25 (pending review của file này).
**Target version:** v0.23.0 (no consumer-visible feature; internal foundation).
**Foundation for:** Phase 2.1 (Claude SDK integration), 2.2 (UX), 2.3 (eval harness).

Tracks GitHub issue **#40**. See also `[[project_ai_feature_phase2_decisions]]`.

---

## Mục tiêu

Xây dựng nền móng AI figure generation: định nghĩa **DSL** (declarative JSON) mà LLM sẽ emit ở Phase 2.1, kèm **transpiler** (DSL → `geometry-2d` State). Phase 2.0 không có LLM — fixture-driven tests verify mechanism.

**Tại sao tách Phase 2.0 thành PR riêng (no LLM):**
1. DSL + transpiler deterministic, dễ unit-test → caught bug early trước khi mix LLM stochasticity.
2. Fixture corpus (9 đề mẫu) trở thành prompt-engineering material cho Phase 2.1.
3. Phase 2.1 (provider/prompt) iterate riêng mà không phải re-debug transpiler.

---

## Scope

**In scope (Phase 2.0):**
- Zod schema `DslInput` cho version 1.
- Core MVP primitives: 22 kinds (11 point-like + 11 shape-like).
- Transpiler 6-stage pipeline: schema → symbols → refs → cycles → ids → emit.
- Strict + collected errors (`TranspileResult`).
- 9 fixture đề mẫu Vietnamese textbook.
- Unit tests per module + fixture integration tests.

**Out of scope (defer phase 2.1+):**
- Claude SDK / `@anthropic-ai/sdk` integration (Phase 2.1).
- System prompt / few-shot examples (Phase 2.1).
- UX input "AI prompt" trong EditorPanel (Phase 2.2).
- Eval harness (Phase 2.3).
- Decorations (length label, right-angle mark, angle marker — Phase 2.5).
- `Constraint2D.transformed` (translate/rotate/reflect/dilate) — lớp 11+.
- `onAxis`, `onPolygon`, `angleBisectorLines` — hiếm dùng đề THCS-lớp10.
- Arc, sector — không có DSL primitive.
- Đường tròn theo bán kính số (`circleCR`) — State không hỗ trợ; LLM dùng pattern `circleCP` + helper anchor.

---

## Decisions chốt (brainstorm 2026-05-25)

1. **DSL kind + field naming 1:1 với State.** Tránh translation layer. Đặt DSL field exactly như Constraint2D / Attrs hiện có (`p1/p2`, `segmentId`, `throughPoint/toLine`, `vertices`, `from/onLine`).
2. **Named entities + ref by name.** Mọi entity có `name` field. Constraints reference bằng name. Transpiler resolve name → id.
3. **Core MVP primitives (22).** Đủ cho tam giác + tứ giác + đường tròn + đường phụ.
4. **Strict + collected errors.** Transpiler return `{ ok: true, state } | { ok: false, errors[] }`. Collect tất cả errors từ stage 2-4 trước khi return.
5. **DSL là data layer chung, không phải AI-only.** Đặt `src/stamps/geometry-2d/dsl/` (KHÔNG nest trong `ai/`). Tương lai tab "Đối tượng" (`ObjectRow`) sẽ đọc DSL như source of truth display. Phase 2.1 `src/stamps/geometry-2d/ai/` chứa provider + prompt riêng, import từ `dsl/`.
6. **Minimal DSL — chỉ entities.** Scene metadata (axes, grid, viewport) dùng default geometry-2d State.
7. **Id generation counter-based.** Prefix theo State kind (`p`, `s`, `l`, `r`, `poly`, `c`, `i`). Reset mỗi lần transpile. Deterministic theo thứ tự DSL.
8. **Drop `circleCR` từ DSL v1.** State không hỗ trợ center+radius (chỉ center+surfacePoint hoặc circumscribed). LLM dùng workaround: anchor helper + `circleCP`.

---

## Design

### DSL grammar v1 (Zod)

File: `src/stamps/geometry-2d/dsl/schema.ts`

```ts
import { z } from 'zod';

// Label-style name: chữ cái Latin đầu, cho phép unicode prime (') + subscript ₀-₉.
// Max 12 ký tự. Phân biệt hoa/thường.
export const NameZ = z.string().regex(/^[A-Za-z][A-Za-z0-9_'₀-₉]{0,11}$/);

// === Point-like entities ===
// "Point-like" gồm point thực + intersection (State có kind 'intersection' riêng).
// DSL gộp vào 1 array để LLM thấy chúng như "điểm" theo trực giác.

export const DslPoint = z.discriminatedUnion('kind', [
  z.object({ name: NameZ, kind: z.literal('free'),
             x: z.number().finite(), y: z.number().finite() }),
  z.object({ name: NameZ, kind: z.literal('midpoint'),
             p1: NameZ, p2: NameZ }),
  z.object({ name: NameZ, kind: z.literal('onSegment'),
             segmentId: NameZ, t: z.number().min(0).max(1) }),
  z.object({ name: NameZ, kind: z.literal('onLine'),
             lineId: NameZ, t: z.number().finite() }),
  z.object({ name: NameZ, kind: z.literal('onCircle'),
             circleId: NameZ, theta: z.number() }),
  z.object({ name: NameZ, kind: z.literal('perpFoot'),
             from: NameZ, onLine: NameZ }),
  z.object({ name: NameZ, kind: z.literal('circumcenter'),
             vertices: z.tuple([NameZ, NameZ, NameZ]) }),
  z.object({ name: NameZ, kind: z.literal('incenter'),
             vertices: z.tuple([NameZ, NameZ, NameZ]) }),
  z.object({ name: NameZ, kind: z.literal('centroid'),
             vertices: z.tuple([NameZ, NameZ, NameZ]) }),
  z.object({ name: NameZ, kind: z.literal('orthocenter'),
             vertices: z.tuple([NameZ, NameZ, NameZ]) }),
  z.object({ name: NameZ, kind: z.literal('intersection'),
             ref1: NameZ, ref2: NameZ,
             branch: z.union([z.literal(0), z.literal(1)]).optional() }),
]);

// === Shape-like entities ===
// segment / line / ray / polygon + line constructions + circle constructions.

export const DslShape = z.discriminatedUnion('kind', [
  z.object({ name: NameZ, kind: z.literal('segment'),
             p1: NameZ, p2: NameZ }),
  z.object({ name: NameZ, kind: z.literal('line'),
             p1: NameZ, p2: NameZ }),
  z.object({ name: NameZ, kind: z.literal('ray'),
             origin: NameZ, through: NameZ }),
  z.object({ name: NameZ, kind: z.literal('polygon'),
             vertices: z.array(NameZ).min(3) }),

  // Line constructions — phái sinh line từ ref khác
  z.object({ name: NameZ, kind: z.literal('perpendicular'),
             throughPoint: NameZ, toLine: NameZ }),
  z.object({ name: NameZ, kind: z.literal('parallel'),
             throughPoint: NameZ, toLine: NameZ }),
  z.object({ name: NameZ, kind: z.literal('perpBisector'),
             p1: NameZ, p2: NameZ }),
  z.object({ name: NameZ, kind: z.literal('angleBisector'),
             p1: NameZ, vertex: NameZ, p2: NameZ }),
  z.object({ name: NameZ, kind: z.literal('tangent'),
             throughPoint: NameZ, toCircle: NameZ,
             branch: z.union([z.literal(0), z.literal(1), z.literal('on')]).optional() }),

  // Circle constructions
  z.object({ name: NameZ, kind: z.literal('circleCP'),  // center + 1 điểm bề mặt
             center: NameZ, surfacePoint: NameZ }),
  z.object({ name: NameZ, kind: z.literal('circle3'),   // ngoại tiếp 3 điểm
             p1: NameZ, p2: NameZ, p3: NameZ }),
]);

export const DslInput = z.object({
  version: z.literal(1),
  points: z.array(DslPoint),
  shapes: z.array(DslShape).default([]),
});

export type DslPointT = z.infer<typeof DslPoint>;
export type DslShapeT = z.infer<typeof DslShape>;
export type DslInputT = z.infer<typeof DslInput>;
```

**Naming rationale (đã verify với State code):**
- Match State Constraint2D field names: `p1/p2` cho midpoint, `segmentId`/`lineId`/`circleId` cho on-* constraints, `vertices` tuple cho triangle centers, `from`/`onLine` cho perpFoot.
- Match State Attrs field names: `p1/p2` cho segment + line + perpBisector, `origin/through` cho ray, `throughPoint/toLine` cho perpendicular + parallel, `p1/vertex/p2` cho angleBisector, `throughPoint/toCircle` cho tangent, `center/surfacePoint` cho circle, `p1/p2/p3` cho circle3 (CircleConstruction `circumscribed`).
- Match State IntersectionAttrs: `ref1/ref2/branch?`. DSL outer kind `'intersection'`; transpiler infer inner kind (`lineLine | lineCircle | circleCircle`) từ kind của ref1/ref2 entities.

### Transpiler pipeline (6 stage)

File: `src/stamps/geometry-2d/dsl/transpile.ts` (orchestrator)

```
transpile(dslRaw: unknown): TranspileResult
  1. Schema parse          → DslInput.safeParse()
                            fail → return { ok:false, errors:[SCHEMA] } NGAY
  2. Symbol table          → Map<name, entity>
                            duplicate → DUPLICATE_NAME (collect, tiếp)
  3. Resolve refs          → check each ref + kind compat
                            missing → UNKNOWN_REF (collect, tiếp)
                            wrong kind → KIND_MISMATCH (collect, tiếp)
  4. Cycle detect          → 3-color DFS dep graph
                            cycle → CYCLE (collect, tiếp)
  → if any errors from 2-4: return { ok:false, errors }
  5. Id assignment         → counter-based, deterministic order
  6. Emit State            → per-kind translator, build state.objects
  → return { ok:true, state }
```

Errors stage 2-4 thu thập trước khi return. Stage 1 phải pass mới qua stage 2.

### Error model

File: `src/stamps/geometry-2d/dsl/transpile/errors.ts`

```ts
export type TranspileErrorCode =
  | 'SCHEMA'
  | 'DUPLICATE_NAME'
  | 'UNKNOWN_REF'
  | 'KIND_MISMATCH'
  | 'CYCLE';

export interface TranspileError {
  code: TranspileErrorCode;
  message: string;       // tiếng Việt cho UX, sau Phase 2.2 có thể i18n
  path?: string[];       // ví dụ ['H', 'onLine']
  hint?: string;         // suggestion (hiển thị developer + later, gửi LLM retry)
}

export type TranspileResult =
  | { ok: true; state: SceneState }
  | { ok: false; errors: TranspileError[] };
```

### Kind compatibility table

Tham chiếu cho `transpile/refs.ts`. "Point-like" = point hoặc intersection (cả 2 visualize as points trong State).

| Field | Allowed kinds (DSL kinds) |
|---|---|
| `midpoint.p1/p2` | point-like |
| `onSegment.segmentId` | segment |
| `onLine.lineId` | line, segment, ray, perpendicular, parallel, perpBisector, angleBisector, tangent |
| `onCircle.circleId` | circleCP, circle3 |
| `perpFoot.from` | point-like |
| `perpFoot.onLine` | giống `onLine.lineId` |
| `*.vertices[i]` (triangle centers) | point-like |
| `intersection.ref1/ref2` | line-like (line/segment/ray + 5 line constructions) OR circle-like (circleCP/circle3). Transpiler infer subKind từ 2 ref kinds. |
| `segment.p1/p2`, `line.p1/p2`, `polygon.vertices[i]` | point-like |
| `ray.origin/through` | point-like |
| `perpendicular.throughPoint`, `parallel.throughPoint`, `tangent.throughPoint` | point-like |
| `perpendicular.toLine`, `parallel.toLine` | giống `onLine.lineId` |
| `perpBisector.p1/p2` | point-like |
| `angleBisector.p1/vertex/p2` | point-like |
| `tangent.toCircle` | circleCP, circle3 |
| `circleCP.center` | point-like |
| `circleCP.surfacePoint` | point-like |
| `circle3.p1/p2/p3` | point-like |

### Cycle detection

3-color DFS (white → gray → black). Khi revisit `gray` → cycle. Chain reconstruct qua parent map.

Edge case: self-cycle (entity ref chính nó) phát hiện ngay khi build dep graph.

### Id assignment

Counter-based, deterministic. Prefix theo State kind:

| DSL kind | State kind | Id prefix |
|---|---|---|
| 10 DslPoint kinds (trừ intersection) | point | `p` |
| intersection | intersection | `i` |
| segment | segment | `s` |
| line, perpendicular, parallel, perpBisector, angleBisector, tangent | line | `l` |
| ray | ray | `r` |
| polygon | polygon | `poly` |
| circleCP, circle3 | circle | `c` |

Format `<prefix><counter>`. Counter shared per-prefix, reset mỗi lần `transpile()`. Counter trong DSL order (ổn định cho snapshot).

### State emit

Mỗi DSL entity → 1 SceneObject. Field mapping:

**Points** (constraint là Constraint2D field):

| DSL | State `attrs.constraint` |
|---|---|
| `free {x, y}` | `{ kind: 'free', x, y }` |
| `midpoint {p1, p2}` | `{ kind: 'midpoint', p1: id, p2: id }` |
| `onSegment {segmentId, t}` | `{ kind: 'onSegment', segmentId: id, t }` |
| `onLine {lineId, t}` | `{ kind: 'onLine', lineId: id, t }` |
| `onCircle {circleId, theta}` | `{ kind: 'onCircle', circleId: id, theta }` |
| `perpFoot {from, onLine}` | `{ kind: 'perpFoot', from: id, onLine: id }` |
| `circumcenter {vertices}` | `{ kind: 'circumcenter', vertices: [id, id, id] }` |
| `incenter {vertices}` | `{ kind: 'incenter', vertices: [id, id, id] }` |
| `centroid {vertices}` | `{ kind: 'centroid', vertices: [id, id, id] }` |
| `orthocenter {vertices}` | `{ kind: 'orthocenter', vertices: [id, id, id] }` |

Wrap: `{ id, kind: 'point', label: name, attrs: { constraint: <above> } }`.

**Intersection** (separate top-level kind):

DSL `{name, kind: 'intersection', ref1, ref2, branch?}`
→ State `{ id, kind: 'intersection', label: name, attrs: { kind: '<inferred>', ref1: id, ref2: id, branch? } }`
where inferred kind:
- 2 line-like refs → `lineLine` (branch ignored)
- 1 line-like + 1 circle-like → `lineCircle` (branch default 0)
- 2 circle-like refs → `circleCircle` (branch default 0)

**Shapes** (each maps to State Attrs of relevant kind):

| DSL | State object |
|---|---|
| `segment {p1, p2}` | `{ kind: 'segment', attrs: { p1, p2 } }` |
| `line {p1, p2}` | `{ kind: 'line', attrs: { p1, p2 } }` (no construction) |
| `ray {origin, through}` | `{ kind: 'ray', attrs: { origin, through } }` |
| `polygon {vertices}` | `{ kind: 'polygon', attrs: { vertices } }` |
| `perpendicular {throughPoint, toLine}` | `{ kind: 'line', attrs: { construction: { kind: 'perpendicular', throughPoint, toLine } } }` |
| `parallel {...}` | tương tự perpendicular |
| `perpBisector {p1, p2}` | `{ kind: 'line', attrs: { construction: { kind: 'perpBisector', p1, p2 } } }` |
| `angleBisector {p1, vertex, p2}` | `{ kind: 'line', attrs: { construction: { kind: 'angleBisector', p1, vertex, p2 } } }` |
| `tangent {throughPoint, toCircle, branch?}` | `{ kind: 'line', attrs: { construction: { kind: 'tangent', throughPoint, toCircle, branch } } }` |
| `circleCP {center, surfacePoint}` | `{ kind: 'circle', attrs: { center, surfacePoint } }` |
| `circle3 {p1, p2, p3}` | `{ kind: 'circle', attrs: { construction: { kind: 'circumscribed', p1, p2, p3 } } }` |

Tất cả refs đã được resolve name → id ở stage 5.

Lưu ý: State emit theo thứ tự DSL declared. JxgRenderer sẽ topo-sort khi render, transpiler không cần sort.

### File layout

```
src/stamps/geometry-2d/
├── dsl/                             ← DSL là data layer chung (NOT AI-only)
│   ├── schema.ts                    Zod schema + types + NameZ
│   ├── transpile.ts                 main entry, orchestrate 6 stages
│   ├── transpile/
│   │   ├── symbols.ts               build Map<name, entity> + dup check
│   │   ├── refs.ts                  ref existence + kind compat (table-driven)
│   │   ├── cycles.ts                3-color DFS dep graph
│   │   ├── ids.ts                   counter-based id assignment
│   │   ├── emitPoint.ts             DSL point/intersection → State
│   │   ├── emitShape.ts             DSL shape → State line/ray/segment/polygon/circle
│   │   └── errors.ts                TranspileError type + helpers
│   ├── fixtures/
│   │   ├── triangle-equilateral.ts
│   │   ├── triangle-median.ts
│   │   ├── triangle-altitude.ts
│   │   ├── triangle-centroid.ts
│   │   ├── triangle-orthocenter.ts
│   │   ├── triangle-circumcircle.ts
│   │   ├── triangle-incircle.ts
│   │   ├── parallelogram.ts
│   │   └── two-circles-intersect.ts
│   └── __tests__/
│       ├── schema.test.ts
│       ├── transpile.symbols.test.ts
│       ├── transpile.refs.test.ts
│       ├── transpile.cycles.test.ts
│       ├── transpile.emit.test.ts
│       └── transpile.fixtures.test.ts
└── ai/                              ← Phase 2.1+ (NOT in scope Phase 2.0)
    ├── provider.ts                  Claude SDK wrap
    └── prompt.ts                    system prompt + few-shot
```

**Public re-export** (cho `ObjectRow` / future consumers):
- `src/stamps/geometry-2d/dsl/index.ts` re-export `DslInput`, `DslInputT`, `transpile`, `TranspileResult` (NOT internal transpile/* modules).

---

## Testing plan

### Unit tests (per module)

- **`dsl.schema.test.ts`** — happy path mỗi kind + negative (name regex fail, missing field, wrong type, intersection branch out-of-range).
- **`transpile.symbols.test.ts`** — single OK, duplicate → DUPLICATE_NAME, empty list OK.
- **`transpile.refs.test.ts`** — unknown ref → UNKNOWN_REF, kind mismatch matrix (point→shape, shape→point, line-kind→circle-only field).
- **`transpile.cycles.test.ts`** — no cycle, self-cycle, 2-cycle, 3-cycle, long chain, multiple disconnected components.
- **`transpile.emit.test.ts`** — mỗi DSL kind → assert State object shape + id format + label match.

### Integration tests (fixtures)

`transpile.fixtures.test.ts` loop qua 9 fixtures:
- `transpile(fixture.dsl)` → `{ ok: true, state }`
- assert `state.objects.length === expected`
- assert id format valid
- 2 fixtures đại diện (`triangle-equilateral`, `parallelogram`) snapshot toàn bộ state (inline).

### Negative fixtures (edge cases)

- Cycle: M là midpoint của (M, B) → CYCLE
- Unknown: H perpFoot from='Z' (không khai báo Z) → UNKNOWN_REF
- Mismatch: tangent.toCircle='AB' (segment, không phải circle) → KIND_MISMATCH
- Duplicate: 2 points name='A' → DUPLICATE_NAME
- Intersection ref kinds mismatch: ref1='point', ref2='line' → KIND_MISMATCH (point không phải line/circle)

### Test counts (estimate)

- Schema: ~25 tests
- Symbols: ~5
- Refs: ~15
- Cycles: ~6
- Emit: ~22
- Fixtures: 9 + 2 snapshot = ~11

**Total: ~84 new tests.** Phù hợp scope Phase 2.0.

---

## Fixture corpus (9 đề)

| File | Problem (Vietnamese) | Primitives covered |
|---|---|---|
| `triangle-equilateral.ts` | Cho tam giác đều ABC cạnh 4. | free, polygon |
| `triangle-median.ts` | Tam giác ABC, M là trung điểm BC. Vẽ AM. | free, midpoint, polygon, segment |
| `triangle-altitude.ts` | Tam giác ABC, AH là đường cao xuống BC. | free, perpFoot, polygon, segment |
| `triangle-centroid.ts` | Tam giác ABC, G là trọng tâm. | free, centroid, polygon |
| `triangle-orthocenter.ts` | Tam giác ABC, H là trực tâm. | free, orthocenter, polygon |
| `triangle-circumcircle.ts` | Tam giác ABC nội tiếp đường tròn tâm O. | free, circumcenter, polygon, circle3 |
| `triangle-incircle.ts` | Tam giác ABC, I là tâm nội tiếp, đường tròn (I) tiếp xúc BC tại D. | free, incenter, perpFoot, polygon, circleCP |
| `parallelogram.ts` | Hình bình hành ABCD, hai đường chéo AC, BD cắt nhau tại O. | free, polygon, segment, intersection, line |
| `two-circles-intersect.ts` | Hai đường tròn (O₁), (O₂) cắt nhau tại P, Q. | free, circleCP × 2, intersection (circleCircle, branch 0 + 1) |

Mỗi fixture file:
```ts
import type { DslInputT } from '../dsl';
export const fixture: { problem: string; dsl: DslInputT } = {
  problem: "Cho tam giác đều ABC cạnh 4.",
  dsl: {
    version: 1,
    points: [...],
    shapes: [...],
  },
};
```

---

## PR sequencing

Theo pattern subagent (`[[feedback_subagent_execution_pattern]]`): 1 subagent / PR, TDD scaffolding, Sonnet đủ. 4 PR.

### PR 1 — DSL Zod schema + error type + barrel
- `dsl/schema.ts` (Zod schema + types + NameZ)
- `dsl/transpile/errors.ts` (TranspileError type + TranspileResult)
- `dsl/index.ts` (barrel — re-export schema + types, stub transpile placeholder)
- `dsl/__tests__/schema.test.ts`
- ~25 tests

### PR 2 — Validation pipeline (symbols + refs + cycles + ids)
- `dsl/transpile/symbols.ts`
- `dsl/transpile/refs.ts` (kind compat table)
- `dsl/transpile/cycles.ts`
- `dsl/transpile/ids.ts`
- `dsl/__tests__/transpile.symbols.test.ts`
- `dsl/__tests__/transpile.refs.test.ts`
- `dsl/__tests__/transpile.cycles.test.ts`
- ~26 tests

### PR 3 — State emit + main orchestrator
- `dsl/transpile/emitPoint.ts` (cover point + intersection inference)
- `dsl/transpile/emitShape.ts` (cover 11 shape kinds → State Attrs)
- `dsl/transpile.ts` (orchestrate 6 stages, replace stub in barrel)
- `dsl/__tests__/transpile.emit.test.ts`
- ~22 tests

### PR 4 — Fixture corpus + integration tests
- 9 `dsl/fixtures/*.ts` files
- `dsl/__tests__/transpile.fixtures.test.ts`
- 2 inline snapshots
- ~11 tests

### Release
- Tag `v0.23.0` sau PR 4 merge.
- npm publish defer cùng Phase 2.1.

---

## Migration & backward compat

- DSL version 1 — không có legacy data.
- State emit dùng existing State types — không thêm kind mới, không migration.
- `Constraint2D`, `LineConstruction`, `CircleConstruction`, `IntersectionAttrs`, `RayAttrs`, `SegmentAttrs`, `LineAttrs`, `CircleAttrs`, `PolygonAttrs` đã có sẵn (Tier E/E.1). Transpiler chỉ build State objects existing.

---

## Out of scope — phase 2 follow-ups

- **Phase 2.1** — `@anthropic-ai/sdk` provider, tool use `build_figure` với DSL JSON Schema, system prompt tiếng Việt + few-shot examples (dùng 9 fixtures), refusal handling, prompt caching. Code đặt `src/stamps/geometry-2d/ai/`, import DSL từ `../dsl/`.
- **Phase 2.2** — UX input "AI prompt" trong EditorPanel/StampLeftPanel, loading state, error message, insert State vào MiniBoard.
- **Phase 2.3** — Eval harness 20-30 đề SGK.
- **Phase 2.5 (nếu cần)** — Decorations: length label, right-angle mark, angle marker.
- **State → DSL serializer** — Reverse direction để tab "Đối tượng" (`ObjectRow`) hiển thị DSL-style descriptions thay vì raw State. Tracked riêng, không trong Phase 2.0.
- Transforms (translate, rotate, reflect, dilate) — lớp 11+.
- `circleCR` (center+radius numeric) — State chưa hỗ trợ; revisit khi cần.
- Multi-turn AI, image input đề.
- 3D, graph-2d, LaTeX AI generation.

---

## Linked artifacts

- Issue tracker: GitHub issue #40
- Memory: `[[project_ai_feature_phase2_decisions]]`, `[[feedback_subagent_execution_pattern]]`
- Foundation: `[[reference_tier_e_artifacts]]`, `[[reference_tier_e1_artifacts]]`
- State model: `src/core/scene/kinds/{point,line,polygon,intersection,segment,ray,circle,2d-constraint}.ts`
