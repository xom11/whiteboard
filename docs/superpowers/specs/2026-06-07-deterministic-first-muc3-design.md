# Deterministic-first dựng hình 2D — Mức 3 (design)

- **Ngày:** 2026-06-07 · **Issue:** #45 (sub-issue của #43)
- **Tiền đề:** Mức 1 (`docs/superpowers/results/2026-06-06-deterministic-first-muc1.md`) + Mức 2 (`...-muc2.md`).
- **Bản chất:** REFACTOR **behavior-preserving** — registry-hoá 2 file switch trung tâm + capability matrix machine-checkable. KHÔNG đổi hành vi: `intent→DSL` và `picks→store-actions` trước/sau phải khớp byte.

## Bối cảnh & mục tiêu

Mức 1 đảo trục pipeline thành deterministic-first (rule registry `ai/rules/` 14 module + 5 lớp gate). Mức 2 mở rộng phủ phrasing. Mức 3 dọn **3 file trung tâm còn switch dài** để "thêm construct mới = thêm 1 module + test, không sửa switch".

Session này làm **Phase 2 + Phase 5 + Phase 6**; **defer Phase 4** (point.ts — rủi ro cao nhất vì đụng JSXGraph render + drag-sync, cần session focus riêng).

## Hiện trạng (recon 2026-06-07)

| File | Dòng | Switch | Rủi ro tách | Precedent |
|---|---|---|---|---|
| `ai/intentToDsl.ts` (Phase 2) | 567 | `switch(intent.op)` 6 case → nested 7/20/4/4/4-way | Trung bình: `BuildState` mutable dùng chung; ordering dependency; `repairCircleIntersections` post-process | `ai/rules/registry.ts` |
| `editor/handlers/finalizeShape.ts` (Phase 5) | 677 | `switch(toolDef.key)` ~40 case | Thấp: đa số "Simple ADD"; lo TRANSACTION atomicity (4) + shared helper + order-flexible | `dsl/kinds/` |
| `core/scene/kinds/point.ts` (Phase 4 — **DEFER**) | 527 | `switch(c.kind)` 25+ kind | **Cao nhất:** JSXGraph render side-effect, `_helpers` lifecycle, drag-sync coupling | `dsl/kinds/` |

Precedent registry đã chín: `ai/rules/` (import-based, sort priority) + `dsl/kinds/defineModule()`. Phase 2/5 **noi theo**, không phát minh engine.

## Phạm vi

**Trong scope (session này):** Phase 2 (intent-builders registry), Phase 5 (tool finalize registry), Phase 6 (capability matrix + check script), golden snapshot safety net, result doc.

**Ngoài scope / defer:**
- **Phase 4** (point.ts → point-constraints registry) — session riêng có focus, test render kỹ.
- Gộp `ToolDef`/`preview` vào tool module (Phase 5 chỉ tách *finalize behavior*; def/preview giữ nguyên vị trí ở `tools.tsx`).
- Mọi mở rộng tính năng/phrasing (EN language, circle ngoại tiếp tứ giác, external bisector, prime point trùng đỉnh, distance nâng cao...) — track COVERAGE riêng, không phải refactor.

## Section A — Lưới an toàn golden snapshot (build TRƯỚC)

Bằng chứng byte-identical cho behavior-preserving. Dùng **Jest snapshot** (idiomatic repo), trên các mặt **pure** quan sát được — KHÔNG đụng JSXGraph.

### A1. Phase 2 guard — `intent→DSL`
- **Corpus `IntentT[]`** gom từ: (a) fixtures intent có sẵn (`ai/__tests__/*`, `dsl/fixtures/`), (b) chạy `tryDeterministicFigure(problem)` trên ~37 probe render trong `scripts/probes-adversarial.txt` → lấy `.figure.intents`. Mục tiêu ≥ 40 case, phủ đủ 6 op + nhiều constraint kind.
- Corpus được **dump ra file fixture committed** (`ai/__tests__/__fixtures__/intent-corpus.json`) để deterministic + tái lập.
- Test: với mỗi case, assert `intentsToDsl(case)` khớp snapshot `.snap`.

### A2. Phase 5 guard — `picks→store-actions`
- Mock `HandlerCtx` ghi lại **chuỗi action dispatched** (`dispatch` push vào array thay vì vào store). 1 scenario picks/tool (~40 tool).
- Test: assert chuỗi action (type + payload chuẩn hoá id) khớp `.snap`. Chuẩn hoá id sinh động (freshId/nextLabel) về placeholder ổn định để snapshot không phụ thuộc counter toàn cục.

