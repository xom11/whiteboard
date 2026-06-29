# OCR formula-risk warning (cảnh báo công thức nghi sai)

**Ngày:** 2026-06-29 · **Hướng 1** (offline, không sửa text) · **Branch:** `feat/ocr-formula-risk-warning`

## Goal

Chặn user bị lừa bởi text OCR **trông sạch nhưng confidence vẫn cao** trong khi công thức/ký hiệu đã bị Tesseract huỷ. KHÔNG sửa text (thông tin mất ở tầng pixel→glyph, sửa = đoán mò) — chỉ **cờ cảnh báo** để user kiểm tra.

## Bối cảnh (đo thật trên ảnh user gửi)

```
Ảnh:  Cho x̂Ay = 90° ... tiếp xúc với Ax, Ay ... Chứng minh: a²/pq không đổi
OCR:  Cho TÂU = 90° ... tiếp xúc với Az, Ay ... Chứng minh:  <  không đổi   (conf=90!)
```
- `x̂Ay → TÂU` (mũ-cung trên chữ-thường-lẫn-hoa), `a²/pq → <` (phân số bị nuốt), `Ax → Az`.
- Confidence **90** dù sai → ngưỡng confidence vô dụng cho lỗi symbol. `repairOcrSymbols` KHÔNG cứu được (info đã mất).

## Scope

**Module mới:** `src/stamps/geometry-2d/ai/vision/detectFormulaRisk.ts` — `detectFormulaRisk(text): string[]`, thuần, không sửa text, trả lý do (rỗng = sạch). 3 marker precision-first:

- **M1** — `<`/`>` KHÔNG ở dạng bất đẳng thức `operand OP operand` (1 bên là `:`/từ/biên) ⇒ nghi phân số bị nuốt. Né `a < b`, `S1 < S2`.
- **M2** — `[A-Z0-9]?` + tiếp `[-=+)(]` ⇒ mũ ²/độ ° bị mất thành `?`. Né câu hỏi VN (`vuông?` chữ thường) + số thứ tự (`? 2,`).
- **M3** — token `[\p{L}]{1,6}` trước `= N°` chứa ký tự CÓ DẤU (point name thật là ASCII) ⇒ tên góc méo (`TÂU`). Né `ABC = 90°`.

**Surface:** `ExtractProblemSuccess += warnings: string[]` (extractProblem.ts, = `detectFormulaRisk(text)`). `handleExtractProblem`: khi `warnings.length>0` → trả kind `low-confidence` (UI sẵn có) với message cụ thể kể cả confidence cao — ưu tiên trên cảnh báo low-conf chung.

## Acceptance criteria

- E2E ảnh user: `warnings` = [phân số nghi nuốt, tên góc nghi sai] dù `confidence:'high'`. ✅ (verified)
- Positive (OCR thật): `TÂU = 90°`, `Chứng minh: <`, `BM? =`, `90? (`.
- Negative (không cờ nhầm): `a < b`, `S1 < S2`, `ABC = 90°`, `vuông?`, `vuông? 2,`, text sạch.
- `npm run typecheck` sạch; `npm test` xanh, 0 regression.

## Giới hạn thành thật (best-effort, KHÔNG bảo chứng)

- Bắt tin cậy: phân số/mũ/độ + góc-có-dấu.
- **KHÔNG** bắt được mọi ca: `x̂Ay → zAy` (không dấu, trông như token hợp lệ) → false-negative. `Ax → Az` không cờ. Đây là cảnh báo gợi ý, không thay được review của user.

## Out of scope

- Sửa/khôi phục công thức (info đã mất) — bất khả thi offline.
- Math-OCR / VLM cho vùng công thức (Hướng 2) — defer, đánh đổi offline.
