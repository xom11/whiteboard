# OCR symbol repair (ảnh → text, trước bước vẽ hình)

**Ngày:** 2026-06-29 · **Approach:** A (heuristic post-OCR repair, offline) · **Branch:** `feat/ocr-symbol-repair`

## Goal

Cải thiện chất lượng bước **ảnh → text** (OCR) cho đề hình học VN: vá các ký hiệu toán mà Tesseract.js (`vie+eng`) đọc sai, để text đưa vào textarea + rule engine sạch hơn. Giữ **100% offline / client-side** (không VLM, không train lại, không host model).

## Bối cảnh đo lường (thực nghiệm)

Rasterize 2 PDF (MathType style + LaTeX style) @200dpi → chạy chính `runTesseractOcr` (tesseract.js 7.0.0, `vie+eng`). Confidence 86–88 dù sai symbol (prose tiếng Việt đọc tốt → **confidence KHÔNG phát hiện lỗi symbol**). Failure taxonomy:

| Symbol | OCR đọc thành | Impact vẽ hình | Vá? |
|---|---|---|---|
| `⊥` | `1`, `\|`, `L` (kẹp 2 nhóm-hoa) | HIGH | ✅ R1 |
| `△`/`∆` | `A` dính đầu → `AABC`, `AMBE` | HIGH | ✅ R2 (chỉ câu đề) |
| `(O)` | `(0)` | MEDIUM | ✅ R3 |
| `∈` | `e` dính cuối list → `Be` | MEDIUM | ✅ R4 |
| dấu mũ góc `Â`,`D̂ÂN̂` | mũ BIẾN MẤT, chữ còn → `A`,`DAN` | LOW (vẫn parse được) | bỏ qua (đã ổn) |
| `°` | giữ nguyên `90°` | LOW | n/a |
| `√ ² subscript phân số ⇒` | `V ? Spon` garbage | LOW (nằm ở **lời giải**, không phải câu "Cho…") | OUT |

## Key decisions

1. **Vá thao tác trên TOKEN ĐÃ HỎNG** (`AABC`, `MK 1 AB`), không phải glyph gốc. `normalizeText.TRIANGLE_SYMBOL` hiện khớp `∆` thật → không bao giờ fire trên output OCR (glyph đã thành "A"). Đây là lý do bug "mất tam giác" chưa được vá.
2. **Đặt repair ở TẦNG OCR** (`extractProblem.postProcess`), **KHÔNG** ở `normalizeText` dùng chung — vì "L" gõ tay = điểm L, "ABCD" = tứ giác thật. Chạy luật OCR-repair trên text gõ tay sẽ phá input hợp lệ. Đặt ở OCR boundary → user thấy + sửa trong textarea.
3. **Precision-first**: thà bỏ sót còn hơn vá sai (vá sai đổi luôn hình). Lưới an toàn = textarea review + rule engine chịu nhiễu.
4. **Phân vai**: `repairOcrSymbols` (mới, OCR layer) lo token-hỏng; `normalizeText` (giữ nguyên) lo glyph-thật. Bổ sung nhau, không trùng.

## Scope

**Module mới:** `src/stamps/geometry-2d/ai/vision/repairOcrSymbols.ts` — `repairOcrSymbols(text: string): string`, thuần, idempotent, không throw.

**Hook:** trong `postProcess` của `extractProblem.ts`, thứ tự: `strip markdown → collapse \s+ → NFC → repairOcrSymbols → cap 2000`.

**Bộ luật** (chạy theo thứ tự R1→R4, trên text đã collapse 1-space + NFC):

- **R1 ⊥** — `<HOA{2,3}'?> [1|L] <HOA{2,3}'?>` → `$1 ⊥ $2`. Gate: 2 bên là tên-điểm 2-3 chữ hoa; giữa đúng 1 ký tự. Né "Câu 1", "(1)".
- **R2 △** — `(Cho|Xét)\s+A([A-Z]{3})` + lookahead hậu-tố tam-giác `(đều|cân|nhọn|vuông|nội tiếp|ngoại tiếp)` → `$1 tam giác $2`. CHỈ câu đề. Cố ý bỏ `có`/`,`/`.` khỏi lookahead để né "Cho ABCD có…" (tứ giác thật). △ ở lời giải ("Suy ra △ADN…") cố ý bỏ qua.
- **R3 (O)** — `\(0\)` → `(O)`. Chỉ dạng bare; không đụng `(0;…)` để né toạ độ (ngoài domain hình học vẽ vào-10).
- **R4 ∈** — `<list điểm phẩy> e \((O|0)\)` → `$1 ∈ (O)`. Gate chặt: cần list-điểm-phẩy + `(O)` ngay sau.

