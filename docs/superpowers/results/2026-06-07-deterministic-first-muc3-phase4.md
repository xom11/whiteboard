# Mức 3 Phase 4 — point.ts → point-constraints registry (kết quả)

- **Ngày:** 2026-06-07 · **Issue:** #45 (Phase 4 — phần defer của Mức 3, nay HOÀN TẤT)
- **Spec/Plan:** `docs/superpowers/{specs,plans}/2026-06-07-deterministic-first-muc3-phase4*`
- **Bản chất:** REFACTOR **behavior-preserving** — render dispatch + describe output khớp **byte**.

## Đã ship

Tách 3 switch lớn trong `core/scene/kinds/point.ts` (**527→89 dòng**) thành registry nội bộ `point-constraints/`. point.ts giữ **1 KindDef** đăng ký `type='point'`; `render`/`describe`/`validate` dispatch qua `POINT_CONSTRAINTS` keyed `constraint.kind`. `dependsOn`(constraintRefs2D) + `measure`(free) + `update`(free→free, endpoint drag-sync) giữ nguyên ở point.ts.

```
core/scene/kinds/point-constraints/
  _types.ts     ← PointAttrs (move từ point.ts, point.ts re-export) + PointConstraintModule<K> + definePointConstraint
  shared.ts     ← buildJxgTransforms, makeDistanceFn (move verbatim) + buildPointOpts
  registry.ts   ← POINT_CONSTRAINTS Map (ALL[] = single wiring point)
  <kind>.ts     ← 23 module (1/constraint kind)
```

**Extensibility (mục tiêu user):** thêm constraint = 1 file `point-constraints/<kind>.ts` (`definePointConstraint`) + 1 dòng import-register, **0 sửa point.ts**. Reviewer xác nhận MET.

### Strangler (giữ golden xanh suốt)
point.ts dispatch "thử `POINT_CONSTRAINTS.get(c.kind)`, else inline switch". Scaffold (registry rỗng) → mọi kind inline (byte-identical). 3 batch migrate + gỡ inline arm dần → switch teo về rỗng sau Batch 3:
- **Batch 1 (10 native/glider):** free/onAxis/midpoint/perpFoot/circumcenter/incenter/onLine/onSegment/onCircle/onPolygon.
- **Batch 2 (7 function-coords):** centroid/arcMidpoint/excenter/pointAtDistance/circleIntersection/secondIntersection/tangencyPoint.
- **Batch 3 (6 aux/_helpers/drag-sync — rủi ro cao nhất):** transformed/orthocenter/onPerpendicular/onPerpBisector/onCircleAroundPoint/tangentPointExt.

## Lưới an toàn render-golden (giải bài "golden DSL-level không phủ render")

Dựng render-level golden riêng (analog picks→actions Phase 5), tái dùng pattern mock-board (`point.intersection`/`point.pointAtDistance`):
- **`point.render.golden.test.ts`** (32 scenario): drive `new JxgRenderer(store, mockBoard)` + dispatch → record `board.create(type,parents,attrs)` sequence + `_helpers`; normalize element→`_id`, **invoke function-parents → coords số** (centroid/arcMidpoint/excenter/pointAtDistance/dilate). Phủ 23 kind + biến thể (onAxis×2, transformed×5, pointAtDistance×3, which 0/1).
- **`point.describe.golden.test.ts`** (30 case): snapshot `describe(obj,state)` mỗi kind (incl. 6 kind fallback `Điểm <label>`).

**Limitation (chấp nhận):** golden ở mức render-dispatch (board.create sequence + computed coords + _helpers), KHÔNG phải JSXGraph runtime thật (real-board jsdom = đắt, repo không dùng). Residual risk phủ bởi test cũ (`point.glider-seed`, `point.intersection`, `point.pointAtDistance`, JxgRenderer orthocenter _helpers cleanup) + move-verbatim.

## Bất biến đã giữ (reviewer xác nhận byte-level)
- `_helpers` 6 kind đúng ids + order → `JxgRenderer.remove()` cleanup không vỡ.
- aux element creation order + `hide` attrs + glider seed math character-identical → `attachGliderDragSync` (onPerpendicular/onPerpBisector/onCircleAroundPoint) + `attachFreePointDragSync` (free) không vỡ (constraint kind+fields+element identity không đổi).
- `opts` (defaults `#1e40af`/`'o'`/`4`) build y hệt qua `buildPointOpts`. Fallback `point [0,0]` + describe `Điểm <label>` giữ.
- `PointAttrs` re-export từ point.ts → `serialize.ts` không đổi.

## Verify
- Full suite **2266 pass / 0 fail** (baseline 2204 + 62 golden Phase 4). Typecheck clean.
- **ALL golden `--ci` 204 snapshot, 0 written** = byte-identical (Mức 3 intent/finalize + Phase 4 render/describe).
- Diag harness **37 render / 16 escalate, 0 regress**. `check:matrix` **✓ 34/34**.
- 6 commit tách bạch (golden baseline → scaffold → 3 batch); Task 0 + Batch 3 qua review độc lập; final coherence review = approve-merge.

## Mức 3 — HOÀN TẤT
Phase 2 (intent-builders) + Phase 5 (tool finalize) + Phase 6 (capability matrix) [merged 2026-06-07] + **Phase 4 (point-constraints)** [đây]. 3 file switch trung tâm (`intentToDsl`/`finalizeShape`/`point.ts`) đều registry-hoá. Thêm construct end-to-end = N module nhỏ + test, 0 sửa switch trung tâm. Issue #45 đóng.

## Gotcha
- **Strangler = chìa khoá behavior-preserving render refactor:** registry rỗng + dispatch-else-inline → mỗi batch byte-identical, không big-bang.
- **Golden render = invoke function-parents ra số** (không normalize "fn") → bắt được đổi closure; recurse vào array parent (dilate transform-chain).
- Recon render explorer (workflow) **fail StructuredOutput** → đọc point.ts trực tiếp (khớp memory về agent đôi khi không trả).
