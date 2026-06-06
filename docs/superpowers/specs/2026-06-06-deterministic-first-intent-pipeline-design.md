# Deterministic-first intent pipeline (dựng hình 2D)

- **Ngày:** 2026-06-06
- **Issue liên quan:** #43
- **Phạm vi spec này:** Mức 1 (đảo trục deterministic-first + safety net ref-validation). Mức 2/3 ghi ở "Ngoài phạm vi".

## Bối cảnh & vấn đề

Pipeline dựng hình 2D hiện có **hai entry point hành xử ngược nhau**:

| Entry point | Routing | Trạng thái |
|---|---|---|
| `handleGenerateFigure.ts` (`buildFigure`, DSL free-form) | **deterministic-first**: `parseDeterministic()` (Track A) → confidence đạt thì dùng luôn, không gọi LLM; rớt xuống Track B (LLM) khi fail | **@deprecated**, xoá ở 0.26.0 |
| `handleGenerateFigureIntent.ts` → `buildFigureIntent.ts` (intent pipeline) | **AI-always**: Stage 1 luôn gọi LLM; deterministic chỉ vá output (`normalizeIntents`, `completeRightAngle`) | path được khuyến nghị |

Nghịch lý: cơ chế deterministic-first đang nằm ở path **bị khai tử**, còn path mới được adopt thì luôn gọi AI (cost ~10–75s/đề + token).

**Mục tiêu:** thuật toán deterministic phục vụ được đề **dễ → trung bình khó**; **chỉ đề thực sự khó mới fallback AI**. Đồng thời mở rộng được **rất nhiều cách diễn đạt** (VN/EN) mà không phải sửa đồng bộ nhiều file lớn.

## Quyết định kiến trúc (đã chốt khi brainstorm)

1. **Deterministic-first trong intent pipeline mới.** Đem cơ chế router (giống Track A/B của `handleGenerateFigure`) vào `handleGenerateFigureIntent`.
2. **Engine deterministic emit `Intent[]`** (không emit DSL trực tiếp như `parseDeterministic` cũ). Hai track **hội tụ tại `Intent[]`** rồi dùng chung `normalizeIntents → intentsToDsl → transpile → verifyGeometry`. Rule engine = NLU thuần, giống hệt vai trò LLM; toạ độ vẫn do `intentsToDsl` sinh (canonical tables sẵn có).
3. **Escalate theo coverage (an toàn).** Chỉ dùng kết quả deterministic nếu **phủ hết mệnh đề mang nội dung hình học** trong đề **và** `verifyGeometry` pass. Còn sót clause chưa parse → escalate AI. Nghiêng về đúng, chấp nhận gọi AI nhiều hơn chút.

## Kiến trúc tổng thể

```text
problem text
  │
  ├─ Track A (deterministic) ─ chỉ khi useDeterministic !== false
  │    runDeterministicIntents(problem) → { intents, coverage }
  │    nếu coverage.complete:
  │        normalizeIntents → intentsToDsl → transpile
  │        nếu transpile.ok && verifyGeometry pass:
  │            return state   ◄── KHÔNG gọi LLM, provider:'deterministic'
  │    (ngược lại: fall through, im lặng)
  │
  └─ Track B (LLM) ─ luồng buildFigureIntent hiện tại, không đổi
       provider.call → IntentEnvelope → normalize → intentsToDsl → transpile → verify
```

Điểm mấu chốt: **chỉ nguồn `Intent[]` khác nhau** (rules vs LLM); toàn bộ phần build/validate/verify dùng chung.

## Các unit (đơn vị có ranh giới rõ)

### 1. `ai/rules/` — Language Rule Registry

Mỗi construct family = 1 module. Engine = orchestrator chạy rules theo `priority`, gom `Intent[]` + clause đã phủ.

```ts
// _types.ts
interface Clause { id: number; text: string; hasGeometry: boolean; }
interface RuleContext { problem: string; clauses: readonly Clause[]; }
interface RuleMatch { ruleId: string; clauseIds: number[]; intents: Intent[]; }
interface LanguageRule {
  id: string;
  priority: number;                  // cao chạy trước; giải overlap
  languages: readonly ('vi' | 'en')[];
  patterns: readonly RegExp[];       // prefilter nhanh trước khi match() chạy
  match(ctx: RuleContext): RuleMatch[];
}
```

