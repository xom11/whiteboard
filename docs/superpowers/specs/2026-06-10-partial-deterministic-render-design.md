# Partial deterministic render + smart miss log

**Ngày:** 2026-06-10
**Trạng thái:** Approved (brainstorming) → implement
**Phạm vi:** `src/stamps/geometry-2d/ai/` (deterministic pipeline) + `src/stamps/shared/types.ts`

## Vấn đề

Pipeline rule-base hiện chạy **all-or-nothing**: `tryDeterministicFigure` chỉ cần 1 trong
4 gate (coverage / transpile / verify) hoặc 2 guard (named-entity / fidelity) fail là vứt
toàn bộ kết quả, trả `{ ok:false }` → báo miss. Hệ quả:

1. Đề chỉ "vướng" 1 điểm cuối (vd `D` dựng bằng construct chưa hỗ trợ) thì **mất luôn**
   phần đã chắc chắn đúng (tam giác `ABC`, đường tròn `(O)`…). User không nhận được gì.
2. Log báo miss tuy có (`describeDeterministicMiss`) nhưng không phân biệt rõ **phần nào đã
   vẽ được** vs **phần nào user cần tự dựng**, và **vì sao** (chưa hỗ trợ cấu trúc, hay phụ
   thuộc một phần khác chưa vẽ).

## Mục tiêu

- **Render phần dựng được**: nếu rule base dựng được ≥1 hình thật (đoạn/đường/đa giác/đường
  tròn) **chắc chắn đúng** (qua transpile + verify), thì render phần đó thay vì báo miss.
- **Smart log**: liệt kê rõ ràng cho user phần chưa vẽ được để họ tự dựng nốt, phân loại
  theo lý do.
- **KHÔNG gọi LLM** (đúng tinh thần dự án: LLM chậm + tốn tiền). User tự vẽ phần còn lại.
- **Non-breaking**: đề full-coverage giữ nguyên đường đi cũ (byte-identical); đề no-match
  giữ nguyên báo miss.

## Quyết định đã chốt (brainstorming)

| # | Quyết định |
|---|------------|
| 1 | Chỉ rule base — KHÔNG LLM. User tự vẽ nốt. |
| 2 | To-do list hiện trong **panel AI** (message), không chèn annotation vào hình. |
| 3 | Render khi có **≥1 hình thật** (`dsl.shapes.length ≥ 1`). Chỉ điểm rời → báo miss toàn bộ. |
| 4 | Engine: **Hướng A** — cắt tỉa theo phụ thuộc + verify lại tập con (ở tầng DSL). |

## Kiến trúc

Thêm 1 module thuần `deterministic/partialFigure.ts`. `generateFigureIntent` gọi nó trên
**nhánh thất bại** của `tryDeterministicFigure` (sau khi đã thử full). `tryDeterministicFigure`
**giữ nguyên contract** (`ok: true | false`) — partial là đường đi tách biệt.

```
generateFigureIntent(problem)
  ├─ tryDeterministicFigure(problem)
  │     └─ ok:true  → IntentSuccessResult (full, KHÔNG đổi)
  └─ (det fail) → tryPartialFigure(problem)
        ├─ render-worthy → IntentSuccessResult { partial: { message } }   ← MỚI
        └─ null          → IntentFailureResult deterministic_miss (như cũ)
```

### `tryPartialFigure(rawProblem): PartialFigureResult | null`

File: `src/stamps/geometry-2d/ai/deterministic/partialFigure.ts`. Hàm thuần, không I/O.

```ts
interface PartialTodo {
  /** Clause geo chưa có rule nào khớp (nguyên văn) → "chưa hỗ trợ cấu trúc". */
  uncovered: Clause[];
  /**
   * Tên đối tượng đề CÓ nêu nhưng không dựng được (vd "P là điểm Fermat", đỉnh D).
   * Đây là kịch bản "ABC vẽ được, D thì không": clause được rule claim (coverage
   * COMPLETE) nhưng entity không ra → KHÔNG phải ref treo, chỉ named-entity guard
   * (`allNamedEntitiesPresent`) thấy. Đã loại trùng với `pruned`.
   */
  missingNamed: string[];
  /** Tên entity bị cắt vì phụ thuộc phần chưa dựng được (transitive). */
  pruned: string[];
}
interface PartialFigureResult {
  figure: DeterministicFigure;  // intents + dsl (đã cắt) + transpile + verify + coverage
  todo: PartialTodo;
}
```

