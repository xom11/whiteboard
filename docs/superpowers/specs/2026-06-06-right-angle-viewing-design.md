# Design — Pattern "góc vuông nhìn đoạn" (∠AMB = 90°)

**Ngày:** 2026-06-06
**Trạng thái:** Approved (chờ implementation plan)
**Phạm vi:** AI intent pipeline (`src/stamps/geometry-2d/ai/`) + DSL kinds (`src/stamps/geometry-2d/dsl/`)

## Bối cảnh

Đề thi hình học thường gặp dạng: *"Cho tam giác nhọn ABC, đường cao CK, H trực tâm. Gọi M là một điểm trên CK sao cho ∠AMB = 90°."* — điểm M hiện **không dựng được** qua pipeline AI vì LLM không nhận ra cần một đường tròn phụ để đặt M.

Đây không phải giới hạn của DSL: các primitive cần thiết đã tồn tại (`circleCP`, `intersection` lineCircle + branch). Vấn đề nằm ở tầng **intent → DSL** chưa có cấu hình mã hoá "insight" dựng đường tròn đường kính.

## Insight hình học

∠AMB = 90° ⇔ MA ⊥ MB ⇔ **M nằm trên đường tròn đường kính AB** (góc nội tiếp chắn nửa đường tròn — định lý Thales).

Vậy: **M = giao của đường thẳng (M nằm trên, vd CK) với đường tròn đường kính AB.**

Trong tam giác nhọn, M luôn tồn tại trên đoạn CK và nằm giữa H và C, vì với chân đường cao K:
- M trên đường tròn đường kính AB ⇒ `MK² = KA·KB` (đường cao trong tam giác vuông AMB).
- Hệ thức trực tâm: `KH·KC = KA·KB`.
- ⇒ `MK² = KH·KC` ⇒ `KH < MK < KC` ⇒ M nằm giữa H và C. Không suy biến.

## Quyết định thiết kế (đã chốt với user)

| Quyết định | Lựa chọn |
|---|---|
| Phạm vi | **Chỉ góc vuông 90°** (không tổng quát góc θ). |
| Kiến trúc | **Robust: constraint chuyên dụng + deterministic completion** (đúng pattern 3 lớp prompt + regex + completion của dự án). |
| Đường tròn phụ | **Ẩn hoàn toàn** (chỉ tồn tại để tính M, không render). |
| Chọn branch giao điểm | Default `0`; lật `which:1` nếu sai phía. Chọn phía tự động theo điểm thứ 3 = **defer (YAGNI v1)**. |

## Pipeline hiện tại (tham chiếu)

`buildFigureIntent.ts` orchestrate:

```
Stage 1    : LLM extract Intent[]            (provider.call + intent prompt + schema)
Stage 1.5a : normalizeIntents()              (fix variant bias)
Stage 1.5b : resolveCircleNameCollisions()   (preprocess "(O)" = tâm)
Stage 1.5c : completeRightAngle()            ← MỚI (deterministic inject)
Stage 2    : intentsToDsl()                  (deterministic build)
Stage 3    : transpile(DSL)
Stage 4    : verifyGeometry()
```

Deterministic layer của path intent nằm ở **tầng intent** (1.5x), khác path cũ `buildFigure.ts` (deterministic ở tầng DSL qua `applyDeterministicCompletion`).

## Components

### Component 1 — Intent constraint mới `rightAngleViewing`

File: `src/stamps/geometry-2d/ai/intent.ts` — thêm variant vào `AddPointIntentZ.constraint` discriminated union:

```ts
z.object({
  kind: z.literal('rightAngleViewing'),
  a: LabelZ,                 // mút A của đoạn nhìn (∠AMB → a = A)
  b: LabelZ,                 // mút B (∠AMB → b = B)
  onLine: z.string(),        // đường M nằm trên, vd "CK"
  which: z.union([z.literal(0), z.literal(1)]).optional(), // branch giao điểm
})
```

Ngữ nghĩa: điểm `name` (= M) nằm trên `onLine`, sao cho ∠ a-`name`-b = 90°. `a`/`b` là 2 mút của đoạn được nhìn dưới góc vuông; `name` là đỉnh góc vuông.

### Component 2 — DSL hỗ trợ ẩn vật dựng phụ

`SceneObject.visible` đã tồn tại (`core/scene/types.ts`) và renderer tôn trọng (vd `intersection.ts` render dùng `visible: obj.visible`). Nhưng DSL emit hardcode `visible: true` qua `POINT_BASE_FIELDS`/`SHAPE_BASE_FIELDS`.

Thêm field optional `visible?: boolean` (default `true`) cho 2 kind dùng làm vật dựng phụ:

- **midpoint** (`dsl/kinds/points/midpoint.ts`): thêm `visible: z.boolean().optional()` vào schema; thread qua `emitPointObject` (thêm param `visible` optional, default `true`, vào `_shared.ts`).
- **circleCP** (`dsl/kinds/circles/circleCP.ts`): thêm `visible: z.boolean().optional()`; emit `visible: e.visible ?? true` thay vì spread `SHAPE_BASE_FIELDS.visible`.

Object còn lại (M = intersection) giữ `visible: true` mặc định.

> Lưu ý: chỉ mở rộng schema của 2 kind này (đủ cho use case). Không refactor toàn bộ kind sang optional visible (YAGNI).

### Component 3 — Handler trong `intentToDsl.ts`

Thêm `case 'rightAngleViewing'` trong switch xử lý add-point constraint:

