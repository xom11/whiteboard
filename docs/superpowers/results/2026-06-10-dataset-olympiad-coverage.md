# Dataset olympiad coverage — phiên 2026-06-10

Dataset: `docs/datasets/mot-so-bai-tap-chon-loc-hinh-hoc-phang.txt` (29 bài HSG/olympiad).
Harness: `npx tsx scripts/eval-dataset.ts [--only=N] [--verbose]` (chạy `tryDeterministicFigure`, KHÔNG LLM).

## Kết quả

**0/29 → 17/29 HIT** (5,7,8,9,10,11,12,13,16,18,19,22,24,27,28,29 + **4 mixtilinear**) — phiên 3.
đề olympiad mỗi bài xâu chuỗi 5-10 construct + coverage gate all-or-nothing (1 clause
miss → cả bài escalate) ⇒ phải hoàn tất TRỌN chuỗi mới flip. Tất cả thay đổi
regression-free (2627 test + 207 golden snapshot xanh, typecheck sạch).

## Đã thêm (committed, theo thứ tự)

**Hệ thống (đòn bẩy rộng):**
- `coverage.ts`: strip enum `a)/b)/1.` trước nhận diện proof → conclusion không bị đếm là geo.
- `normalizeText.ts`: Δ/∆→"tam giác", "vòng tròn"→"đường tròn" (áp ở collectDeterministic + tryDeterministicFigure).
- `resolveSegmentRef` **optimistic**: 2 ký tự HOA → ensureSegment kể cả điểm dựng sau (gỡ priority-inversion implicit-line; transpile validate fail-safe).
- `resolveCircleNames.collectPointRefs` nhận `reflectPoint.through` → "đối xứng A qua O" (O là circle) inject tâm + rename circle (gỡ KIND_MISMATCH circumcircle-as-point).
- triangle + circleTriangle + perpFoot `TRI_G`: nuốt tính từ "nhọn|tù|cân|đều|vuông" trước nhãn đỉnh (trước đó "tam giác nhọn ABC" không dựng được A,B,C — chặn rất nhiều bài).

**Construct/biến thể mới:**
- `polygonInscribedCircle`: "hình vuông/chữ nhật ABCD nội tiếp (O)" → circumcircle through3.
- `perpAtPointCutsLine`: "Đường ⊥ AB tại B cắt CD ở I".
- `tangentAtCutsLines`: "Tiếp tuyến của (O) tại C cắt AD,AB tại P,Q".
- `diameterEndpoint`: "AD là đường kính của (O)" → D = reflectPoint(A,O) (xuyên tâm).
- `tangentAt`: "Tiếp tuyến tại B,C cắt nhau tại T"; prefilter `[Tt]` (sentence-initial).
- `intersection`: 1∩2 "MA cắt DB,DC tại X,Z" + 2∩1 "TC,TB lần lượt cắt EF tại P,Q" + "cắt … tại điểm T".
- `lineCircleIntersection`: "cắt (O) tại điểm Z khác W" + "giao điểm của XY và (O) là Z"; prefilter +"giao điểm".
- `onCirclePoint`: "cung lớn/nhỏ <pair>" word-order, "là (một) điểm trên cung", "Các điểm E,F thuộc cung", "M,N là hai điểm thuộc cung", bare "(O)", "đường tròn tâm O".
- `perpFoot`: "của điểm X", "trên các đường thẳng L1,L2", distributive không "lần lượt", "BE,CF là (hai) đường cao" (token trước).
- `reflection`: "đối xứng với (điểm) X qua tâm O" → reflectPoint.

## Blocker còn lại (đòn bẩy cao cho follow-up)

1. **circle-through-2-points cutting sides** ("(I/K) qua B,C cắt AB,AC tại M,N") — Câu 5,22,24,27.
   Cần wire `onPerpBisector` qua intent + DSL kind (scene constraint đã có) HOẶC circle-spec "through2"
   (tâm free trên trung trực). Câu 5 chỉ còn DUY NHẤT gap này.
2. **incircleTangency phrasing** "(I) tiếp xúc BC,CA,AB tại D,E,F" không build D,E,F — Câu 20,22.
3. **Câu 25 CYCLE** chord (O_c) ↔ onArc M (chord rule dựng circle inscribedIn nhầm + tâm collision).
4. **named-line refs đặt tên thường / circleIntersection** — Câu 8,11,13,29.
5. **Exotic (Tier 2, defer):** mixtilinear incircle (4,24), tiếp tuyến chung 2 đường tròn (26),
   2 nửa đường tròn (6), metric AN=NE/AD=BC/AB=2AC (1,14,20), tiếp tuyến tại điểm-trên-cung (15).
