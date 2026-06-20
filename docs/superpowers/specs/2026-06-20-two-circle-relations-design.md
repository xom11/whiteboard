# Spec: Quan hệ 2 đường tròn (tiếp tuyến chung + tâm-bán-kính-cắt + arbelos)

**Ngày:** 2026-06-20
**Trạng thái:** approved (design), chờ implement
**Mục tiêu:** Phủ các dạng "2 đường tròn" còn DEFER trong rule engine dựng hình 2D —
ưu tiên **tiếp tuyến chung** (năng lực mới hoàn toàn) + 2 dạng nhỏ tái dùng hạ tầng.

## Bối cảnh

Rule engine (`src/stamps/geometry-2d/ai/`) đã có khá nhiều hạ tầng 2-đtròn:
`twoCirclesMeet` (2 đtròn tự do cắt nhau), `twoCirclesTangent` (tiếp xúc ngoài),
`circleIntersection` (DSL+builder+render+`repairCircleIntersections`), `radicalAxis`,
`pairSecondIntersection`, `cutCirclesDistrib`, `multiDiameterCircles` (arbelos),
`inExCircleTangentBC`. **Khuyết rõ nhất: TIẾP TUYẾN CHUNG** (đường tiếp xúc CẢ 2
đtròn) — không có rule/DSL. Xuất hiện ~17 chỗ corpus + vxhung #31/#37.

## Phạm vi (3 sub-construct)

### A. Tiếp tuyến chung (`commonTangent`) — LÕI, MỚI

**Hình học.** 2 đtròn tâm O₁,O₂ bán kính r₁,r₂; d=|O₁O₂|; û=hướng O₁→O₂ (góc β).
Pháp tuyến đơn vị n̂ tới đường tiếp tuyến thoả `(P−O_i)·n̂ = ±r_i`:
- **Ngoài (external):** `(O₂−O₁)·n̂ = r₁−r₂` ⇒ `cos γ = (r₁−r₂)/d`, `n̂ = (cos(β+s·γ), sin(β+s·γ))`
  với s=±1 (2 tiếp tuyến ngoài). Tiếp điểm `T₁ = O₁ + r₁·n̂`, `T₂ = O₂ + r₂·n̂`.
  Tồn tại khi đtròn KHÔNG lồng nhau (`d > |r₁−r₂|`) — bền kể cả khi 2 đtròn cắt nhau.
- **Trong (internal):** `cos γ = (r₁+r₂)/d`, `T₁ = O₁ + r₁·n̂`, `T₂ = O₂ − r₂·n̂`.
  Cần `d > r₁+r₂` (2 đtròn rời) → rule phải đặt 2 tâm đủ tách.

**DSL kind mới `commonTangentPoint`** (điểm HÀM — functional, như `pointAtDistance`):
```ts
{ kind: 'commonTangentPoint', circles: [string, string], on: 0 | 1,
  variant: 'external' | 'internal', side: 0 | 1 }
```
- `circles`: tên 2 đtròn. `on`: tiếp điểm trên đtròn 0 hay 1. `variant`: ngoài/trong.
- `side`: chọn 1 trong 2 tiếp tuyến cùng loại (s=±1). 2 tiếp điểm cùng 1 tiếp tuyến
  PHẢI cùng `variant`+`side`.
- **Render functional** (`point.ts`): đọc tâm+R sống của 2 đtròn JSXGraph → tính T theo
  công thức trên → trả `[x,y]` (cập nhật khi kéo tâm). Đặt TRƯỚC fallback `[0,0]`.

**Tiếp tuyến** = `connect(T₁, T₂)` (đoạn/đường qua 2 tiếp điểm).

**Rule `commonTangent`** (`ai/rules/commonTangent.ts`):
- Nhận: `tiếp tuyến chung (ngoài|trong)? <BC|DE> của hai đường tròn (O) và (O')`
  (+ biến thể `với B ∈ (O), C ∈ (O')` / "thứ tự là các tiếp điểm").
- Đặt 2 đtròn FREE (toạ độ canonical đủ tách, giống `twoCirclesTangent`) — chỉ khi đề
  CHƯA dựng 2 đtròn đó; nếu đã có thì chỉ thêm tiếp điểm + tiếp tuyến.
- Emit: (2 circleCR nếu cần) + T₁=commonTangentPoint(on=0) + T₂=commonTangentPoint(on=1)
  + connect(T₁,T₂).
