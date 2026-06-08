# Layout disjoint offset — D1 (issue #46 nhóm D)

> Spec — 2026-06-08. Ambition **Mức 1** (xếp ngang trái→phải, gap cố định) đã được user chốt.

## 1. Bối cảnh & vấn đề

Pipeline deterministic 2D dựng hình từ `Intent[]` qua `intentsToDsl` (`ai/intentToDsl.ts`).
Mỗi base shape dùng **canonical coord cố định tại gốc**:

- `triangleCanonical('any')` → `[[0,0],[5,0],[2,3]]`
- `squareCanonical()` → `[[0,0],[4,0],[4,4],[0,4]]`
- … (mọi shape neo tại `[0,0]`)

Khi một đề có **≥2 hình RỜI NHAU** (vd `"Cho tam giác ABC. Vẽ hình vuông DEFG."`), cả hai
hình dùng cùng canonical → **vertices trùng khít tại gốc** → render chồng lên nhau.

Bug đã VET (2026-06-08): `"Cho tam giác ABC. Cho tam giác DEF."` → 2 polygon + 6 free point
cùng origin → trùng khít.

### Vì sao offset khả thi & gọn (đã verify code)

- Schema `DslPointT`: **chỉ `kind:'free'` có `x`/`y`**. Mọi điểm phái sinh
  (midpoint/centroid/circle3/intersection/perpFoot/…) KHÔNG có coord → transpile tính lại
  từ ref → **tự đúng** sau khi free point dịch.
- `explicitCoords` (cyclic-quad đồng viên) được lưu **dưới dạng free point** → dịch free point
  là dịch luôn explicitCoords.
- ⇒ Offset = cộng `(dx, 0)` vào free-point của các component thứ ≥1; derived point tự theo.

## 2. Mục tiêu / Non-goals

**Mục tiêu (Mức 1):**
- Đề ≥2 component RỜI (không chia điểm/ref nào) → tách rời theo trục ngang, không chồng bbox.
- Đề 1 component (đa số) → **DSL coords KHÔNG đổi** (golden byte-identical). Bất biến số 1.

**Non-goals (Mức 1 cố tình KHÔNG làm):**
- KHÔNG phân biệt hình "nội tiếp/nested" với hình "rời" (không nhìn thấy ở tầng DSL).
  Hình `"DEF nội tiếp ABC"` (render thành 2 tam giác free không liên kết) sẽ **cũng bị tách rời**
  — chấp nhận: vốn đã render chồng/sai, side-by-side không tệ hơn (và rõ ràng hơn). Muốn giữ
  nested cần Mức 2 (luồng metadata intent→DSL) — defer.
- KHÔNG bin-packing / grid wrap / transpile-thật-lấy-bbox (Mức 3) — overkill, đề thi hiếm >2 hình rời.
- KHÔNG đụng gate escalate: đề nhập nhằng vẫn ESCALATE như cũ (fail-safe). Pass chỉ chạy trên
  DSL đã build xong (sau khi gate coverage đã GO).

## 3. Kiến trúc

Module thuần mới: `src/stamps/geometry-2d/ai/layout/disjointOffset.ts`

```ts
export function layoutDisjointComponents(
  points: DslPointT[],
  shapes: DslShapeT[],
): void;  // mutate in place (giống repairCircleIntersections)
```

Gọi tại `intentToDsl.ts`, **sau** `repairCircleIntersections`, **trước** `return`:

```ts
repairCircleIntersections(s.points, s.shapes);
layoutDisjointComponents(s.points, s.shapes);   // ← NEW
return { version: 1, points: s.points, shapes: s.shapes };
```

Thứ tự: repair (sửa circle-intersection collapse) PHẢI chạy trước; offset là layout cuối cùng.

## 4. Thuật toán

### B1. Union-find → connected components
- Node = mọi `point.name` và `shape.name`.
- Với mỗi entity (point + shape): `refs = collectRefs(entity)` (registry-driven, `transpile/refs.ts:205`).
  Union `entity.name` với từng ref trong `refs`. (KHÔNG hardcode per-kind.)
- Component = nhóm liên thông. 2 hình chia ≥1 điểm/ref → cùng component; rời hoàn toàn → khác component.
  - vd `midpoint M{p1:B,p2:C}` → union M~B~C → M cùng component tam giác ABC (không bị tách).
  - `circle3{p1:A,p2:B,p3:C}` → union với A,B,C.

### B2. Gom free point theo component
- Chỉ free point có coord → chỉ chúng được dịch.
- Map: component-root → list free point của nó.

### B3. Early-return (bất biến số 1)
- Số component CÓ free point ≤ 1 → **return ngay, không đổi gì** → đề 1-figure byte-identical.

### B4. Thứ tự component (deterministic)
- Sắp component theo **min index của free point thành viên** trong mảng `points` (thứ tự đã add =
  thứ tự đọc đề). Component có free point xuất hiện sớm nhất = **anchor (index 0)**, giữ nguyên gốc
  (`dx=0`). Các component sau dịch sang phải theo thứ tự này.

### B5. Bbox mỗi component (free-point + circle-radius-aware)
- Khởi tạo bbox từ coord các free point của component.
- **Mở rộng theo bán kính đường tròn** khi tâm có coord đã biết (là free point):
  - `circleCR{center, radius}`: nếu `center` là free point `(cx,cy)` → mở rộng
    `[cx−r, cx+r] × [cy−r, cy+r]`.
  - `circleCP{center, surfacePoint}`: nếu cả hai là free → `r = dist(center, surfacePoint)`,
    mở rộng quanh center.
  - `circle3` / đường tròn phái sinh khác (tâm không-free): bỏ qua mở rộng → dùng bbox free point
    (overhang cung tròn **chấp nhận**, gap đệm). Document rõ.