## Acceptance criteria

- `repairOcrSymbols` vá đúng các chuỗi OCR **thật đã đo** (dùng làm fixture): `IH 1 CE`→`IH ⊥ CE`, `BK | AM`→`BK ⊥ AM`, `AO L BC`→`AO ⊥ BC`, `Cho AABC đều nội tiếp (O;R)`→`Cho tam giác ABC đều nội tiếp (O;R)`, `A,M,C,Be (0)`→`A,M,C,B ∈ (O)`.
- **Negative**: KHÔNG đổi `Câu 1`, `điểm L thuộc`, `Cho hình vuông ABCD có cạnh`, `Cho ABCD có 4 cạnh` (giữ ABCD), `(1)`.
- Idempotent: `repair(repair(x)) === repair(x)`.
- `npm run typecheck` sạch; `npm test` xanh (vision + normalizeText + test mới), 0 regression.

## Out of scope

- Vá `√ ² subscript phân số ⇒` (nằm ở phần lời giải, không phục vụ dựng hình).
- Tín hiệu cảnh báo symbol-aware (Section 4 brainstorm) — defer.
- Preprocessing ảnh / `vie+eng+equ` / custom traineddata (Approach B/C) — defer.
- Lọc nhiễu nhãn hình vẽ (diagram-label noise) — defer (cần line-structure trước collapse, rủi ro).
- Đụng `normalizeText` (giữ nguyên, bổ sung).

## Cập nhật 2026-06-29 #2 (mở rộng từ ảnh ví dụ tứ giác nội tiếp)

Đo thật thêm 1 ảnh (`AB∩CD={E}`, `△PQE cân`, `EF²`) lộ 3 gap + 1 bug:

- **BUG R2 cũ (đã sửa):** `(Cho|Xét) A[A-Z]{3} ... nội tiếp` vá NHẦM `"Cho ABCD nội tiếp (O)"` (tứ giác nội tiếp, không có chữ "tứ giác") → `"tam giác BCD"`. Vì `nội tiếp` không phân biệt tam giác/tứ giác. **Fix:** tách R2 thành (a) **R2a strict** hậu tố tam-giác-thuần `cân/đều/nhọn/vuông` ngay sau, KHÔNG cần Cho/Xét (bắt cả `"Chứng minh: APQE cân"`), guard `(?<!giác )(?<!thang )`; (b) **R2b doubled** `AA[A-Z]{2}` + `nội/ngoại tiếp` — dùng tín hiệu **A nhân đôi** (△ABC→"AABC"; tứ giác "ABCD"→"AB.." không nhân đôi) để vá `△ABC nội tiếp` mà KHÔNG đụng tứ giác.
- **R5 ∩** — `"AB ∩ CD = {E}"` → ∩ đọc thành "N" dính (`"ABN CD = {E}"`). Gate `= {` (tập hợp giao điểm) ⇒ hiếm false-positive. Vá ∩ (mút méo như `BƠ` vẫn để nguyên — lỗi nhầm-ký-tự, ngoài phạm vi).
- **R6 ²** — `"EF²"` → `"EF?"` (chữ HOA + `?` + toán tử). Reconstruction precision cao (khác `TÂU`/`<` bất khả thi). Né câu hỏi VN (chữ thường trước `?`). Vá xong thì `detectFormulaRisk` không cảnh báo nữa (đã đúng).

Verify: áp pipeline lên RAW OCR thật ảnh #2 → `(O)`/`AB ∩ CD`/`tam giác PQE`/`EF²` đúng, `"tứ giác ABCD nội tiếp"` giữ nguyên, warnings rỗng. +11 test, 3550 xanh, 0 regression. Lỗi nhầm-ký-tự (`BC→BƠ`, `AB→ADB`) vẫn ngoài phạm vi (cần dictionary/semantic).
