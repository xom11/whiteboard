# Thiết kế: Pipeline dựng hình KHÔNG GIAN (3D) từ đề bài

> Ngày: 2026-06-21 · Nhánh: `feat/3d-foundation` · Trạng thái: APPROVED (brainstorm)

## 1. Mục tiêu

Xây pipeline **Text → Hình 3D** mirror đúng pipeline 2D đã chín, để giải các đề
hình học không gian (HKG) lớp 11–12, **không LLM ở happy path**. Test "y đúc 2D":
unit test per-rule + corpus probe (`diag-all`) + Playwright render-verify.

Target coverage = **cả 3 dataset** (698 bài) đã thu 2026-06-20:
- `hinh-khong-gian-11-songsong-thietdien.txt` (241) — giao tuyến + thiết diện
- `hinh-khong-gian-11-vuonggoc-khoangcach.txt` (368) — khoảng cách + góc + ⊥
- `hinh-khong-gian-12-khoi-tron-xoay.txt` (89) — mặt cầu ngoại/nội tiếp

## 2. Trạng thái hiện tại (đã có — không xây lại)

**Tầng render + editor 3D đã chín:**
- `src/core/scene/kinds/`: `point3d`, `line3d`, `plane3d`, `segment3d`, `ray3d`,
  `vector3d`, `polygon3d`, `polyhedron3d`, `sphere3d`, `cone3d`, `cylinder3d`.
- Hệ `Constraint3D` (`3d-constraint.ts`): 7 base (free/onGround/onAxis/onPlane/
  onLine/onPolygon/onSphere) + 6 derived (midpoint/centroid/intersectionLines/
  intersectionLinePlane/perpFootLine/perpFootPlane).
- Construction-variant (`plane3d`/`line3d`): planePlaneIntersection,
  lineParallelThrough, linePerpToPlane, planeParallelThrough, planePerpToLine.
- Math thuần: `constraint3d-math.ts` (`constraintToWorld`, `lineConstructionWorld`,
  `planeConstructionWorld`, depth-guard `MAX_REC_DEPTH=512`).
- Render: `core/scene/render/JxgRenderer3D.ts` (JSXGraph `view3d`), SVG export
  `stamps/geometry-3d/render.ts`. Function-coord live-update cho derived/construction.
- Editor: `stamps/geometry-3d/editor/` — 41 tool (`tools/spec.ts`), build-handlers
  `tools/handlers/{derived,construct3d}.ts`. Serialize/roundtrip `serialize.ts`
  (`Geometry3DCustomData` v2, view ở `state.meta.view`).

**State 3D (đích render):** `{ objects: {[id]: {id,kind,label,visible,locked,layer,
schemaVersion,attrs}}, order: id[], counter, meta: {domain:'3d', version, view} }`.

## 3. Phần CHƯA có (cần xây — = phần "test y đúc 2D")

1. Rule engine text→3D (không có gì tương đương `geometry-2d/ai/`).
2. Intent3D schema + builder `intent → Scene State`.
3. Coverage gate + guards 3D (vocab + named-entity: `S.ABCD`, `(SBC)`, `A'B'C'`).
4. Verify gate 3D (numeric + acyclic + Playwright).
5. Probe `diag-all-3d` + wire 3 dataset + `dbg-bai-3d`.
6. Façade `handleGenerateFigure3d` + nút AI-generate trong editor 3D.

## 4. Kiến trúc

**Luồng:** `Text → Rules3D → Intent3D[] → Builder → Scene3D State → JxgRenderer3D`

**Khác 2D có chủ đích:** KHÔNG có tầng DSL/transpile riêng. Scene State đã là IR
render được + serializable + testable; editor đã có build-handlers dựng State đó.
Builder map `Intent3D → Scene State`, **tái dùng** `tools/handlers/{derived,construct3d}.ts`
+ `core/scene/kinds/*`. Gate (ref-resolve, cycle, named-entity, verify) chạy *trên*
State sinh ra (YAGNI: tránh nhân đôi schema surface).

### 4.1 Tầng (mirror 2D, FORK-COPY cho 3D)

- **NLU/segmentation** `ai/deterministic/coverage3d.ts`: fork cơ chế `segmentClauses`
  của 2D + vocab 3D `countGeometryKeywords3D`. *Fork thay vì extract shared-core* để
  KHÔNG làm rung engine 2D (1741-bài probe). Extract shared-core = issue riêng sau.
- **Rule engine** `ai/rules/`: `LanguageRule3D` (id/priority/patterns/match như 2D),
  `registry.ts` (`ALL_RULES_3D` + `runRules3D`). Thêm construct = 1 module + 1 dòng
  registry + 1 test.
