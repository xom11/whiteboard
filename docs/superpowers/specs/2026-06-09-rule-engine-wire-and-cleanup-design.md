# Wire rule engine vào UI + dọn dead path DSL cũ

Ngày: 2026-06-09 · Scope: Mức 2 (wire + dọn dead code) · Defer: hybrid partial-coverage (issue riêng)

## Bối cảnh & vấn đề

Codebase có **2 pipeline sinh hình song song**:

| | Path UI đang chạy | Path rules engine (chưa wire UI) |
|---|---|---|
| Façade | `handleGenerateFigure` | `handleGenerateFigureIntent` / `generateFigureIntent` |
| Deterministic | `parseDeterministic` (skeleton + derived + confidence) | `tryDeterministicFigure` (21 rule + 4 gate) |
| LLM fallback | `buildFigure` free-form DSL (`@deprecated`) | intent-based (eval F1 95.4%) |

Toàn bộ đầu tư rule engine (#43→#47) nằm ở path mới **chưa được UI dùng**. Playground (`/api/generate-figure`) vẫn gọi `handleGenerateFigure` (path cũ, deterministic yếu) → escalate LLM nhiều hơn cần → "tốn tiền + chậm". Version đã `0.26.2`, quá mốc 0.26.0 dự kiến remove `buildFigure`.

## Mục tiêu

1. **Wire rule engine vào UI**: làm `handleGenerateFigure` chạy trên `generateFigureIntent` (rules-first), giữ nguyên contract `AiFigureUiResult` (`{ok, state}`) → playground + consumer không phải đổi gì, engine bên dưới mạnh hơn.
2. **Dọn dead path**: xoá `buildFigure`, `validator`, `parseDeterministic` + cluster skeleton/derived/confidence + test + dev script trùng lặp.
3. **Cập nhật CLAUDE.md**: tài liệu hoá kiến trúc single-pipeline + focus hiện tại = tối ưu rule base.

Bất biến an toàn: **LLM luôn là fallback** → worst case = bằng hiện tại. Toàn bộ test suite phải xanh + typecheck sạch.

## Thiết kế

### Façade `handleGenerateFigure` (repurpose, KHÔNG đổi tên/contract)
- Body mới: gọi `generateFigureIntent(problem, opts)`.
- Map: `r.ok` → `{ ok: true, state: r.transpile.state }`; `refused`/error → `{ ok: false, message }`.
- Giữ `onResult` telemetry (map từ `IntentGenerateResult`) + retry-on-`transpile_error` cho nhánh LLM (deterministic không fail transpile vì đã gate).
- Lý do giữ tên + `AiFigureUiResult`: đây là bridge type đã export trong `shared/types.ts` — consumer (playground, hoctotbachkhoa) tự động hưởng rule engine khi upgrade, zero đổi route.

### Xoá (source)
- `ai/buildFigure.ts` — free-form DSL generator.
- `ai/validator.ts` (~1170d) — keyword→kind anti-bias, chỉ phục vụ buildFigure (rules engine thay thế).
- `ai/deterministic/{index.ts(parseDeterministic), skeleton.ts, derived.ts, confidence.ts}` — deterministic cũ.

### Xoá (test)
- `__tests__/buildFigure.test.ts`, `__tests__/validator.test.ts`, `deterministic/__tests__/parseDeterministic.test.ts`.

### Migrate (test — giữ giá trị coverage)
- `__tests__/clusterA-e2e.test.ts`: chuyển từ `applyDeterministicCompletion` (dead) sang `tryDeterministicFigure`/`generateFigureIntent` (live). Giữ assertion hình học Cụm A (arcMidpoint/excenter/reflectLine).
- `__tests__/handleGenerateFigure.test.ts`: viết lại cho façade repurpose (mock provider trả intent envelope; assert `{ok, state}` + deterministic-first không gọi provider).
- `providers/__tests__/ollama.smoke.test.ts`: inspect — migrate sang generateFigureIntent hoặc xoá nếu chỉ smoke buildFigure.

### Xoá (dev script — theo quyết định user)
`scripts/{eval-ai, eval-ollama, sample-ollama, smoke-ai, inspect-failure, debug-dsl}.ts`.
Giữ: `eval-intent.ts` (eval chính rule engine), `smoke-claude-cli.ts`, `debug-transpile.ts`, `eval-pdf-visual.ts` (đều dùng path intent).

### Cập nhật barrel
`ai/index.ts`: gỡ export `generateFigure`/buildFigure types, `parseDeterministic`, mọi re-export validator. Giữ `handleGenerateFigure` (repurpose), `handleGenerateFigureIntent`, `generateFigureIntent`.

### Để nguyên (verified độc lập, ngoài scope)
- `buildFigureDelta.ts` / `handleGenerateFigureDelta.ts` (refine path, demo-only, không import buildFigure).
- `scripts/demo/aiMiddlewarePlugin.ts`.
- Folder `deterministic/`: live = `coverage.ts`, `vocabulary.ts`, `runDeterministicIntents.ts`, `guards.ts`, `tryDeterministicFigure.ts`.

## Test plan
1. TDD façade: rewrite `handleGenerateFigure.test.ts` (red) → implement (green).
2. Migrate clusterA-e2e + handle ollama.smoke.
3. Xoá source/test/script.
4. `npm run typecheck` sạch + `npm test` toàn bộ xanh (gate cứng).
5. Smoke playground route import resolve.

## Defer (issue riêng)
- **Hybrid partial-coverage**: coverage gate hiện all-or-nothing (1 clause geo miss → escalate toàn bộ). Cho deterministic dựng phần làm được, LLM chỉ bù clause thiếu. Đòn bẩy giảm LLM lớn nhất nhưng là thay đổi lớn → spec riêng.