### A3. Quy trình
1. Viết 2 test snapshot → chạy trên code **hiện tại** sinh baseline `.snap` → **commit baseline** (1 commit riêng).
2. Refactor từng phase → test phải xanh **không** dùng `-u`.
3. Guard cũ giữ nguyên: full suite (baseline **2060** + test snapshot mới), `npx tsx scripts/diag-deterministic.ts scripts/probes-adversarial.txt` (baseline **37 render / 16 escalate**, 0 regress).

> **Vì sao dừng ở DSL-level cho Phase 2:** transpile→emit→render là pure & KHÔNG đụng trong Phase 2/5 (đó là nội tại `point.ts` = Phase 4). DSL output khớp byte ⇒ toàn downstream khớp.

## Section B — Phase 2: `ai/intent-builders/` registry

```
src/stamps/geometry-2d/ai/intent-builders/
  _types.ts      ← IntentBuilder<T> type, BuildState (moved), IntentBuilderError (moved)
  shared.ts      ← addPoint/addShape/uniquePointName/uniqueShapeName/defaultFreeCoord/
                   ensureSegment/resolveSegmentRef/resolveLineRefWithFallback/parseEnds
                   + canonical coord tables + SHAPE_VARIANTS   (move NGUYÊN, không sửa logic)
  registry.ts    ← OP_BUILDERS: Record<op, IntentBuilder>; ADD_POINT_BUILDERS: Record<kind, IntentBuilder>
  draw-shape.ts  connect.ts  draw-circle.ts  draw-line.ts  mark-shape.ts
  add-point/     midpoint.ts  perpFoot.ts  centers.ts  intersections.ts
                 transforms.ts  excenter.ts  arcMidpoint.ts  pointAtDistance.ts
                 rightAngleViewing.ts  onSegment-free.ts  angleBisectorFoot.ts ...
```

`intentToDsl.ts` → orchestrator mỏng (~60 dòng): tạo `BuildState`, loop `intents`, lookup `OP_BUILDERS[intent.op]`, gọi builder (mutate state), post-process `repairCircleIntersections`, return DSL. `handleAddPoint` thành lookup `ADD_POINT_BUILDERS[constraint.kind]`.

### Bất biến BẮT BUỘC giữ (từ recon refactorRisks)
1. `BuildState` **vẫn shared mutable**; builder signature `(s: BuildState, intent: TypedIntent) => void` y như nay — KHÔNG "isolation giả".
2. Orchestrator giữ **đúng thứ tự** duyệt `intents` (draw-shape trước add-point...) — ordering dependency không đổi.
3. `repairCircleIntersections` ở lại orchestrator (post-dispatch, sau khi mọi intent xử lý).
4. Idempotency (`addPoint`/`addShape` early-return khi tên đã tồn tại), variant-fallback mutate `intent` object, `defaultFreeCoord` counter modulo 8 — move **nguyên xi**, không tối ưu/đổi thứ tự.
5. `ensureSegment` side-effect + bidirectional key, `resolveLineRefWithFallback` single-letter swap — helper move nguyên, gọi từ builder import shared.
6. **Public API không đổi:** `intentsToDsl` + `IntentBuilderError` vẫn export từ `ai/index.ts` và `intentToDsl.ts` (re-export) → 9 consumer (index, buildFigureIntent, tryDeterministicFigure, scripts, tests) KHÔNG phải sửa.

**Acceptance Phase 2:** `intentToDsl.ts` chỉ orchestrate; construct mới = 1 builder module + register 1 dòng + test; 0 sửa switch trung tâm. Golden snapshot A1 xanh.

## Section C — Phase 5: `editor/handlers/finalize/` registry

```
src/stamps/geometry-2d/editor/handlers/finalize/
  _types.ts    ← GeometryToolModule { key: string; finalize(ctx: HandlerCtx, toolDef: ToolDef, clickXY?): void }
  shared.ts    ← findPickIdByKind/readJxgPos/computePerpendicularT/
                 computePerpBisectorT/computeCircleTheta   (move NGUYÊN)
  registry.ts  ← TOOL_MODULES: Record<key, GeometryToolModule>  (single append point)
  <tool>.ts    ← 1 file/tool (mirror precedent dsl/kinds 37 file nhỏ)
```

`finalizeShape.ts` → `TOOL_MODULES[toolDef.key]?.finalize(ctx, toolDef, clickXY)`; default/fallback giữ nguyên.

