# AI Fast Path — Deterministic-first + LLM Optimized

**Status**: Draft
**Date**: 2026-06-03
**Author**: Whiteboard AI track
**Target version**: 0.27.0

## Mục tiêu

Giảm độ trễ dựng-hình-từ-văn-bản từ **10-75 giây** (hiện tại, Ollama 12B / Claude Agent SDK) xuống:

- **< 100ms** cho 60-80% đề phổ thông (deterministic path, không gọi LLM).
- **< 8s p50** cho phần còn lại (LLM fallback đã tối ưu).
- **< 15s p95** worst case.

Mục tiêu giữ nguyên độ chính xác hiện có; KHÔNG được giảm coverage Tier 1-3.

## Bối cảnh (bottleneck đo được)

| Vị trí | Vấn đề | Tác động |
|---|---|---|
| `prompt.ts:37` `buildSystemPrompt()` | System prompt 26.227 ký tự ≈ 6.557 token, kèm 21 fixture full DSL | Mỗi request Ollama phải reprocess hết (no cache) → prompt-eval lần đầu 60-130s với Gemma 12B |
| `providers/ollama.ts:75` | `stream:false` ở provider chính | UI "đứng yên" cho đến khi hoàn thành (demo middleware có stream NDJSON nhưng provider abstraction không expose) |
| `providers/claude-agent-sdk.ts` | Không có prompt-cache flag (SDK abstract) + system prompt 6.5k token gắn vào mỗi call | 10-30s/call đề đơn giản, 75s đề phức tạp |
| `buildFigure.ts:99` | `applyDeterministicCompletion` chạy SAU LLM | Đã có template engine mà vẫn đợi LLM ~10s |
| `validator.ts:195` `extractRequirements()` | Đã regex tốt 80% derived (trung điểm, đường cao, cevian, centroid/orthocenter, circle3, tangent ngoài) | Mạnh sẵn — gold mine; chỉ thiếu skeleton parser (tam giác/đường tròn/tứ giác base) |

## Decision: 2 track song song (A + B), C sau

- **Track A — Deterministic-first**: parse tiếng Việt → emit full DSL không cần LLM. Confidence-gated. Đề lạ rớt sang LLM.
- **Track B — LLM call flow optimized**: slim prompt + Claude Agent SDK default + streaming progress.
- **Track C — Race mode**: deterministic ngay + LLM background, áp dụng nếu LLM khác đáng kể. **Defer sau A+B.**

Rationale: A và B độc lập, có thể ship riêng. A đem lại winning lớn nhất (>100× nhanh hơn cho 60-80% case). B tăng UX cho phần còn lại.

## Track A — Deterministic-first DSL emitter

### Architecture

```
parseDeterministic(problem: string): DeterministicResult

  type DeterministicResult =
    | { ok: true; dsl: DslInputT; confidence: number; matched: string[] }
    | { ok: false; reason: 'low-confidence' | 'parse-failed'; confidence: number }
```

### File layout

```
src/stamps/geometry-2d/ai/deterministic/
├── index.ts          ← public API parseDeterministic + types
├── skeleton.ts       ← parse base shapes (triangle/circle/quad/free)
├── derived.ts        ← wrap extractRequirements() + extend
├── confidence.ts     ← scoring + threshold
├── vocabulary.ts     ← tập keyword "hình học" để đo coverage
└── __tests__/
    ├── skeleton.test.ts
    ├── derived.test.ts
    ├── confidence.test.ts
    └── parseDeterministic.test.ts
```

### `skeleton.ts` — patterns covered

