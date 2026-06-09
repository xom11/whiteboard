# Đề "đường tròn đường kính đôi một cắt nhau" — dựng hình deterministic

Issue: mở rộng rule engine (không AI) để vẽ được đề:

> Cho đường tròn (O) và ba dây cung AB, AC, AD bất kì. Các đường tròn đường kính
> AB, AC, AD đôi một cắt nhau lần thứ hai tại M, N, P.

## Bản chất hình học

Đường tròn đường kính AB = quỹ tích ∠AXB = 90°. Giao điểm thứ hai của (đ.kính AB)
và (đ.kính AC) là điểm M thoả ∠AMB = ∠AMC = 90° → M là **chân vuông góc hạ từ A
xuống BC**. Vì A,B,C,D đồng viên (O) nên M,N,P là 3 chân Simson của A với ΔBCD
(thẳng hàng — nhưng đề gốc chỉ là giả thiết, KHÔNG vẽ kết luận).

## Phạm vi (Mức 2 — primitive tái dùng + rule)

Hình **tối giản, trung thành đề gốc**: (O) + tâm O, A/B/C/D, dây AB/AC/AD, ba
đường tròn đường kính, điểm M/N/P. KHÔNG vẽ BC/CD/DB, AM/AN/AP, đường Simson.

M/N/P dựng bằng **giao điểm thứ hai của 2 đường tròn loại điểm chung A** (literal,
khớp đề) — KHÔNG dùng perpFoot (perpFoot chỉ là kiểm chứng số học).

## 2 primitive mới (xuyên 7 tầng, theo registry pattern)

### `circleDiameter` (circle construct)
- DSL shape `{ kind:'circleDiameter', p1, p2 }` → emit circle với
  `attrs.construction = { kind:'diameter', p1, p2 }`.
- Render (`core/scene/kinds/circle.ts`): tâm = midpoint(p1,p2) ẩn, circle qua p2
  → bán kính |p1p2|/2. JSXGraph `circle([midpoint, p2])`.
- Intent: `draw-circle` spec `'diameter'` + field `endpoints:[p1,p2]`.

### `circleSecondIntersection` (point constraint)
- Constraint2D `{ kind:'circleSecondIntersection', c1, c2, exclude }`.
- Render: JSXGraph `otherintersection([c1, c2, exclude])` — giao điểm KHÁC `exclude`.
- DSL point kind + intent add-point constraint cùng tên.
- `exclude = A` (điểm chung của mọi đường tròn đường kính từ A).

## Rule `diameterCirclePairwise`

Prefilter: "đường kính" + ("đôi một" | "cắt nhau") + tâm "(O)".
Match: apex A + các đầu mút khác [B,C,D] từ list "đường kính AB, AC, AD"; tâm O;
tên kết quả [M,N,P] từ "tại M, N, P". Claim TRỌN đề (whole-problem construct).

Emit intents (apex A, others Xi, results Ri, ghép vòng (X0X1)→R0, (X1X2)→R1, (X2X0)→R2):
1. draw-circle (O): `centerRadius` center=O r=4 — tạo (O) + tâm O free.
2. add-point A,B,C,D = onCircle((O), theta) — theta cố định, vị trí tổng quát.
3. connect A–Xi segment (dây cung).
4. draw-circle kA Xi = `diameter` endpoints [A, Xi].
5. add-point Ri = circleSecondIntersection(kA Xj, kA Xk, exclude=A).

Fail-safe (escalate, KHÔNG dựng sai): thiếu tâm (O); <2 đường kính chung apex;
số tên kết quả ≠ số cặp; apex không nhất quán.

## Gates đi qua

coverage (claim trọn) → transpile (refs/topo OK) → verifyGeometry (onCircle vs
circleCR pass, kind mới skip static) → named-entity guard (O,A..D,M..P đều có).
`constraintKey` (verify.ts) exhaustive → BẮT BUỘC thêm case circleSecondIntersection.

## Files (15)

Render: 2d-constraint.ts, circle.ts, point-constraints/{circleSecondIntersection.ts,registry.ts}
DSL: schema.ts, kinds/circles/circleDiameter.ts, kinds/points/circleSecondIntersection.ts, registry.ts
Intent: intent.ts, intent-builders/add-point/{intersections.ts hoặc mới,index.ts}, intent-builders/draw-circle.ts, verify.ts
Rule: rules/diameterCirclePairwise.ts, rules/registry.ts
Tests: + e2e tryDeterministicFigure + unit rule + unit DSL kinds.