> **Phát hiện khi implement:** Kịch bản kinh điển "ABC vẽ được, D thì không" thường
> rơi vào reason `named-missing` (coverage complete, không phải `incomplete-coverage`).
> Khi đó `uncovered` rỗng và D không bị ref nào trỏ tới → CHỈ `allNamedEntitiesPresent`
> thấy D. Vì vậy partial PHẢI chạy named-entity guard trên DSL đã cắt và đưa `missing`
> vào to-do, nếu không user nhận hình ABC kèm to-do RỖNG (vô dụng).

**Thuật toán (Hướng A, tầng DSL):**

1. `problem = normalizeProblemText(rawProblem)`.
2. `part = tryPartialDeterministic(problem)` → `detIntents`, `uncovered`, `coverage`.
   Nếu `detIntents.length === 0` → `return null` (không có gì để cứu).
3. `intents = resolveCircleNameCollisions(normalizeIntents(detIntents, problem))`
   — **mirror** đúng các stage chuẩn hoá của `tryDeterministicFigure` để 2 path hội tụ.
4. `dsl = intentsToDsl(intents)` (try/catch → throw thì `return null`).
5. **Cắt lan truyền (dependency closure):** lặp tới fixpoint — bỏ mọi phần tử mà
   `collectRefs(entity)` chứa tên KHÔNG có trong DSL hiện tại (ref treo = entity của clause
   chưa phủ). Mỗi vòng cập nhật tập "present", phần tử vừa bỏ làm dependent của nó thành
   treo ở vòng sau. Ghi tên bị bỏ vào `pruned`.
6. **Transpile + verify + salvage (bounded ~4 vòng):**
   - `transpile(dsl)`. Throw → `return null`. `!ok` → lấy `owner = err.path[0]` của các lỗi,
     bỏ các owner đó (+ chạy lại closure ở bước 5 cho dependent), lặp. Không pin được owner
     nào → `return null`.
   - `verifyGeometry(intents, dsl)`. `!ok` → trích nhãn tam giác từ `wrong[].detail`
     (`triangle ABC …`), bỏ điểm/shape liên quan, lặp. Không trích được → `return null`.
7. **Ngưỡng:** `dsl.shapes.length ≥ 1` và transpile+verify ok → trả `PartialFigureResult`.
   Ngược lại (chỉ còn điểm rời / không cứu được) → `return null`.

`pruned` cuối cùng = tất cả tên bị bỏ trong (5)+(6) **mà có xuất hiện trong intents gốc**
(không kể tên trung gian rác). To-do = `uncovered` + `pruned`.

### Smart log — `describePartialTodo(todo): string`

Cùng file. Sinh message tiếng Việt cho panel AI:

```
✅ Rule base đã dựng được phần chắc chắn đúng.
✏️ Bạn tự dựng nốt:
 • «<uncovered clause text>» (chưa hỗ trợ cấu trúc này)
 • <missingNamed> (chưa dựng được — tự xác định)
 • <prunedName> — phụ thuộc phần chưa vẽ được
```

- Nhóm 1 (`uncovered`): nguyên văn clause, hậu tố "(chưa hỗ trợ)".
- Nhóm 2 (`missingNamed`): tên đối tượng đề nêu nhưng không dựng được.
- Nhóm 3 (`pruned`): tên + "(phụ thuộc phần chưa vẽ)".
- Nếu cả 3 rỗng → fallback câu chung (hiếm: full miss vì lý do khác đã salvage).

## Thay đổi type & wiring

1. **`partialFigure.ts`** (new): `tryPartialFigure`, `PartialTodo`, `PartialFigureResult`,
   `describePartialTodo`.
