# Rule `lineConcurrency` — điểm đồng quy của bộ đường tam giác

**Ngày:** 2026-06-11
**Trạng thái:** Approved (brainstorming)

## Vấn đề

Đề hình học thường mô tả điểm đặc biệt qua sự **đồng quy** của một bộ đường trong
tam giác:

> Cho tam giác nhọn ABC nội tiếp (O). Các đường cao AD, BE, CF của tam giác ABC
> cắt nhau tại H.

Nguyên tắc người dùng nêu: vì đường cao / phân giác / trung trực / trung tuyến của
tam giác **đồng quy tại 1 điểm**, engine chỉ cần "lấy 2 đường giao nhau" thay vì
dựng cả 3 để xác định điểm đó.

### Hiện trạng (audit 2026-06-11)

| Phrasing | Kết quả |
|---|---|
| Đường cao **AD, BE, CF** cắt nhau tại H (đặt tên đoạn) | ✅ OK |
| Phân giác **AD, BE, CF** cắt nhau tại I | ✅ OK |
| Trung tuyến **AM, BN, CP** đồng quy tại G | ✅ OK |
| **Ba đường cao** … đồng quy tại H (không tên) | ❌ FAIL `named-missing H` |
| Ba đường cao … **cùng đi qua** H | ⚠️ "OK" nhưng **H bị bỏ âm thầm** (silent-incomplete) |
| Ba đường phân giác … cắt nhau tại I | ❌ FAIL I |
| Ba đường trung tuyến … đồng quy tại G | ❌ FAIL G |
| Trung trực (mọi dạng) | ❌ FAIL O |

**Phát hiện:** các case "OK" chỉ chạy nhờ rule `intersection` generic vớ được 2
đoạn **đặt tên** (AD, BE). Hễ đề viết "ba đường cao" (không tên) hoặc dùng
"đồng quy" là sập. Trung trực không bao giờ chạy vì đường trung trực không đặt
tên kiểu cặp-đỉnh nên `intersection` không có 2 đoạn để giao.

Các center kind (`orthocenter`/`incenter`/`circumcenter`/`centroid`) **đã** render
bằng cách dựng 2 đường ẩn rồi lấy giao (vd `point-constraints/orthocenter.ts`
tạo 2 đường cao ẩn → `intersection`), và **chạy được chỉ với tam giác + tên
điểm** (không cần đặt tên đoạn). Đây chính là hiện thực của nguyên tắc người dùng.

## Giải pháp

Thêm **một rule** `lineConcurrency` ánh xạ cụm đồng quy → center kind tương ứng.

### Nhận dạng (VN, ưu tiên)

```
(ba|các|hai)? đường <TYPE> … <VERB> (tại|qua)? (điểm)? <X>
```

- `TYPE → kind`:
  - `đường cao` → `orthocenter`
  - `(đường) phân giác (trong)` → `incenter`
  - `(đường) trung trực` → `circumcenter`
  - `(đường) trung tuyến` → `centroid`
- `VERB` (động từ đồng quy): `cắt nhau | đồng quy | gặp nhau | cùng đi qua`
- `X`: ký tự HOA ngay sau VERB (bỏ qua `tại/qua/điểm` xen giữa) = tên điểm đồng quy.
- Regex tiếng Việt: cờ `u` + lookaround `(?!\p{L})` thay `\b`; keyword có thể HOA
  đầu câu (`[Bb]a`, `[Đđ]ường`, `[Cc]ác`).

### Suy tam giác (`of` cho center kind)

1. Ưu tiên tam giác nêu **trong clause** (gần cụm từ khoá nhất).
2. Fallback tam giác **duy nhất toàn đề** (dedup theo bộ đỉnh). Nhập nhằng (>1
   tam giác, clause không nêu) → bỏ qua (escalate). Không có tam giác → bỏ qua.
3. **Riêng trung trực:** nếu clause nêu các cạnh ("trung trực của AB, BC, CA"),
   suy 3 đỉnh từ **hợp các cạnh** — nếu đúng 3 đỉnh phân biệt thì dùng làm tam
   giác; nếu không, fallback (1)/(2).

Tái dùng logic kiểu `centers.ts` (`triangleHits`/`resolveTriangle`/unique-triangle).

### Guard chống đụng path cũ (BẤT BIẾN: case đang pass giữ nguyên byte-identical)

Nếu `TYPE ∈ {cao, phân giác, trung tuyến}` **và** clause chứa ≥2 **cặp đỉnh đặt
tên** (token `[A-Z][A-Z]` sau từ khoá TYPE, vd "AD, BE, CF") → **KHÔNG emit
điểm**. Nhường rule `intersection`/`perpFoot`/`cevian` cũ xử lý (đoạn được vẽ +
điểm giao của 2 đoạn thật).

- Đường cao đặt tên: `perpFoot` bundle vốn đã emit `orthocenter` (đồng nghĩa) —
  vẫn skip để khỏi double-emit.
- Trung trực: KHÔNG có token cevian cặp-đỉnh (cạnh "AB" là object của "của",
  `intersection` generic không bắt — đã xác nhận empiric) → luôn emit
  `circumcenter`.

Ngược lại (không đặt tên đoạn, hoặc trung trực) → emit `add-point(center kind, of=[A,B,C])`.

### Vẽ đường?

**Không.** Chỉ tạo điểm đồng quy (tam giác + điểm). Không synthesize chân đường
cao / trung điểm / vẽ đường trung trực. Case đặt tên đoạn vẫn vẽ đoạn qua rule cũ.

## Phạm vi & Defer

- **Trong scope:** 4 loại đường tam giác (cao/phân giác trong/trung trực/trung
  tuyến) × 4 verb × {đặt tên (skip) / không tên (emit)}; vá silent-bug "cùng đi
  qua".
- **Defer:** phân giác **ngoài** → excenter; EN phrasing (VN trước, mirror sau);
  đồng quy ngoài tam giác (đường chéo tứ giác…).

## Test

- **Unit** (`rules/__tests__/lineConcurrency.test.ts`): mỗi TYPE × {named→skip,
  unnamed→emit} × vài biến thể verb; tam giác in-clause vs unique-fallback;
  trung trực suy đỉnh từ cạnh.
- **e2e:** ma trận phrasing audit ở trên → tất cả OK đúng kind.
- **Regression:** `npx tsx scripts/diag-all.ts` không giảm coverage; guard đảm
  bảo case đặt tên byte-identical. Full `npm test` xanh.

## Nguyên tắc fail-safe

Thiếu tên điểm / không suy được tam giác / nhập nhằng → **bỏ qua** (escalate),
KHÔNG bịa. Thà escalate còn hơn dựng sai.