```
O   = addPoint(midpoint, p1=a, p2=b, visible:false)           // tâm = trung điểm AB, ẩn
ω   = addShape(circleCP, center=O, surfacePoint=a, visible:false)  // đường tròn đường kính AB, ẩn
L   = resolveSegmentRef(onLine)   // đảm bảo line tồn tại (điểm đầu/cuối phải có trước)
M   = addPoint(intersection, ref1=L, ref2=ω, branch = which ?? 0)  // visible (mặc định)
```

- Tên O, ω sinh qua `uniqueShapeName`/unique point name (vd `_mid_AB`, `_thales_AB`) để tránh đụng tên user.
- `resolveSegmentRef` (đã có) tự `ensureSegment` nếu `onLine` là ref 2 chữ và 2 điểm đã tồn tại.
- 1 intent → 3 DSL object (2 ẩn + 1 hiện), hoàn toàn deterministic.

### Component 4 — Prompt (`intentPrompt.ts`)

- Thêm `rightAngleViewing` vào danh sách constraint kinds liệt kê cho add-point.
- Bảng từ khoá → constraint: `"góc AMB = 90°"`, `"∠AMB = 90°"`, `"góc AMB vuông"`, `"MA ⊥ MB"`, `"M nhìn AB dưới góc vuông"` → `rightAngleViewing` với `a`/`b` = 2 mút, `name` = đỉnh.
- Thêm 1–2 few-shot vào `FIXTURES`:
  1. Đề gốc: tam giác nhọn ABC, đường cao CK, H trực tâm, M trên CK sao cho ∠AMB = 90°.
  2. Bài tối giản: "Cho đoạn AB và đường thẳng d. Điểm M trên d sao cho ∠AMB = 90°."

### Component 5 — Deterministic completion `completeRightAngle` (Stage 1.5c)

File mới: `src/stamps/geometry-2d/ai/completeRightAngle.ts` (khuôn theo `resolveCircleNameCollisions.ts`).

```ts
export function completeRightAngle(
  intents: readonly IntentT[],
  problem: string,
): IntentT[]
```

Logic:
1. Regex quét `problem` tìm cụm "góc vuông nhìn đoạn": bắt `name` (đỉnh, vd M), `a`/`b` (2 mút từ ∠a-name-b hoặc "M nhìn AB"), và `onLine` (M "trên/thuộc đường" CK).
   - Hỗ trợ các biến thể keyword như Component 4.
   - Middle letter của ∠AMB = `name`; 2 letter ngoài = `a`, `b`.
2. Áp dụng safety logic (giống `applyDeterministicCompletion`):
   - LLM **thiếu** intent tên `name` → **inject** `add-point rightAngleViewing`.
   - LLM emit `name` với constraint **khác** → **replace** bằng `rightAngleViewing`.
   - LLM emit đúng `rightAngleViewing` → **keep** (no-op).
3. Cắm vào `buildFigureIntent.ts` ngay sau `resolveCircleNameCollisions` (Stage 1.5b), trước `intentsToDsl`.

### Component 6 — Eval fixture (`scripts/eval-intent.ts`)

Thêm vào `PROBLEMS`:
- `t4-right-angle-altitude` (Tier 4): đúng đề gốc. Expected intents: triangle ABC + perpFoot K (CK) + orthocenter H + segment CK + `add-point M rightAngleViewing {a:A, b:B, onLine:CK}`.
- `t4-right-angle-line` (Tier 4): bài tối giản đoạn AB + đường d.

## Test strategy

| Layer | Test |
|---|---|
| Schema | `intent.ts` parse `rightAngleViewing` (valid + reject thiếu field). |
| DSL emit | midpoint/circleCP với `visible:false` → SceneObject `visible === false`. |
| intentToDsl | 1 `rightAngleViewing` intent → 3 object (midpoint ẩn + circleCP ẩn + intersection lineCircle hiện); kiểm tra refs đúng. |
| completeRightAngle | inject (thiếu) / replace (sai kind) / keep (đúng) cho đề gốc + biến thể keyword. |
| Integration | đề gốc → intent → DSL → `transpile` ok; assert M là intersection lineCircle, circle ẩn (`visible:false`). |

## Phạm vi & giới hạn (không làm trong v1)

- Góc θ tổng quát (≠ 90°) — cần dựng cung chứa góc.
- Chọn phía giao điểm tự động theo điểm thứ 3 (vд cùng phía C) — v1 dùng `which` thủ công, default 0.
- Editor tool/UI để dựng thủ công constraint này — defer.
- Hiển thị đường tròn phụ nét đứt — đã chốt ẩn hoàn toàn, không làm.

## Files chạm

| File | Thay đổi |
|---|---|
| `ai/intent.ts` | + constraint variant `rightAngleViewing` |
| `ai/intentToDsl.ts` | + case handler (3 object) |
| `ai/intentPrompt.ts` | + keyword + constraint list + few-shot |
| `ai/completeRightAngle.ts` | **mới** — Stage 1.5c |
| `ai/buildFigureIntent.ts` | wire Stage 1.5c |
| `dsl/kinds/points/midpoint.ts` | + optional `visible` |
| `dsl/kinds/circles/circleCP.ts` | + optional `visible` |
| `dsl/kinds/_shared.ts` | `emitPointObject` + param `visible` |
| `scripts/eval-intent.ts` | + 2 fixture Tier 4 |
| `__tests__/*` | unit + integration mới |