2. **`buildFigureIntent.ts`**: `IntentSuccessResult` thêm field optional
   `partial?: { message: string }`. `generateFigureIntent` gọi `tryPartialFigure` trên nhánh
   `!det.ok`; render-worthy → trả success kèm `partial`. Miss → giữ nguyên `deterministic_miss`.
3. **`handleGenerateFigure.ts`**: nhánh `r.ok` truyền `partial` qua:
   `{ ok: true, state: r.transpile.state, partial: r.partial }`.
4. **`shared/types.ts`**: `AiFigureUiResult` thành công thành
   `{ ok: true; state: State; partial?: { message: string } }`.
   (`handleGenerateFigureIntent` cũng thêm `partial?` vào `kind:'success'` cho parity.)
5. **`editor/useAiFigure.ts`**: thêm state `notice: string | null`; khi `generated.partial`
   → `setNotice(message)` (song song với việc trả `state` để chèn hình). Clear ở mỗi submit.
6. **`editor/AiFigurePrompt.tsx`**: render `notice` trong khối amber (`role="status"`,
   `whitespace-pre-wrap`), TÁCH biệt với `error` đỏ — partial KHÔNG phải lỗi.

UI: nếu `result.partial` → render hình + hiện `result.partial.message` (to-do) trong panel AI.

## Error handling & bất biến

- `no-match` / `detIntents` rỗng → `tryPartialFigure` trả null → miss toàn bộ (như cũ).
- Full coverage → không vào nhánh partial → **byte-identical** path cũ.
- Cam kết "chắc chắn đúng": partial vẫn phải qua **transpile + verify** trên tập con đã cắt.
  Không salvage được (verify-fail không pin được) → thà miss còn hơn render sai.
- `verifyGeometry(intents, dsl-đã-cắt)` an toàn: điểm bị cắt → `!pA` → `continue`, không
  tạo false-fail.

## Test

`partialFigure.test.ts`:
- (a) `ABC` + construct chưa hỗ trợ (`mixtilinear`) → render polygon ABC, `todo.uncovered`
  chứa clause đó.
- (b) `K = trung điểm MT` với `T` treo → `K` vào `pruned` (cắt lan truyền), ABC + M vẫn render.
- (c) Chỉ điểm rời / no-match → `return null` (ngưỡng ≥1 shape).
- (named-missing) `P là điểm Fermat` (coverage complete, P không ra) → render ABC,
  `todo.missingNamed` chứa `P`.
- `describePartialTodo`: format 3 nhóm đúng + fallback rỗng.

`buildFigureIntent.deterministic.test.ts`, `handleGenerateFigure.test.ts`,
`handleGenerateFigureIntent.test.ts` (cập nhật): đề Fermat đổi từ MISS → PARTIAL success
(`ok:true` + `partial.message` chứa `P`). Thêm đề full-miss thật ("Chứng minh định lý Pytago").

`useAiFigure.test.tsx` (bổ sung): partial → `state` + `notice` (không phải `error`); full
success → `notice` null.

> **Salvage verify-fail (case d cũ):** code có (drop tam giác sai theo nhãn `wrong[].detail`)
> nhưng KHÔNG có repro tự nhiên qua đề (rule luôn dựng tam giác đúng) → là backstop phòng
> thủ, không test riêng. Tài liệu hoá ở đây để không nhầm là thiếu sót.

**Regression:** toàn bộ suite (283 suite / 2662 test) xanh. Thay đổi hành vi DUY NHẤT có chủ
đích: đề trước đây MISS nhưng dựng được ≥1 hình thật + có phần chưa phủ → nay PARTIAL success.

## Defer

- Chèn annotation to-do vào hình (đã chốt: chỉ panel message).
- Mô tả tiếng Việt chi tiết từng kind shape đã vẽ (chỉ cần liệt kê phần CHƯA vẽ).
- Salvage verify-fail cho các axis khác right-triangle (chỉ right-triangle có nhãn pin được).