### Bất biến BẮT BUỘC giữ
1. **TRANSACTION atomicity** — 4 case (rectangle/rhombus/isoTriangle/rightTriangle) dispatch `UPDATE_ATTRS + ADD` trong 1 TRANSACTION; module phải giữ nguyên.
2. **Multi-ADD branch loops** — angleBisector 2-line, tangent outside, intersect, circleIntersection, tangentPointExt (dispatch which=0,1).
3. **Conditional validation + early-return** — tangent inside (toast+return), arc3 collinear, semicircle/arcCenter/sectorCenter dup-check, classifyPointVsCircle.
4. **Order-flexible** — perpendicular/parallel/tangent/perpFoot/tangencyPoint/secondIntersection/arcMidpoint dùng `findPickIdByKind` (giữ ở shared.ts).
5. Entry signature `finalizeShape(ctx, toolDef, clickXY?)` + consumer `multiClick.ts` (2 call site) KHÔNG đổi.

**Scope giới hạn:** chỉ tách *finalize behavior*. `ToolDef` (ở `tools.tsx`) + `preview` giữ nguyên vị trí.

**Acceptance Phase 5:** `finalizeShape.ts` không còn switch 40+ case; tool mới = 1 module + register + test. Golden snapshot A2 xanh.

## Section D — Phase 6: capability matrix machine-checkable

### D1. `scripts/check-construct-matrix.ts`
- Enumerate construct từ **`dsl/registry.ts` KIND_REGISTRY** (source of truth, 37 kind).
- Mỗi construct **introspect các registry** (không hardcode list):
  - **Scene** (core/scene/kinds — kind def tồn tại) · **DSL** (DslKindModule + schema + emit + refSpecs) · **Intent** (constraint.kind enum arm + builder trong **intent-builders registry** Phase 2) · **Rule** (ai/rules — *optional*) · **Tool** (**tool registry** Phase 5 — *optional*) · **Serialize** (serialize.ts case) · **Eval** (fixture tồn tại).
- Output bảng construct × layer ✓/✗/n-a; **exit ≠0** nếu thiếu layer **bắt buộc** (Scene/DSL/Intent/Serialize).

### D2. `docs/geometry-2d/construct-capability-matrix.md`
- Sinh từ output script + giải thích layer required vs optional theo category (point/line/circle/polygon).

### D3. Tích hợp
- `npm run check:matrix`; cân nhắc gắn vào CI/test.
- **Acceptance:** PR thêm construct thiếu layer bắt buộc → script đỏ.

> **Synergy:** matrix đọc được chính các registry Phase 2+5 vừa dựng ⇒ "machine-checkable" thay vì list tay. KHÔNG cần Phase 4 (scene check chỉ verify kind def tồn tại trong registry — đã có sẵn).

## Section E — Sequencing & verification

1. **Golden snapshot baseline** (A1+A2) → commit (foundation, sinh trên code hiện tại).
2. **Phase 2** → A1 snapshot xanh + full suite + diag (37/16) → commit.
3. **Phase 5** → A2 snapshot xanh + full suite + diag → commit.
4. **Phase 6** → script + doc + suite → commit.
5. **Result doc** `docs/superpowers/results/2026-06-07-deterministic-first-muc3.md` + close-out (defer Phase 4) → commit.

Mỗi phase TDD riêng, **không gộp commit**. Sau mỗi phase: full suite xanh + diag 0 regress + golden snapshot xanh.

### Subagent strategy (theo memory `feedback_subagent_execution_pattern` + recon note)
- Skeleton shared/registry/orchestrator: **INLINE** (cross-cutting, shared helper).
- Draft per-module (builder / tool module): **fan-out subagent** OK (độc lập).
- Integration + verify: **INLINE**.
- Golden snapshot phải sinh **trên code hiện tại** TRƯỚC mọi refactor; không tin self-report của agent — lấy ground truth từ test/diag thật.

## Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Tách builder làm lệch DSL output (ordering/idempotency/side-effect) | Golden snapshot A1 byte-identical + giữ orchestrator loop nguyên thứ tự + helper move nguyên xi |
| Tách tool module làm lệch chuỗi dispatch (TRANSACTION/multi-ADD) | Golden snapshot A2 chuỗi action byte-identical |
| Corpus snapshot phủ thiếu construct | Gom từ fixtures + 37 probe render; check matrix Phase 6 cross-verify construct nào chưa có test |
| Regress diag harness | Chạy diag sau MỖI phase, baseline 37/16, 0 regress |
| 40 file Phase 5 quá vụn | Mirror precedent dsl/kinds (37 file) — house style đã chấp nhận; registry.ts là single append point |

## Acceptance tổng thể (session này)

- `intentToDsl.ts` + `finalizeShape.ts` không còn switch dài; mỗi đã registry-hoá.
- Thêm construct (intent-builder / tool) = 1 module nhỏ + test, **0 sửa switch trung tâm**.
- Capability matrix machine-checkable; script đỏ nếu construct thiếu layer bắt buộc.
- Golden snapshot A1+A2 + full suite + diag harness xanh, **0 regress**.
- Phase 4 (point.ts) defer, ghi rõ trong result doc + issue.