- **Intent3D** `ai/intent.ts` (Zod discriminated union trên `op`) — §4.2.
- **Builder** `ai/intentToScene3d.ts`: `OP_BUILDERS_3D` + `BuildState3D`. Order-retry
  qua `ai/intentTopo3d.ts` (Kahn ổn định, mirror `intentTopo.ts`).
- **Canonical layout** `ai/layout3d.ts` — §4.3.
- **Coverage gate** `computeCoverage3D` + **guards3d** (named-entity 3D).
- **Verify gate** `ai/verify3d.ts`: numeric (`constraint3d-math.ts`) + acyclic +
  Playwright render-verify (tầng riêng).
- **Probe** `scripts/diag-all-3d.ts` + `scripts/dbg-bai-3d.ts`.
- **Façade** `ai/{buildFigureIntent3d,handleGenerateFigure3d}.ts`.

### 4.2 Intent3D schema (Zod union trên `op`)

- `solid` — `{ kind:'pyramid'|'prism'|'tetrahedron'|'box', apex?, base: {labels[],
  variant: BaseVariant}, apexVariant: ApexVariant }`.
  - `BaseVariant`: `square|rectangle|parallelogram|trapezoid|rhombus|triangle|
    equilateral-triangle|regular-ngon`.
  - `ApexVariant`: `regular` (S trên trọng tâm đáy) | `over-vertex:<V>` (SA⊥đáy) |
    `over-edge-mid:<XY>` ((SAB)⊥đáy, SAB cân) | `free`.
- `add-point-3d` — `{ name, constraint: Constraint3D }` (14 kind đã có; thêm
  `onEdge`/`symmetric`/`onAxisOfSolid` khi cần).
- `plane` — `{ name, spec: threePoints|parallelThrough|perpToLine|throughLinePoint }`.
- `line` — `{ name?, kind: segment|line|ray|planePlaneIntersection|parallelThrough|
  perpToPlane }`.
- `cross-section` — `{ name?, plane, solid }` (Phase 2).
- `sphere` — `{ name?, spec: circumscribed|inscribed|centerRadius|centerThrough }` (Phase 4).
- `connect` — `{ from, to, style }`.

`IntentEnvelope3DZ` wrapper. Rule emit qua factory helpers ở `ai/rules/_shared.ts`.

### 4.3 Canonical layout (MỚI — then chốt)

`layout3d.ts` gán toạ độ 3D xác định theo `(solid, baseVariant, apexVariant)`:
- Đáy đa giác ở **z=0**, tâm tại gốc, kích thước chuẩn hoá (canh ~2 đơn vị board).
  Mỗi BaseVariant có template toạ độ (vuông/cn/bình hành/thang/thoi/tam giác/đều).
- Apex theo ApexVariant: `regular` → trên trọng tâm đáy; `over-vertex:A` → thẳng
  trên A; `over-edge-mid:AB` → trên trung điểm AB. Chiều cao chuẩn hoá.
- Lăng trụ: đáy trên + đáy dưới tịnh tiến theo trục.
- Điểm-trên-cạnh / free → toạ độ tham số (mirror `defaultFreeCoord` 2D nhưng 3D).
- Đặt layout TRƯỚC khi eval derived/construction (chúng đọc toạ độ này qua constraint).

### 4.4 Verify

- **Numeric** (`verify3d.ts` dùng `constraint3d-math.ts`): coplanar (thiết diện phẳng),
  on-plane/on-line membership, ⊥, midpoint/centroid đúng, sphere đi qua điểm.
- **Acyclic validator** ở builder (mới): chặn bug-class chu trình khi sinh hàng loạt
  (hiện chỉ có depth-guard runtime 512).
- **Named-entity guard 3D**: mọi đỉnh (S/A/B/C/D…), "Gọi M…", tên mặt "(SBC)",
  đỉnh phẩy A'B'C' nêu trong đề PHẢI có trong State, else escalate.
- **Playwright render-verify** (`tests/e2e/geometry-3d-render.spec.ts`): mount `view3d`
  thật, assert figure render không lỗi (bắt bug-class plane3d `[point,dir1,dir2]`
  mà unit-mock bỏ sót). Bắt buộc lúc dev; sample trong CI.

### 4.5 Probe + metric

`diag-all-3d.ts`: parse 3 file `.txt` ("Câu N:" delimiter), chạy Track-A 3D, ghi
`.work/escalations-3d.json`. **Metric 3 mức FULL/PARTIAL/NONE ngay từ đầu** (tránh
bẫy all-or-nothing của diag-all 2D). `dbg-bai-3d.ts <ds> <id>` trace 1 bài.