- Bbox = `{minX, maxX, minY, maxY}`.

### B6. Pack ngang trái→phải
- `GAP = 2` (board-unit).
- `cursorX = bbox(anchor).maxX + GAP`.
- Với mỗi component index ≥1 (theo thứ tự B4):
  - `dx = cursorX − bbox(comp).minX` (đặt mép trái comp tại cursorX), `dy = 0`.
  - Cộng `dx` vào `x` của **mọi free point** trong comp (in place).
  - `cursorX = (bbox(comp).maxX + dx) + GAP` cho comp kế.
- Vì chỉ dịch theo x và các khoảng `[minX,maxX]` rời nhau (gap>0) → **bbox mọi component rời nhau**
  bất kể y (x-interval disjoint ⇒ bbox disjoint).

### Edge cases
- Component toàn điểm phái sinh, 0 free point → bất khả (derived luôn ref điểm khác → liên thông
  với component chứa free point gốc). Không cần xử lý riêng; nếu xảy ra, component đó không có gì để dịch.
- `collectRefs` throw nếu kind thiếu registry — mọi kind hiện có trong registry (nguồn của schema) → an toàn.
- Free point dùng chung tên giữa 2 "hình" (vd cùng nhãn G) → union → 1 component (đúng: không rời).

## 5. Files

| File | Loại | Nội dung |
|---|---|---|
| `ai/layout/disjointOffset.ts` | NEW | `layoutDisjointComponents` thuần |
| `ai/layout/__tests__/disjointOffset.test.ts` | NEW | unit: union-find grouping, offset math, single-comp no-op, circle bbox |
| `ai/__tests__/layoutOffset-e2e.test.ts` | NEW | e2e: ≥2-comp → bbox disjoint (số học); 1-comp → coords bất biến |
| `ai/intentToDsl.ts` | EDIT | import + gọi 1 dòng sau repair |
| `scripts/probes-adversarial.txt` | EDIT | +≥1 probe render-disjoint rõ ("Cho tam giác ABC. Vẽ hình vuông DEFG.") + giữ escalate-safe đề nhập nhằng |
| `__snapshots__/intentToDsl.golden.test.ts.snap` | UPDATE | ~5-7 snapshot multi-figure đổi (review thủ công) |

## 6. Test / Verify plan

### TDD (viết test trước)
1. `disjointOffset.test.ts` (unit): 
   - 2 polygon rời (ABC + DEFG) → free point DEFG dịch sang phải; bbox rời.
   - 1 polygon → không đổi (no-op).
   - midpoint M của BC → M cùng component ABC (không tách).
   - 2 đường tròn circleCR (tâm free, R=2 và R=5) → bbox circle-radius-aware → tách đủ (circle không chồng).
2. `layoutOffset-e2e.test.ts`:
   - intentsToDsl trên intents ≥2-comp → assert **bbox component disjoint (số học)**, KHÔNG chỉ snapshot.
   - intentsToDsl trên intents 1-comp → assert coords **y hệt** trước offset (bất biến).
   - (Ca circle cần resolveCircleNames → dùng `tryDeterministicFigure` theo lesson #47.)

### Verify (sau implement)
1. `npm run typecheck` sạch.
2. unit + e2e mới xanh.
3. `npx jest` full:
   - `git diff` trên file `.snap` → **CHỈ block multi-figure đổi**; 1-figure byte-identical.
   - Review THỦ CÔNG từng snapshot đổi (coord hợp lý + bbox rời), rồi `jest -u` (KHÔNG `-u` mù).
   - Flaky `Whiteboard.unmount` verify isolated nếu xuất hiện.
4. `npm run check:matrix` → giữ 36 (không thêm kind).
5. `npx tsx scripts/diag-deterministic.ts` → render count có thể TĂNG (đề ≥2-comp render đủ thay vì chồng);
   đề nhập nhằng PHẢI giữ ESCALATE (guard không vỡ).
6. **Render VISUAL thật**: playground (`project_playground_deploy`) hoặc `eval-pdf-visual`
   (`project_ai_pdf_eval_session`) — 1-2 đề 2-hình, eyeball không chồng. (Xác nhận harness chạy được
   offline lúc implement; nếu không, numerical bbox-disjoint là guarantee chính.)

## 7. Churn dự kiến (số thật, đã phân tích DSL-level)

- Tổng 96 golden snapshot. Multi-component RỜI thật ≈ 4-5 (gen[17] bình-hành+chữ-nhật,
  gen[18] thoi+vuông, gen[19] 2 tam giác+centroid, gen[21] 2 tam giác+incircle, gen[26] 2 đường tròn)
  + nested ≈2 (gen[15], gen[16] — cũng đổi vì Mức 1 tách rời).
- ⇒ Churn **~5-7 snapshot**, gọn trong multi-figure. ~89 snapshot 1-component **byte-identical**.
- Số chính xác xác nhận lúc chạy golden test (review từng diff).

## 8. Rủi ro / Giới hạn chấp nhận (Mức 1)

- Hình nested ("nội tiếp") bị tách rời (không phải lồng nhau). Chấp nhận — vốn đã sai/chồng.
- `circle3` / đường tròn tâm-phái-sinh: overhang cung tròn vào gap (gap 2 đệm). Chấp nhận.
- Pack ngang cố định gap=2; không tối ưu diện tích. Đủ cho đề thi (hiếm >2 hình rời).

## 9. Triết lý
Fail-safe (không vì offset mà render đề nhập nhằng); pure function testable Node; bất biến
1-component byte-identical là ràng buộc cứng — verify riêng.
