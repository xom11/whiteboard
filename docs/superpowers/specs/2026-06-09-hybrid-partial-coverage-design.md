# Hybrid partial-coverage — deterministic dựng phần làm được, LLM chỉ bù clause thiếu

Ngày: 2026-06-09 · Trạng thái: **Phase 1 DONE (lõi deterministic, không LLM); Phase 2/3 PENDING (cần Ollama/Claude + eval)** · Liên quan: [[project_ai_rule_engine_wire_cleanup]]

## Tiến độ
- **✅ Phase 1 (2026-06-09)**: `tryPartialDeterministic` (`deterministic/runDeterministicIntents.ts` — refactor tách `collectDeterministic` dùng chung) + `mergeIntents` (`ai/mergeIntents.ts`) + test thuần (10 case). Export qua barrel. Gate `runDeterministicIntents` byte-identical (test xác nhận). CHƯA wire vào generateFigureIntent.
- **⏳ Phase 2 PENDING**: `buildIntentContinuationPrompt` + wiring Track A.5 sau flag `useHybrid` (default OFF). Cần prompt-engineering + mock-provider test.
- **⏳ Phase 3 PENDING**: eval (Ollama 12b / Claude) đo hybrid-success + F1 → quyết định bật default. Cần môi trường eval.

## Vấn đề

Coverage gate hiện **all-or-nothing**: `tryDeterministicFigure` chỉ trả kết quả khi MỌI clause geo được rule claim (`coverage.complete`). Chỉ cần 1 clause geo không phủ → `incomplete-coverage` → **escalate TOÀN BỘ sang LLM** (LLM dựng lại từ đầu, kể cả phần deterministic đã làm được).

Hệ quả: đề "gần đủ" (vd tam giác ABC + 3 construct quen + 1 construct lạ) → mất 100% sang LLM dù 90% dựng được deterministic. Đây là nguồn escalate lớn nhất → tốn token + chậm.

## Mục tiêu

Khi deterministic phủ ĐƯỢC MỘT PHẦN (≥1 clause claimed, nhưng chưa đủ): giữ phần deterministic, **chỉ hỏi LLM cho clause còn thiếu**, rồi merge. Giảm token (chỉ gen phần thiếu) + tăng tỉ lệ phần đúng-đảm-bảo (deterministic).

**Bất biến an toàn:** đề đang `complete` (deterministic hit) → KHÔNG đổi (byte-identical). Đề `no-match` (0 clause claimed) → vẫn full LLM. Hybrid CHỈ kích hoạt ở vùng `incomplete-coverage` (hiện đang full-escalate) → blast radius chỉ là các case đang escalate.

## Thiết kế

### Flow mới trong `generateFigureIntent` (chèn Track A.5 giữa A và B)

```
Track A: tryDeterministicFigure(problem)
  ├─ ok → return (như cũ)
  └─ !ok:
       ├─ reason 'no-match'           → Track B full LLM (như cũ)
       └─ reason 'incomplete-coverage' + có ≥1 intent deterministic:
            → Track A.5 HYBRID:
               1. detIntents = intents từ clause đã claim
               2. uncovered = coverage.uncovered (Clause[])
               3. LLM continuation: prompt = system + "Điểm/hình đã có: <tên>.
                  Chỉ sinh intent CHO phần chưa xử lý: <uncovered text>.
                  KHÔNG định nghĩa lại điểm đã có."
               4. merge(detIntents, llmIntents) → dedup + resolveCircleNames
               5. normalize → intentsToDsl → transpile → verify → guards
               6. pass → return (provider:'hybrid', usage = LLM partial)
                  fail → fallback Track B full LLM (như cũ)
```

### Thành phần cần viết
1. **`runDeterministicIntents` (mở rộng)**: trả thêm `partialIntents` + `uncovered` cả khi `incomplete-coverage` (hiện chỉ trả khi complete). Hoặc hàm mới `collectPartialIntents(problem)`.
2. **`tryPartialDeterministic(problem)`** (deterministic-only, không LLM): trả `{detIntents, uncoveredClauses, claimedClauseIds}`. Tách để test thuần.
3. **`buildIntentContinuationPrompt(existingNames, uncoveredText)`**: prompt mode "tiếp tục" — liệt kê tên đã có (cấm redefine) + chỉ clause thiếu. Tái dùng phần lớn `buildIntentSystemPrompt`.
4. **`mergeIntents(det, llm)`**: dedup theo JSON; phát hiện + xử lý name collision (LLM redefine điểm đã có → drop bản LLM, giữ deterministic). Reuse `resolveCircleNameCollisions`.
5. **Wiring trong `generateFigureIntent`** + reason mới `provider:'hybrid'`.

### Quyết định cần chốt (CHỖ CẦN BẠN DUYỆT)
- **A. Điều kiện kích hoạt hybrid**: chỉ khi `incomplete-coverage` + ≥1 intent? Hay thêm ngưỡng (vd ≥50% clause claimed)? → đề xuất: ≥1 intent (đơn giản, fallback gánh phần còn lại).
- **B. Continuation prompt**: full system prompt + context, hay prompt rút gọn? → đề xuất: full system (đảm bảo LLM biết vocab/schema) + section "đã có / chỉ bù".
- **C. Name collision**: LLM redefine điểm deterministic → ưu tiên giữ deterministic (drop LLM dup). Đồng ý?
- **D. Fallback**: hybrid fail (transpile/guard) → full LLM. Hay trả luôn phần deterministic + báo thiếu? → đề xuất: full LLM (an toàn, đúng hành vi hiện tại).

### Verification (BẮT BUỘC trước khi merge)
1. **Classification-diff** (pattern #46/#47): chạy corpus probe → confirm các case `complete` cũ IDENTICAL (hybrid không đụng). Case `incomplete` cũ: đo có dựng được nhiều hơn không.
2. **Eval `eval-intent.ts`** (cần Ollama/Claude): so F1 + tỉ lệ deterministic-contribution trước/sau. Chứng minh hybrid ≥ full-LLM trên tập escalate (KHÔNG được tệ hơn).
3. Full test suite green + typecheck.

### Rủi ro
- **Model nhỏ (Gemma 4B) làm continuation kém** (không hiểu "chỉ bù phần thiếu") → merge ra rác. Mitigate: transpile + guard gate + fallback full-LLM. Nhưng nếu hybrid thường fail→fallback thì TỐN HƠN (2 lần LLM). → **cần eval đo tỉ lệ hybrid-success trước khi bật mặc định**; có thể gate sau opt-in `useHybrid` (default off cho tới khi eval xác nhận).
- Continuation prompt là prompt-engineering mới → cần vài vòng tinh chỉnh + eval.

### Đề xuất thực thi (vì rủi ro + cần eval)
- **Phase 1**: `tryPartialDeterministic` + `mergeIntents` + test thuần (không LLM) — deterministic, an toàn, đo được.
- **Phase 2**: continuation prompt + wiring sau `useHybrid` flag (default OFF).
- **Phase 3**: eval (Ollama 12b / Claude) đo hybrid-success + F1 → nếu ≥ full-LLM thì bật default.
- Mỗi phase commit riêng; Phase 3 quyết định có ship default hay không.

## Defer / ngoài scope
- Streaming continuation. Refine/delta path (đã có riêng). Multi-round hybrid (chỉ 1 vòng bù).