| Pattern tiếng Việt | DSL emit |
|---|---|
| `tam giác ABC` | free A(0,3), B(-2,0), C(3,0) + segments AB, BC, CA |
| `tam giác vuông tại A` | free A(0,0), B(4,0), C(0,3) + 3 segments |
| `tam giác cân tại A` | free A(0,3), B(-2,0), C(2,0) + 3 segments |
| `tam giác đều ABC` | free A(0, 2.6), B(-1.5,0), C(1.5,0) + 3 segments |
| `(O; R=3)` / `(O) bán kính 3` / `đường tròn tâm O bán kính 3` | free O(0,0) + circleCR(center:O, radius:3) |
| `điểm A nằm ngoài (O)` | free A(5,0) (offset ngoài R) |
| `hình chữ nhật ABCD` | free A/B/C/D + 4 segments |
| `hình bình hành ABCD` | tương tự, vector AB ∥ DC |
| `hình vuông ABCD` | side = 3 |
| `hình thoi ABCD` | tương tự bình hành, side bằng nhau |
| `hình thang ABCD` (AB // CD) | 2 đáy song song |

### `derived.ts` — extend `extractRequirements()`

Re-export `extractRequirements` + thêm:
- **Tangent line ngoài**: emit shapes `tangent` đầy đủ (hiện đã có ở scope tangent-from-external).
- **Đường tròn nội/ngoại tiếp** đã có; thêm `incircle.tangencyPoint` tự sinh nếu đề nói "tiếp xúc tại D/E/F".
- **Đường thẳng song song / vuông góc đi qua điểm**: pattern `qua X song song BC` → `parallel{throughPoint:X, toLine:'BC'}`.

### `confidence.ts` — scoring

```ts
confidence = covered / total
  total   = số "geometry keyword" trong đề (vocabulary.ts định nghĩa)
  covered = số keyword mà parser đã emit DSL tương ứng
```

`vocabulary.ts` chứa ~50 keyword: tam giác, vuông tại, cân tại, đều, đường tròn, bán kính, tâm, trung điểm, chân đường cao, đường cao, trung tuyến, phân giác, trọng tâm, trực tâm, nội tiếp, ngoại tiếp, tiếp tuyến, tiếp điểm, song song, vuông góc, giao điểm, cắt, qua, hình chữ nhật, hình vuông, hình thoi, hình bình hành, hình thang…

**Threshold mặc định: 0.85**. Configurable qua `GenerateOptions.deterministicThreshold`.

### Integration vào `handleGenerateFigure.ts`

```ts
async function handleGenerateFigure(input, opts) {
  // Track A — fast path
  if (opts.useDeterministic !== false) {
    const det = parseDeterministic(input.problem, {
      threshold: opts.deterministicThreshold ?? 0.85,
    });
    if (det.ok) {
      const trans = transpile(det.dsl);
      if (trans.ok) {
        opts.onResult?.(/* synth GenerateResult */, 0);
        return { ok: true, state: trans.state };
      }
      // Deterministic emit DSL invalid → silent fall-through to LLM
    }
  }
  // Track B — existing LLM path (unchanged signature)
  return existingHandleGenerateFigureLlm(input, opts);
}
```

**Non-breaking**: option `useDeterministic` default `true`. Set `false` để bypass cho A/B testing.

## Track B — LLM call flow optimization

### B1. Slim system prompt (`promptSlim.ts`)

5 fixture core (thay vì 21):
1. `triangle-altitude` — đại diện tam giác + cevian
2. `triangle-circumcircle` — đại diện circle3 + circumcenter
3. `triangle-incircle` — đại diện incircle + tangencyPoint
4. `tangent-from-external-named` — đại diện tangent ngoài (Tier 4)
5. `parallelogram` — đại diện hình tứ giác

Bảng từ khóa → kind, MANDATORY rules, anti-pattern: giữ nguyên (cốt lõi).
**Target size**: ≤ 2000 token (vs 6557 hiện tại → 3.3× nhỏ hơn).

`buildFigure.ts` thêm option `promptVariant: 'full' | 'slim'`, default `'slim'`. Eval suite chạy cả 2 variant; ship slim nếu F1 drop ≤ 0.05.

### B2. Default provider → Claude Agent SDK

Đổi mặc định trong `providers/index.ts:selectProvider()`:
- Trước: `WHITEBOARD_AI_PROVIDER=ollama` (default)
- Sau: `WHITEBOARD_AI_PROVIDER=claude-agent-sdk` (default)

Document trong `CLAUDE.md` + `README.md`:
- Setup OAuth: `claude setup-token` → `CLAUDE_CODE_OAUTH_TOKEN=...`
- Subscription: Pro/Max/Team (production OK với Team plan)
- Liên kết memory `reference-anthropic-agent-sdk-subscription`.

### B3. Token-level streaming progress

Mở rộng `ProviderRequest` thêm `onToken?(textChunk: string): void`:
- `claude-agent-sdk.ts:115` — trong `for await` đã có chunk text → gọi `req.onToken?.(b.text)` mỗi block.
- `ollama.ts` — switch sang `stream: true`, đọc NDJSON, gọi `req.onToken?.(chunk.message.content)`.
- `anthropic.ts` — không stream (tool_use không stream incremental dễ).
- `claude-cli.ts` — subprocess không stream JSON → skip.

`buildFigure.ts` passes `onToken` to provider, computes tokens count (approx chars/4) and forwards qua existing `onProgress`. UI đã có sẵn timer `elapsed` + `tokens` (xem `AiFigurePrompt.tsx:362`).

### B4. Schema memoization (small fix)

`claude-agent-sdk.ts:101` `JSON.stringify(req.schema, null, 2)` tính lại mỗi call. Memoize ở module level (schema không đổi runtime).

## Track C — Race mode (defer)

Sau khi A+B ship + đo lường:
- Nếu deterministic confidence < 0.85 nhưng > 0.5 → emit DSL "draft" + render ngay, đồng thời gọi LLM.
- LLM xong → so sánh `compareDsl(draft, final)`, nếu khác đáng kể → toast "AI gợi ý sửa, áp dụng?".
- UX: user thấy hình ngay (<100ms), refine sau 3-8s.

Tạo issue riêng sau khi A+B merge.

## Data flow chi tiết

### Hit path (deterministic)
```
UI → useAiFigure.submit() → generator(problem)
  → handleGenerateFigure (NEW fast path)
    → parseDeterministic("tam giác ABC, đường cao AH")
      → skeleton: {free A,B,C} + {seg AB,BC,CA}
      → derived: {perpFoot H} + {seg AH} + {seg BC duplicate skip}
      → confidence: 4/4 = 1.0 ≥ 0.85
      → applyDeterministicCompletion (safety net) → no-op
      → transpile → state
    → return {ok: true, state}
  → onGenerated(state) → render Excalidraw
Total: ~30-80ms
```

### Miss path (LLM fallback)
```
parseDeterministic("vẽ đường tròn Euler tam giác ABC")
  → skeleton: tam giác ABC ✓
  → derived: "đường tròn Euler" không match
  → confidence: 1/2 = 0.5 < 0.85 → fall through
  → ClaudeAgentSdkProvider.call(slim prompt, problem)
    → for await chunk → onToken(chunk) → UI tokens++
  → parse envelope → applyDeterministicCompletion → transpile → state
Total: ~3-8s
```

## Error handling

| Lỗi | Hành vi |
|---|---|
| Deterministic parser regex bug crash | catch, log, fall through to LLM |
| Deterministic emit DSL transpile-error | fall through to LLM (silent) |
| LLM api_error | Return error UI hiện tại |
| LLM transpile_error | Existing retry logic (1 retry) |
| Confidence < threshold | Fall through to LLM, mark `usedDeterministic: false` |

Log `{usedDeterministic, confidence, matched, llmLatencyMs?}` qua `onResult` callback để telemetry.

## Testing

### Unit
- `skeleton.test.ts`: 30 case base shapes (tam giác variants × 4, đường tròn × 3, tứ giác × 5, các kết hợp).
- `derived.test.ts`: 20 case derived (đã có ở validator tests, mirror sang).
- `confidence.test.ts`: 15 case threshold (hit/miss/edge).
- `parseDeterministic.test.ts`: 40 case end-to-end (problem → DSL).

### Integration
- `handleGenerateFigure.test.ts`: 10 case fast-path hit, 5 case fallback miss, 3 case parser crash → fallback.
- Mock LLM provider để assert "không gọi" khi fast-path hit.

### Eval
- Chạy lại eval suite (`scripts/eval-intent.ts`) với:
  - `parseDeterministic` only — đo % hit confidence ≥ 0.85
  - Full pipeline (A+B) — F1, latency p50/p95
- Compare với baseline 12B (F1=0.737) — target F1 ≥ 0.75 sau A+B.

### Perf
- New `scripts/bench-fast-path.ts`: 50 đề mẫu × 5 lần → p50, p95 latency.

## Files changed

```
NEW:
  src/stamps/geometry-2d/ai/deterministic/index.ts
  src/stamps/geometry-2d/ai/deterministic/skeleton.ts
  src/stamps/geometry-2d/ai/deterministic/derived.ts
  src/stamps/geometry-2d/ai/deterministic/confidence.ts
  src/stamps/geometry-2d/ai/deterministic/vocabulary.ts
  src/stamps/geometry-2d/ai/deterministic/__tests__/*.test.ts
  src/stamps/geometry-2d/ai/promptSlim.ts
  scripts/bench-fast-path.ts

MODIFIED:
  src/stamps/geometry-2d/ai/handleGenerateFigure.ts
    + parseDeterministic fast path
  src/stamps/geometry-2d/ai/buildFigure.ts
    + opts.promptVariant default 'slim'
    + opts.useDeterministic / deterministicThreshold passthrough
  src/stamps/geometry-2d/ai/providers/index.ts
    + default = claude-agent-sdk
  src/stamps/geometry-2d/ai/providers/types.ts
    + onToken?: (chunk: string) => void
  src/stamps/geometry-2d/ai/providers/claude-agent-sdk.ts
    + emit onToken per assistant text block
    + memoize schema serialization
  src/stamps/geometry-2d/ai/providers/ollama.ts
    + stream: true + NDJSON parse + onToken
  scripts/demo/aiMiddlewarePlugin.ts
    + update default WHITEBOARD_AI_PROVIDER comment/log
  CLAUDE.md
    + section "Setup Claude Agent SDK default"
  README.md (if present)
    + tương tự
```

## Out of scope

- Vision/OCR path (`handleExtractProblem`) — không liên quan, giữ nguyên.
- Intent pipeline (`handleGenerateFigureIntent`) — tách track riêng, không touch.
- Refine path (`handleGenerateFigureDelta`) — track A có thể extend sang sau, scope hiện tại = build mode only.
- Track C race mode — defer issue riêng.

## Rollout

1. **PR1 (A)**: deterministic-first parser + tests + bench. Behind flag `useDeterministic`, default `true` ngay từ đầu (an toàn vì fallback đầy đủ).
2. **PR2 (B)**: slim prompt + default provider + streaming. Independent of PR1.
3. **Eval gate**: cả 2 PR đều phải pass eval F1 ≥ 0.75 trước merge.
4. **Release**: 0.27.0 ship cả 2 (nếu cùng tuần) hoặc 0.27.0 = A, 0.27.1 = B.

## Open questions (cho writing-plans giải quyết)

- Nên ưu tiên scope tứ giác (hình thoi/thang/bình hành) đến đâu trong PR1? — Có lẽ chỉ chữ nhật + vuông + bình hành; thoi/thang để PR sau nếu cần.
- Eval baseline hiện chạy 12B — có nên ship A+B với 4B làm default offline? — Defer; bài này dùng Claude Agent SDK default.
- Streaming Ollama: parse NDJSON đã có ở `aiMiddlewarePlugin.ts` — refactor ra provider hay duplicate? — Refactor ra provider, plugin chỉ proxy.