- `registry.ts`: mảng rules có thứ tự + `runRules(ctx): RuleMatch[]` (de-dup intent trùng theo điểm/shape).
- Module khởi đầu (port từ `validator.extractRequirements()` + `deterministic/skeleton.ts`):
  `triangle.ts`, `quad.ts`, `cevian.ts` (đường cao/trung tuyến/phân giác), `midpoint.ts`,
  `perpFoot.ts`, `centers.ts` (trọng tâm/trực tâm/tâm ngoại/nội), `incircle.ts`, `circle.ts`,
  `tangent.ts`, `arc.ts` (trung điểm cung), `reflection.ts`, `excenter.ts`,
  `pointAtDistance.ts`, `rightAngleViewing.ts`.
- Rule **emit Intent** (semantic), KHÔNG emit toạ độ — `intentsToDsl` đã có canonical tables.

Lợi ích phụ: rút logic regex khỏi `validator.ts` monolith (~1214 dòng) → mỗi rule một file + test riêng (issue #43 Phase 3).

### 2. `ai/deterministic/coverage.ts` — Clause segmentation + coverage

- `segmentClauses(problem): Clause[]` — tách theo dấu (`;`, `.`, newline) và keyword dẫn ("Gọi", "Vẽ", "Kẻ", "Cho", "trên", "với"). `hasGeometry` = clause chứa ≥1 từ khoá hình học (dùng `deterministic/vocabulary.ts`).
- `computeCoverage(clauses, matches): CoverageReport` →
  `{ complete: boolean; coveredClauseIds: number[]; uncovered: Clause[]; ratio: number }`.
- **complete** = mọi clause có `hasGeometry === true` đều được ≥1 rule match claim. Clause thuần văn xuôi (không từ khoá hình học) **không** tính vào mẫu số → không bắt escalate chỉ vì có lời dẫn.

### 3. `ai/deterministic/runDeterministicIntents.ts` — Track A orchestrator

```ts
function runDeterministicIntents(problem: string, opts?): 
  | { ok: true; intents: Intent[]; coverage: CoverageReport }
  | { ok: false; reason: 'incomplete-coverage' | 'no-match'; coverage: CoverageReport }
```

Chạy `segmentClauses → runRules → computeCoverage`. Trả intents khi `coverage.complete`. **Gate verify/transpile do caller (router) áp dụng** sau, để Track A chỉ lo NLU.

> `parseDeterministic` cũ (emit DSL) giữ nguyên cho path `buildFigure` @deprecated; sẽ biến mất cùng `buildFigure` ở 0.26.0. Không sửa nó trong spec này.

### 4. Router trong intent pipeline

Thêm Track A vào `handleGenerateFigureIntent.ts` (hoặc tách helper `generateFigureIntent` để giữ file mỏng), mô phỏng pattern của `handleGenerateFigure`:

```ts
if (opts.useDeterministic !== false) {
  const det = runDeterministicIntents(problem);
  if (det.ok && det.coverage.complete) {
    const norm = normalizeIntents(det.intents, problem);
    const dsl = intentsToDsl(norm);
    const trans = transpile(dsl);
    if (trans.ok && verifyGeometry(norm, dsl).ok) {
      onResult?.({ ok: true, state: trans.state, dsl, provider: 'deterministic',
                   retries: 0, usage: ZERO_USAGE, coverage: det.coverage });
      return { ok: true, state: trans.state };
    }
  }
  // fall through → Track B (LLM), im lặng
}
```

Telemetry: `provider: 'deterministic'`, 0 token, kèm coverage ratio để eval phân biệt nguồn.

### 5. Safety net: `dsl/transpile/refs.ts` registry-driven (issue #43 Phase 1)

Mục tiêu: DSL do rule (hoặc LLM) sinh ra sai ref phải `{ ok:false }` ở transpile, **không** throw ở emit / không render sai semantic.

- Thêm vào `DslKindModule`:
  ```ts
  type RefRole = 'point' | 'line-like' | 'circle' | 'segment' | 'shape' | 'any-existing';
  interface RefSpec { field: string; role: RefRole; many?: boolean; }
  interface DslKindModule {
    // ...giữ nguyên
    refSpecs?: readonly RefSpec[] | ((entity: any) => readonly RefSpec[]);
  }
  ```
- `validateRefs()` loop qua registry: với mỗi entity, lấy `module.refSpecs` → mỗi field:
  - ref không tồn tại → `UNKNOWN_REF` (không throw),
  - role mismatch (vd `circle` trỏ point) → `KIND_MISMATCH`.
- Backfill `refSpecs` cho các kind đang thiếu validate: `tangentPointExt`, `circleIntersection`,
  `secondIntersection`, `tangencyPoint`, `circleCR`, `incircle` (+ các kind còn lại tăng dần).
  Giữ legacy switch tối thiểu làm fallback nếu module chưa khai `refSpecs`.

## Error handling

- Mọi thất bại Track A (no-match / incomplete / transpile fail / verify fail) → **fall through Track B im lặng**, không ném lỗi ra user.
- `transpile` ref-validation = guard cấu trúc; `verifyGeometry` = guard hình học. Hai lớp này chặn "tự tin sai".
- Coverage incomplete → escalate, không đoán.

## Testing (TDD)

1. **Ref-validation** (`dsl/__tests__/transpile.refs.test.ts`) — các test fail từ issue:
   - `tangentPointExt.circle` trỏ point → `KIND_MISMATCH`.
   - `tangentPointExt.circle` unknown → `UNKNOWN_REF`, không throw.
   - `circleIntersection.c1/c2`, `secondIntersection.line/circle/other`,
     `tangencyPoint.circle/onLine`, `circleCR.center`, `incircle.vertices[]` sai type.
2. **Rule registry** — unit test per rule + **fixture matrix** VN variants → expected `Intent[]`.
3. **Coverage** — segment clause; complete vs incomplete; clause văn xuôi không ép escalate.
4. **Router** — đề deterministic-hit: assert `provider==='deterministic'` và **provider.call KHÔNG được gọi** (mock). Đề low-coverage: assert escalate (provider.call được gọi).
5. **Jest config** — ignore `.claude/worktrees/**` (tránh duplicate suite / mock collision — issue note).

## Migration / compatibility

- `buildFigure` (@deprecated) + `parseDeterministic` cũ: **không đụng**.
- `normalizeIntents` / `intentsToDsl` / `verifyGeometry`: giữ nguyên interface.
- `validator.ts`: giữ phần keyword-coverage (dùng cho LLM retry hint của Track B). Regex extraction **dần** chuyển sang rule registry; Mức 1 không bắt buộc xoá hết, ưu tiên không tăng thêm.

## Ngoài phạm vi (defer)

- **Mức 2** (tăng dần trên backbone Mức 1): fixture matrix VN/EN đầy đủ Tier 0→4; song ngữ EN hoàn chỉnh; `docs/geometry-2d/construct-capability-matrix.md` machine-checkable (issue Phase 6).
- **Mức 3 — tách issue riêng** (refactor lớn, đụng file trung tâm, rủi ro regression):
  - intent-builders registry (issue Phase 2) → `intentToDsl.ts` thành orchestrator.
  - scene construction handlers (Phase 4) → `point.ts` mỏng đi.
  - manual tool finalize registry (Phase 5) → `finalizeShape.ts`.

## Acceptance Mức 1

- Đề SGK quen thuộc (đã hỗ trợ hôm nay) dựng được **không gọi LLM**; còn lại escalate.
- `transpile()` trả `{ ok:false }` cho ref unknown/mismatch của các kind mới — **không throw**.
- Construct/phrasing mới thêm = 1 rule module + fixture, không sửa switch trung tâm.
- Toàn bộ test xanh; provider mock xác nhận deterministic-hit không gọi LLM.
