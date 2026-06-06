# Deterministic-first intent pipeline — Mức 2 (kết quả)

- **Ngày:** 2026-06-06 · **Issue:** #43 · **Spec:** `docs/superpowers/specs/2026-06-06-deterministic-first-muc2-coverage-design.md`
- **Tiền đề:** Mức 1 (`2026-06-06-deterministic-first-muc1.md`). KHÔNG đổi kiến trúc — chỉ mở rộng phrasing VN trên backbone rule registry.

## Đã ship (Mức 2 hoàn tất)

Vá **7 coverage gap** (6 theo plan + 1 lộ ra ở vòng đối kháng), mỗi gap = nới regex trong module gốc + fixture cạnh module. EN language defer → Mức 3.

| Gap | Module | Thay đổi |
|---|---|---|
| 1. "trung điểm cạnh huyền/đoạn thẳng BC" | `midpoint.ts` + `_shared.ts` | helper `SIDE_PREFIX` `(?:cạnh(?:\s+huyền)?\s+|đoạn(?:\s+thẳng)?\s+)?` ở 2 pattern |
| 2. "phân giác trong AD" | `cevian.ts` | `(?:\s+trong)?` ở forward; suffix `+(?!\s+ngoài)` chặn nhận nhầm external bisector |
| 3. "(O; R) ngoại/nội tiếp tam giác" | `circleTriangle.ts` | nhánh quét TOÀN đề (segmenter cắt ';'); guard `(?![^)]*[A-Z]\s*[;,])` chặn `(A;B;C)` méo |
| 4. "tam giác ABC ngoại tiếp đường tròn (I)" | `circleTriangle.ts` | `TRI_CIRCUMSCRIBES_CIRCLE` → incircle; "đường tròn" BẮT BUỘC sau "ngoại tiếp" (disambig circumcircle) |
| 5. điểm phẩy C′ trong DIST_CLAUSE | `pointAtDistance.ts` | `+(?:['′]?)` sau cặp đỉnh |
| 6. "Kẻ AH ⊥ BC tại H" | `perpFoot.ts` | PREFILTER `+⊥\|vuông góc`; pattern `PERP_DRAW` chỉ emit add-point (connect.ts lo segment); "tại X"≠chân → skip |
| 7. **(đối kháng)** keyword HOA đầu câu | `cevian.ts` | `[Đđ]ường/[Tt]rung/[Pp]hân` ở pattern + PREFILTER |

### Verify
- Full suite **2060 pass, 0 fail** (baseline 2022 → +38 fixture Mức 2). Typecheck clean.
- Diag harness `scripts/probes-adversarial.txt`: **37 render / 16 escalate** (baseline 27/12 → +10 render, +4 escalate Mức 2). **0 regress** trên 39 probe gốc.
- **2 workflow đối kháng** (Phase A xác minh root-cause 6 agent; Phase C sinh 120 probe 7 agent → triage qua gate thật).

### Bug đối kháng đã sửa (Phase C)
- **Gap 7 (silent-wrong):** "Đường cao AH" (hoa "Đường") không khớp cevian (pattern "đường" thường, không cờ 'i') → trong "Đường cao AH ... trung tuyến BH" chỉ median khớp → **xung đột tên chân H KHÔNG phát hiện** → render midpoint(H) SAI. Fix `[Đđ]/[Tt]/[Pp]` → cả 2 khớp → footCount=2 → escalate đúng.

## Triết lý fail-safe (giữ nguyên, verify lại)
Mọi pattern mới: mơ hồ/không nhận dạng/xung đột → KHÔNG claim → escalate. Phase C xác nhận:
- "phân giác ngoài", "cạnh thẳng"/"đoạn huyền", paren méo "(A;B;C)", distance có toán tử (2R/R+1/2·R/-3), "tại X"≠chân, prime trùng đỉnh (C′ khi C là đỉnh) → đều escalate hoặc drop-safe.

## Tolerance đã xác nhận (THIẾU, không SAI — chấp nhận)
Render shape hợp lệ + drop construct chưa hỗ trợ (KHÔNG render sai ngữ nghĩa):
- "đường tròn ngoại tiếp **tứ giác/hình chữ nhật**" → render quad/rect, drop circle (có sẵn baseline).
- "tam giác ABC ngoại tiếp **tứ giác** DEFG" → render 2 shape, không nhầm incircle (gap 4 disambig đúng).
- external bisector / construct chưa hỗ trợ nằm CÙNG clause với tam giác → render tam giác, drop construct (coverage per-clause). Dạng "." (clause riêng) thì escalate.

## Defer → Mức 3
- **EN language** đầy đủ (`languages` đã sẵn).
- **circle ngoại tiếp tứ giác** (qua 4 điểm), **external bisector** (phân giác ngoài), **tia phân giác theo GÓC** (không đặt tên chân).
- **prime point trùng đỉnh:** "C′" khi C là đỉnh tam giác → strip prime → trùng C → drop+escalate (fail-safe). Muốn render cần giữ prime xuyên pipeline (tên đa-ký-tự).
- **distance nâng cao** pointAtDistance: hệ số/bội (2R, k·AB, R±1) — đang escalate.
- **connect "tia BA"** từ "tia đối của tia BA": connect.ts vẽ tia BA (hướng ngược) — pre-existing, nên guard ở connect cleanup.
- **"(O;R)" radius CHỮ standalone** ("Cho đường tròn (O;R)") chưa claim (circleRadius cần số) → escalate.
- **vocab "⊥":** clause chỉ có "⊥" (không chữ "vuông góc") → hasGeometry=false; có shape context thì vẫn DET.

## Workflow note (xác nhận lại Mức 1)
Fan-out read-only (xác minh + sinh probe) hiệu quả; agent dự đoán expected hay SAI (probe thiếu ngữ cảnh tam giác → đoán render nhưng đúng phải transpile-fail escalate) — **phải chạy qua gate thật mà triage, không tin self-report**. Fix shared/cross-cutting (SIDE_PREFIX, cevian keyword) làm INLINE.