- Guard: 2 tâm KHÁC tên (OCR rơi prime → escalate); tiếp điểm ∉ {tâm}; "ngoài"
  default khi không nêu; "trong" set variant='internal'.

### B. 2 đtròn tâm-bán-kính cắt nhau (`twoCirclesCenterRadiusMeet`) — NHỎ, tái dùng

vxhung #7: "Lấy B làm tâm, vẽ đường tròn bán kính BA; lấy C làm tâm, vẽ đường tròn
bán kính CA; Hai đường tròn này cắt nhau tại điểm thứ hai là D."
- Rule mới: "(Lấy)? <X> làm tâm,? vẽ đường tròn bán kính <XY>" (×2) +
  "hai đường tròn (này)? cắt nhau (tại điểm thứ hai)? (là|tại) <D>".
- Emit: 2× circleCR `{center, radius: segmentLength|distance}` (tâm = đỉnh đã dựng,
  R = |XY|) + D = `circleIntersection{circles, which}`. Tâm cố định + R cố định ⇒ 2
  đtròn THỰC SỰ giao tại A,D (không cần repair). "điểm thứ hai" ⇒ which=1 (khác A).
- Tái dùng circleCR + circleIntersection (đã có). KHÔNG cần DSL mới.

### C. Arbelos phrasing (`multiDiameterCircles`) — NHỎ

vxhung #34/httcd:250: "Nửa đường tròn đường kính BH, CH lần lượt có tâm O ; O'".
- Mở rộng phrasing `multiDiameterCircles` cho "(nửa)? đường tròn đường kính BH, CH
  lần lượt có tâm O, O'" (2 nửa đtròn trên 2 đoạn con). Nếu đã phủ thì bỏ qua.

## Hạ tầng phải đụng (do DSL kind mới `commonTangentPoint`)

1. `ai/intent.ts` (hoặc nơi định nghĩa AddPointConstraint union) — thêm kind.
2. `ai/intent-builders/add-point/` — builder cho commonTangentPoint (validate refs, emit DSL point).
3. DSL point type (`core`/dsl types) — thêm kind + fields.
4. `render` (`point.ts`) — nhánh functional tính tiếp điểm.
5. `ai/rules/refs.ts` (refSpecs) — khai báo ref `circles` (RefRole circle, mảng 2).
6. `describeDsl` / `serialize` / mọi exhaustive switch trên DSL-point-kind — type-system
   tự bắt thiếu (build/typecheck fail nếu sót).

## Test + bất biến

- **TDD** mỗi rule (unit) + builder + render-golden cho commonTangentPoint.
- **Verify hình học** (1e-9): `|O_i·T_i| = r_i` (tiếp điểm trên đúng đtròn) +
  `(T_i − O_i) · (T₂ − T₁) = 0` (bán kính ⊥ tiếp tuyến tại tiếp điểm).
- **0-REGRESSION (ràng buộc cứng):** `npx tsx scripts/diag-all.ts` so baseline TẤT CẢ
  16 dataset — không dataset nào tụt FULL.
- `npm test` + `npx tsc --noEmit` xanh.

## Quyết định / đánh đổi

- commonTangentPoint là điểm HÀM (không free) → đúng cả khi kéo tâm; theo pattern
  pointAtDistance đã có.
- Nhiều bài tiếp-tuyến-chung là multi-blocker → có thể KHÔNG flip FULL ngay; giá trị =
  phủ ĐÚNG dạng + cải thiện partial-render (đo qua NONE→PARTIAL, xem
  project_ai_full_partial_none_metric).
- "Tiếp xúc trong" 2 đtròn (1 tâm trong đtròn kia) vẫn DEFER (hiếm, cần dựng khác) —
  ngoài phạm vi đợt này.

## Phân rã task (cho writing-plans)

- **T1 (nền, cross-cutting):** DSL kind `commonTangentPoint` đầy đủ pipeline (intent type
  + builder + render functional + refSpecs + exhaustive switches + describe/serialize) +
  render-golden test. KHÔNG có rule nào dùng nó (chỉ hạ tầng + test trực tiếp).
- **T2 (rule, phụ thuộc T1):** rule `commonTangent` + test.
- **T3 (độc lập):** rule `twoCirclesCenterRadiusMeet` + test (tái dùng circleIntersection).
- **T4 (độc lập):** arbelos phrasing trong `multiDiameterCircles` + test.
- Mỗi task: TDD (RED→GREEN) + `npm test` phạm vi + typecheck. Coordinator: diag-all
  0-regression toàn cục SAU mỗi task merge + typecheck cross-file.
