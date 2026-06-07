# Mức 3 Phase 4 — point.ts → point-constraints registry (design)

- **Ngày:** 2026-06-07 · **Issue:** #45 (Phase 4, phần defer của Mức 3)
- **Tiền đề:** Mức 3 Phase 2/5/6 (`docs/superpowers/results/2026-06-07-deterministic-first-muc3.md`).
- **Bản chất:** REFACTOR **behavior-preserving** — tách 3 switch lớn trong `point.ts` thành registry nội bộ, output render/describe/validate khớp **byte**. Scope đã chốt: **Focused + batched**.

## Mục tiêu & scope

`src/core/scene/kinds/point.ts` (527 dòng) gom 1 KindDef cho `type='point'` với 3 switch lớn: `render` (25-way), `describe` (28-way), `validate` (if-chain ~6 kind). Mục tiêu: tách per-constraint-kind thành `point-constraints/<kind>.ts`, point.ts giữ **1 KindDef mỏng** dispatch qua registry nội bộ keyed `constraint.kind`. Thêm constraint mới = 1 module + 1 dòng register, **0 sửa switch point.ts**.

**Trong scope:** tách `render` + `describe` + `validate` (3 switch); helper dùng chung (`buildJxgTransforms`, `makeDistanceFn`) → `shared.ts`; render-golden + describe-golden safety net.

**Ngoài scope (giữ nguyên):** `dependsOn` (delegate `constraintRefs2D` ở `2d-constraint.ts` — 1 dòng); `measure` (free-only, tiny); `update` (free→free, tiny — ở point.ts vì là endpoint drag-sync); `constraintRefs2D` arms (Full-registry variant đã loại). `registerKind` 1 lần cho `type='point'` không đổi.

## Section A — Lưới an toàn render-golden (build TRƯỚC)

Golden DSL-level Mức 3 KHÔNG phủ render side-effect. Dựng render-golden riêng, **tái dùng pattern mock-board** đã có (`point.intersection.test.ts`, `point.pointAtDistance.test.ts`): drive qua `new JxgRenderer(store, mockBoard)` + `store.dispatch(ADD)` → full create pipeline (resolveRef + drag-sync attach) → capture `created[]`.

### A1. `point.render.golden.test.ts`
- **Unified mock board** record mọi `board.create(type, parents, attrs)`; cấp accessor đủ cho mọi kind:
  - `point`/`glider`: `X()`/`Y()` = invoke-or-number `parents[0]`/`parents[1]` (function-coords → coords số thật).
  - `circle`: `.center = parents[0]`, `.Radius()` = invoke-or-number `parents[1]`.
  - `line`/`segment`/`perpendicular`/`midpoint`: `.point1 = parents[0]`, `.point2 = parents[1]`.
- Mỗi constraint kind (~25): 1 scenario = free points (+ circle/line nếu cần) + constraint point. Snapshot **normalized created[]**: `{ type, name, parents: parents.map(normalize), attrs(loại bỏ noise), helpers: el._helpers?.map(id) }` với `normalize`: element→`_id`/name, function→invoke ra **số**, số→số.
- **Invoke function-parents** (centroid/arcMidpoint/excenter/pointAtDistance/dilate) → snapshot coords số (bắt được đổi closure; KHÔNG normalize "fn").
- Snapshot `_helpers` của element trả về (6 kind Batch 3) — bảo vệ contract `JxgRenderer.remove()`.

### A2. `point.describe.golden.test.ts`
- Snapshot `getKind('point').describe(obj, state)` mỗi kind (pure) với state có label refs.

### A3. Quy trình
- Sinh baseline trên code hiện tại → commit. Mỗi batch chạy `npx jest point.render.golden point.describe.golden --ci` → **0 written** (byte-identical), KHÔNG `-u`.
- Giữ xanh test cũ: `point.test.ts`, `point.glider-seed`, `point.intersection`, `point.pointAtDistance`, `point.constraint.special`, `pointConstructions`, `serialize`, `describeDsl`. Full suite (baseline 2204) + `diag-deterministic` (37/16) + `check:matrix` (34/34).

## Section B — Kiến trúc split (internal registry)

```
src/core/scene/kinds/point-constraints/
  _types.ts     ← PointConstraintModule { kind; validate?(c); describe(obj,state,c); render(obj,ctx,c,opts); }
  shared.ts     ← buildJxgTransforms, makeDistanceFn, RENDER_OPTS builder (move verbatim)
  registry.ts   ← POINT_CONSTRAINTS: Record<kind, PointConstraintModule> + barrel import
  <kind>.ts     ← free/onAxis/onLine/.../tangentPointExt (1 module/kind, gom render+describe+validate-arm)
```