## 5. Quyết định kiến trúc (đã chốt)

| Vấn đề | Chốt | Lý do |
|---|---|---|
| Reuse vs fork rule-core | Fork-copy cho 3D | Bảo vệ engine 2D đã chín |
| Tầng DSL 3D | Không có — builder emit thẳng State | State đã serializable/testable |
| Đặt điểm 3D | Canonical layout solver theo variant | Solid cần toạ độ xác định |
| Verify | Numeric + named-entity + Playwright riêng | Gotcha plane3d ẩn khỏi unit-mock |
| Hidden-line / orthographic | DEFER → GitHub issue riêng | Hình auto-gen đơn giản, đủ đọc |
| Acyclic | Validator ở builder | Chặn bug-class chu trình |

## 6. Phasing (mỗi phase gated: TDD + diag-all dịch + Playwright; 0-regression)

- **Phase 0 — Harness.** `diag-all-3d` + parser 3 dataset + `dbg-bai-3d` + scaffold
  Playwright render-verify + metric 3 mức. Baseline = 0, có vòng đo ngay.
- **Phase 1 — Skeleton + lõi dựng hình.** Intent3D + builder + layout3d + rule engine
  + gate + façade. Rule: solids + base/apex variant, mặt phẳng đặt tên, điểm-trên-cạnh,
  6 derived point, giao tuyến. → render SETUP đa số songsong-thietdien.
- **Phase 2 — Thiết diện.** Render-capability mới: tính đa giác giao plane∩polyhedron
  (cắt cạnh solid) → polygon3d. Intent `cross-section` + rule "thiết diện … (IJK)" +
  "giao tuyến của (MNP) và (SCD)".
- **Phase 3 — Metric (vuonggoc).** Hình chân-⊥-xuống-mặt ("k/c từ A đến (SHD)"),
  quan hệ ⊥, chân đường cao. Bài thuần công thức → coverage thấp OK (partial render).
- **Phase 4 — Mặt cầu (khoi-tron-xoay).** Mặt cầu ngoại tiếp tâm-trên-trục. Sphere
  render đã có. General-position defer.

## 7. Bố cục file

```
src/stamps/geometry-3d/ai/
  intent.ts · intentToScene3d.ts · intentTopo3d.ts · layout3d.ts
  verify3d.ts · buildFigureIntent3d.ts · handleGenerateFigure3d.ts
  rules/ {_types,_shared,registry}.ts + <construct>.ts + __tests__/
  intent-builders/ {registry,_types}.ts + <op>/
  deterministic/ {coverage3d,guards3d,runDeterministicIntents3d,tryDeterministicFigure3d}.ts
scripts/ diag-all-3d.ts · dbg-bai-3d.ts
tests/e2e/ geometry-3d-render.spec.ts
```

## 8. Testing (y đúc 2D)

- **Unit per-rule**: `ai/rules/__tests__/<rule>.test.ts` — match() + intent shape + coverage claim.
- **Builder/layout/verify**: unit test State sinh ra (numeric assertions).
- **Probe**: `npx tsx scripts/diag-all-3d.ts` → `.work/escalations-3d.json` (FULL/PARTIAL/NONE).
- **Debug 1 bài**: `npx tsx scripts/dbg-bai-3d.ts <ds> <id>`.
- **Playwright**: `tests/e2e/geometry-3d-render.spec.ts` mount view3d, assert render.
- **Jest worktree**: `npx jest -c jest.worktree.config.js` (config đã bỏ ignore `.worktrees/`).

## 9. Rủi ro & giảm thiểu

- **plane3d `[point,dir1,dir2]`**: builder phải đổi 3-điểm → `[p1, p2−p1, p3−p1]`;
  Playwright verify bắt lỗi này (đã có tiền lệ v1.5).
- **Thiết diện**: thuật toán cắt cạnh solid bởi mặt phẳng → đa giác lồi; cần sắp xếp
  đỉnh theo chu vi. Verify coplanar + on-edge.
- **Metric cap thấp**: bài thuần công thức không cho hình đầy đủ — partial render +
  metric 3 mức để thấy tiến bộ thật (giống FULL/PARTIAL/NONE 2D).
- **Acyclic**: validator builder trước khi render hàng loạt.
- **OCR**: dataset sạch (text-layer, 0 symbol-font) nhưng có subscript phẳng
  (A'B'C' → "A B C"), answer-tail lẫn ~15 bài vuonggoc → normalizeText3D xử lý.
```