`point.ts` KindDef giữ nguyên các method, body rút thành dispatch:
- `validate(a)`: check `a.constraint.kind` tồn tại + `POINT_CONSTRAINTS[c.kind]?.validate?.(c)`.
- `describe(obj, state)`: `POINT_CONSTRAINTS[c.kind]?.describe(obj, state, c) ?? \`Điểm ${obj.label}\``.
- `render(obj, ctx)`: build `opts` (RENDER_OPTS) → `POINT_CONSTRAINTS[c.kind]?.render(obj, ctx, c, opts) ?? board.create('point',[0,0],opts)` (giữ fallback [0,0]).
- `dependsOn`/`measure`/`update` giữ nguyên trong point.ts.

**Quyết định extensibility (theo yêu cầu "dễ mở rộng nhất"):** module signature truyền sẵn `c` (constraint đã narrow theo kind qua generic `PointConstraintModule<K>`) + `opts` để mỗi module thuần tuý "1 kind = 1 file", không lặp opts-builder. Registry là single dispatch+append point — mirror `dsl/kinds` + `intent-builders` + `finalize` đã làm.

## Section C — 3 batch theo độ phức tạp render

| Batch | Kind | Đặc điểm | Rủi ro |
|---|---|---|---|
| **1 — native/glider** | free, onAxis, midpoint, perpFoot, circumcenter, incenter, onLine, onSegment, onCircle, onPolygon | native `board.create` + glider seed; KHÔNG `_helpers`/function-coords | Thấp |
| **2 — function-coords** | centroid, arcMidpoint, excenter, pointAtDistance, circleIntersection, secondIntersection, tangencyPoint | `()=>` closure coords / native intersection/otherintersection/perpendicularpoint | Trung bình |
| **3 — aux + _helpers + drag-sync** | transformed, orthocenter, onPerpendicular, onPerpBisector, onCircleAroundPoint, tangentPointExt | aux elements + `_helpers` cleanup + glider drag-sync (JxgRenderer) | **Cao nhất** |

Mỗi batch: move render+describe+validate-arm verbatim → render-golden `--ci` 0 written + describe-golden + full suite + commit.

## Section D — Bất biến BẮT BUỘC giữ

- `render()` trả element y nguyên shape (`elType/X/Y/on/_helpers/setPositionDirectly/setAttribute`); `_helpers` attach đúng 6 kind (Batch 3).
- `opts` (name/withLabel/visible/fixed/strokeColor/fillColor/face/size + defaults `#1e40af`/`'o'`/`4`) build y hệt cho mọi kind.
- Constraint `kind` + field names không đổi → `attachFreePointDragSync`(free) + `attachGliderDragSync`(onPerpendicular/onPerpBisector/onCircleAroundPoint) ở JxgRenderer không vỡ.
- `update()` free→free + `dependsOn(constraintRefs2D)` + `measure` giữ ở point.ts.
- Public `PointAttrs` type export (serialize.ts import) — giữ export từ point.ts. Fallback `board.create('point',[0,0])` + describe `\`Điểm ${label}\`` giữ.
- Thứ tự: register modules (side-effect import barrel) trước khi point.ts dùng registry — đảm bảo `index.ts` import './point' eager vẫn nạp đủ.

## Section E — Sequencing

1. Render-golden + describe-golden baseline (Section A) → commit.
2. Scaffold `point-constraints/{_types,shared,registry}` (move helpers) + point.ts dispatch khung (registry rỗng → fallback) → golden xanh → commit.
3. Batch 1 (native/glider) → golden `--ci` 0 written + suite → commit.
4. Batch 2 (function-coords) → … → commit.
5. Batch 3 (aux/_helpers/drag-sync, test kỹ) → … → commit.
6. Result doc + đóng issue #45 (Mức 3 hoàn tất) → commit.

**Subagent:** scaffold + mỗi batch = 1 implementer + review (Batch 3 review kỹ); golden byte-identical là chốt, controller tự chạy giữa batch.

## Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Move render-arm làm lệch board.create sequence/coords | render-golden byte-identical (invoke function-coords ra số) |
| Drag-sync vỡ (glider/free) | giữ constraint kind+fields+element identity; golden snapshot glider seed + parent; test cũ glider-seed xanh |
| `_helpers` lệch → leak/crash khi remove | golden snapshot `_helpers` của 6 kind Batch 3 |
| Mock board không đủ accessor cho 1 kind → golden sai/throw | unified mock cấp X/Y/Radius/center/point1/point2; build harness ở Task 0, fix tới khi mọi kind render không fallback |
| Narrow type per-kind | `PointConstraintModule<K extends Constraint2D['kind']>` truyền `c` đã narrow; registry value cast tại biên (giống OP_BUILDERS) |

## Acceptance

- `point.ts` không còn switch render/describe/validate dài; mỗi đã dispatch qua `POINT_CONSTRAINTS`.
- Thêm constraint mới = 1 module `point-constraints/<kind>.ts` + 1 dòng register, **0 sửa switch point.ts**.
- render-golden + describe-golden + full suite + diag + matrix xanh, **0 regress**, snapshot **0 written** (`--ci`).
- Mức 3 hoàn tất → đóng issue #45.
