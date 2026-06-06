# Variant Normalizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm post-LLM variant normalization vào Intent pipeline để fix 8/26 eval misses (Tier 0×5 + t1-rect-diag + t1-para-diags + t3-square-en). Target: ~+18% F1 (73.7% → ~88%) chỉ với 1 file mới + 1 prompt tweak.

**Architecture:**
- Pure function `normalizeIntents(intents, problem): IntentT[]` ở file mới `src/stamps/geometry-2d/ai/normalizeIntent.ts`.
- Apply post-`IntentEnvelopeZ.parse()`, trước `resolveCircleNameCollisions()` tại `buildFigureIntent.ts:120-125`.
- Fix prompt inconsistency: `intentPrompt.ts:223` ghi "rectangle: wide | tall" mâu thuẫn với examples dùng `'standard'`. Thêm `'standard'` vào enum + reinforce isoceles label-position rule.
- Tests: unit per shape rule + integration qua `scripts/eval-intent.ts gemma3:12b` (so sánh F1 trước/sau).

**Root cause analysis (đã verify từ eval 2026-06-02):**

| Eval ID | Đề | LLM emit | Expected | Lý do |
|---|---|---|---|---|
| `t0-tri-iso` | "Tam giác ABC cân tại A." | (giả thuyết) `isoceles-AB` | `isoceles-BC` | Variant naming theo position của canonical A/B/C, không phải label literal. LLM confuse: "cân tại A" → apex là A → bị mass-attract `isoceles-AB` thay vì `isoceles-BC` (BC là đáy đối diện A) |
| `t0-square` | "Hình vuông MNPQ." | ? | `standard` | Schema flat enum nhận mọi value; LLM có thể emit `'any'` |
| `t0-rect` | "Hình chữ nhật ABCD." | `wide` hoặc `tall` | `standard` | Prompt enum line ghi "rectangle: wide \| tall" nhưng example ghi `'standard'`. LLM follow rule explicit |
| `t0-rhom` | "Hình thoi ABCD." | ? | `standard` | Tương tự square |
| `t0-para` | "Hình bình hành ABCD." | ? | `standard` | Tương tự square |
| `t1-rect-diag` | "Hình chữ nhật ABCD, vẽ đường chéo AC." | `wide`/`tall` | `standard` | Cùng bug t0-rect, các intent khác đúng |
| `t1-para-diags` | "Hình bình hành ABCD, hai đường chéo …" | `?` | `standard` | Cùng bug t0-para |
| `t3-square-en` | "Square MNPQ." | ? | `standard` | Cùng bug t0-square |

Cơ chế failure: `compareIntents` ở `verify.ts:54-65` dùng `samePrefix(depth=2)` — khi shape match nhưng variant differ → mark `wrong=1`. F1 hit (mỗi case −0.05 to −0.1 F1 trên dataset 45).

**Variant position rule (cho TRIANGLE isoceles):**

`intentToDsl.ts:28-58` định nghĩa canonical:
- `isoceles-AB`: A=(0,0), B=(4,0), C=(2,3) — **C là apex**, AB là base
- `isoceles-BC`: A=(0,3), B=(-2,0), C=(2,0) — **A là apex**, BC là base
- `isoceles-CA`: A=(0,0), B=(2,3), C=(4,0) — **B là apex**, CA là base

→ Quy tắc canonical: apex = vertex KHÔNG nằm trên 2 chữ của variant name.

Mapping từ "cân tại X" (X = vertex ở position `i` trong `labels[]`):
- i=0 → variant `isoceles-BC` (apex tại position 0; base = positions 1,2 = `BC` canonical)
- i=1 → variant `isoceles-CA` (apex tại position 1; base = positions 2,0 = `CA` canonical)
- i=2 → variant `isoceles-AB` (apex tại position 2; base = positions 0,1 = `AB` canonical)

Verified với prompt example `intentPrompt.ts:60-65`: "Tam giác MNP cân tại N." → labels=[M,N,P], N ở position 1 → `isoceles-CA` ✓

**Tech Stack:** TypeScript 5, zod 3, Jest 29 + ts-jest, Ollama gemma3:12b (eval).

---

### Task 1: Test fixture — triangle isoceles label-position rule

**Files:**
- Create: `src/stamps/geometry-2d/ai/__tests__/normalizeIntent.test.ts`

- [ ] **Step 1: Viết failing test cho 3 case isoceles**

```typescript
// src/stamps/geometry-2d/ai/__tests__/normalizeIntent.test.ts
import { normalizeIntents } from '../normalizeIntent';
import type { IntentT } from '../intent';

describe('normalizeIntents — triangle isoceles label position', () => {
  const tri = (labels: [string, string, string], variant: string): IntentT => ({
    op: 'draw-shape',
    shape: 'triangle',
    labels,
    variant: variant as never,
  });

  it('"cân tại A" (apex pos 0) → isoceles-BC bất kể LLM emit gì', () => {
    const out = normalizeIntents(
      [tri(['A', 'B', 'C'], 'isoceles-AB')],
      'Tam giác ABC cân tại A.',
    );
    expect((out[0] as { variant: string }).variant).toBe('isoceles-BC');
  });

  it('"cân tại N" (apex pos 1 trong MNP) → isoceles-CA', () => {
    const out = normalizeIntents(
      [tri(['M', 'N', 'P'], 'isoceles-AB')],
      'Tam giác MNP cân tại N.',
    );
    expect((out[0] as { variant: string }).variant).toBe('isoceles-CA');
  });

  it('"cân tại P" (apex pos 2 trong MNP) → isoceles-AB', () => {
    const out = normalizeIntents(
      [tri(['M', 'N', 'P'], 'isoceles-BC')],
      'Tam giác MNP cân tại P.',
    );
    expect((out[0] as { variant: string }).variant).toBe('isoceles-AB');
  });

  it('không có "cân tại" → giữ nguyên variant LLM emit', () => {
    const out = normalizeIntents(
      [tri(['A', 'B', 'C'], 'equilateral')],
      'Tam giác đều ABC.',
    );
    expect((out[0] as { variant: string }).variant).toBe('equilateral');
  });
});
```

- [ ] **Step 2: Chạy test, verify fail vì module chưa tồn tại**

```bash
npx jest src/stamps/geometry-2d/ai/__tests__/normalizeIntent.test.ts
```

Expected output:
```
Cannot find module '../normalizeIntent' from '__tests__/normalizeIntent.test.ts'
```

- [ ] **Step 3: Commit failing test**

```bash
git add src/stamps/geometry-2d/ai/__tests__/normalizeIntent.test.ts
git commit -m "test(ai): normalizeIntents — triangle isoceles label-position rule"
```

---

### Task 2: Implement normalizeIntents skeleton + triangle isoceles rule

**Files:**
- Create: `src/stamps/geometry-2d/ai/normalizeIntent.ts`

- [ ] **Step 1: Viết module với rule isoceles**

```typescript
// src/stamps/geometry-2d/ai/normalizeIntent.ts
//
// Post-LLM variant normalizer cho Intent pipeline.
//
// Mục đích: fix 2 nhóm bias quan sát được trong eval gemma3:12b:
//   1. LLM emit isoceles variant SAI position (vd "cân tại A" → 'isoceles-AB'
//      thay vì 'isoceles-BC') vì naming rule canonical không trực giác.
//   2. LLM follow prompt "rectangle: wide | tall" → emit 'wide' trong khi
//      eval + đa số sản phẩm muốn 'standard' (rendering identical với 'wide').
//
// Pure function, không mutate input.

import type { IntentT, DrawShapeIntentT } from './intent';

const CAN_TAI_RE = /c[aâ]n\s+t[aạ]i\s+([A-Z])/i;
const ISOCELES_AT_RE = /isoceles\s+(?:at|with\s+apex)\s+([A-Z])/i;

/**
 * Apply variant normalization. Returns new array; input unmodified.
 *
 * Rules áp dụng (chỉ override khi MATCH chắc; otherwise pass-through):
 *   - triangle + "cân tại X" → variant theo position của X trong labels
 *   - rectangle + KHÔNG có "cao"/"hẹp"/"tall"/"thin" → 'standard'
 *   - square|rhombus|parallelogram + bất kỳ variant không phải 'standard' → 'standard'
 */
export function normalizeIntents(
  intents: readonly IntentT[],
  problem: string,
): IntentT[] {
  return intents.map((intent) => {
    if (intent.op !== 'draw-shape') return intent;
    return normalizeShape(intent, problem);
  });
}

function normalizeShape(intent: DrawShapeIntentT, problem: string): IntentT {
  switch (intent.shape) {
    case 'triangle':
      return normalizeTriangle(intent, problem);
    default:
      return intent;
  }
}

function normalizeTriangle(
  intent: DrawShapeIntentT,
  problem: string,
): DrawShapeIntentT {
  const m = problem.match(CAN_TAI_RE) ?? problem.match(ISOCELES_AT_RE);
  if (!m) return intent;
  const apex = m[1].toUpperCase();
  const i = intent.labels.indexOf(apex);
  if (i < 0) return intent;
  const variantByPos: Record<number, DrawShapeIntentT['variant']> = {
    0: 'isoceles-BC',
    1: 'isoceles-CA',
    2: 'isoceles-AB',
  };
  const target = variantByPos[i];
  if (!target || intent.variant === target) return intent;
  return { ...intent, variant: target };
}
```

- [ ] **Step 2: Chạy test, verify pass cho 4/4 cases**

```bash
npx jest src/stamps/geometry-2d/ai/__tests__/normalizeIntent.test.ts
```

Expected: `Tests: 4 passed, 4 total`

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-2d/ai/normalizeIntent.ts
git commit -m "feat(ai): normalizeIntents — triangle isoceles label-position rule"
```

---

### Task 3: Thêm rule rectangle/square/rhombus/parallelogram → 'standard'

**Files:**
- Modify: `src/stamps/geometry-2d/ai/normalizeIntent.ts`
- Modify: `src/stamps/geometry-2d/ai/__tests__/normalizeIntent.test.ts`

- [ ] **Step 1: Viết failing tests cho 4 shape**

Thêm vào file test (cùng describe block ngoài cùng):

```typescript
describe('normalizeIntents — quad shapes default to standard', () => {
  const quad = (
    shape: 'rectangle' | 'square' | 'rhombus' | 'parallelogram',
    variant: string,
  ): IntentT => ({
    op: 'draw-shape',
    shape,
    labels: ['A', 'B', 'C', 'D'],
    variant: variant as never,
  });

  it('rectangle "wide"/"tall" → "standard" khi đề không nói "cao"/"hẹp"', () => {
    const out = normalizeIntents([quad('rectangle', 'wide')], 'Hình chữ nhật ABCD.');
    expect((out[0] as { variant: string }).variant).toBe('standard');

    const out2 = normalizeIntents([quad('rectangle', 'tall')], 'Hình chữ nhật ABCD.');
    expect((out2[0] as { variant: string }).variant).toBe('standard');
  });

  it('rectangle giữ "tall" khi đề có "cao"', () => {
    const out = normalizeIntents([quad('rectangle', 'tall')], 'Hình chữ nhật cao ABCD.');
    expect((out[0] as { variant: string }).variant).toBe('tall');
  });

  it('square emit "any" → ép "standard"', () => {
    const out = normalizeIntents([quad('square', 'any')], 'Hình vuông ABCD.');
    expect((out[0] as { variant: string }).variant).toBe('standard');
  });

  it('rhombus emit lung tung → ép "standard"', () => {
    const out = normalizeIntents([quad('rhombus', 'isoceles')], 'Hình thoi ABCD.');
    expect((out[0] as { variant: string }).variant).toBe('standard');
  });

  it('parallelogram emit lung tung → ép "standard"', () => {
    const out = normalizeIntents([quad('parallelogram', 'any')], 'Hình bình hành ABCD.');
    expect((out[0] as { variant: string }).variant).toBe('standard');
  });
});
```

- [ ] **Step 2: Chạy test, verify fail 5/5 mới**

```bash
npx jest src/stamps/geometry-2d/ai/__tests__/normalizeIntent.test.ts
```

Expected: 5 fails (variant mismatches), 4 cũ vẫn pass.

- [ ] **Step 3: Mở rộng normalizeShape**

Sửa `normalizeIntent.ts`:

```typescript
const TALL_RECT_RE = /(cao|hẹp|thin|tall|portrait)/i;

function normalizeShape(intent: DrawShapeIntentT, problem: string): IntentT {
  switch (intent.shape) {
    case 'triangle':
      return normalizeTriangle(intent, problem);
    case 'rectangle':
      return normalizeRectangle(intent, problem);
    case 'square':
    case 'rhombus':
    case 'parallelogram':
      return forceStandard(intent);
    default:
      return intent;
  }
}

function normalizeRectangle(
  intent: DrawShapeIntentT,
  problem: string,
): DrawShapeIntentT {
  if (intent.variant === 'tall' && TALL_RECT_RE.test(problem)) return intent;
  if (intent.variant === 'standard') return intent;
  return { ...intent, variant: 'standard' };
}

function forceStandard(intent: DrawShapeIntentT): DrawShapeIntentT {
  if (intent.variant === 'standard') return intent;
  return { ...intent, variant: 'standard' };
}
```

- [ ] **Step 4: Chạy test, verify 9/9 pass**

```bash
npx jest src/stamps/geometry-2d/ai/__tests__/normalizeIntent.test.ts
```

Expected: `Tests: 9 passed, 9 total`

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/ai/normalizeIntent.ts src/stamps/geometry-2d/ai/__tests__/normalizeIntent.test.ts
git commit -m "feat(ai): normalizeIntents — quad shapes default to 'standard'"
```

---

### Task 4: Wire normalizer vào buildFigureIntent.ts

**Files:**
- Modify: `src/stamps/geometry-2d/ai/buildFigureIntent.ts:117-125`

- [ ] **Step 1: Đọc đoạn hiện tại để biết exact context**

`buildFigureIntent.ts:117-125` hiện có:

```typescript
  // Intents giữ nguyên raw từ AI cho API contract (caller dùng để compare với
  // expected fixtures). Pipeline internal dùng processedIntents (đã resolve
  // collision) để build DSL.
  const intents = envelope.intents!;

  // Stage 1.5: preprocess naming collisions (circle name dùng làm point ref).
  // Notation Việt "(O)" thường ám chỉ TÂM (point) chứ không phải tên circle —
  // preprocessor inject add-point center + rename circle để tránh KIND_MISMATCH.
  const processedIntents = resolveCircleNameCollisions(intents);
```

- [ ] **Step 2: Thêm import + insert normalizer call**

Edit `buildFigureIntent.ts:13` thêm import:

```typescript
import { normalizeIntents } from './normalizeIntent';
```

Edit `buildFigureIntent.ts:117-125` thay block trên bằng:

```typescript
  // Stage 1.5a: variant normalization (rule-based — fix common LLM biases về
  // variant naming, vd "cân tại A" → isoceles-BC theo canonical, rectangle
  // "wide" → "standard" mặc định).
  const intents = normalizeIntents(envelope.intents!, problem);

  // Stage 1.5b: preprocess naming collisions (circle name dùng làm point ref).
  // Notation Việt "(O)" thường ám chỉ TÂM (point) chứ không phải tên circle —
  // preprocessor inject add-point center + rename circle để tránh KIND_MISMATCH.
  const processedIntents = resolveCircleNameCollisions(intents);
```

- [ ] **Step 3: Viết test integration cho buildFigureIntent**

File: `src/stamps/geometry-2d/ai/__tests__/buildFigureIntent.normalize.test.ts` (mới)

```typescript
import { normalizeIntents } from '../normalizeIntent';
import type { IntentT } from '../intent';

// Smoke: verify normalizer được apply tại điểm correct trong pipeline.
// Full E2E qua provider mock đã có ở buildFigureIntent.test.ts; ở đây chỉ
// đảm bảo hàm normalizeIntents giữ contract pure + idempotent.
describe('normalizeIntents — pipeline integration', () => {
  it('không mutate input', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'rectangle', labels: ['A','B','C','D'], variant: 'wide' as never },
    ];
    const before = JSON.stringify(intents);
    normalizeIntents(intents, 'Hình chữ nhật ABCD.');
    expect(JSON.stringify(intents)).toBe(before);
  });

  it('idempotent', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'isoceles-AB' as never },
    ];
    const once = normalizeIntents(intents, 'Tam giác ABC cân tại A.');
    const twice = normalizeIntents(once, 'Tam giác ABC cân tại A.');
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });
});
```

- [ ] **Step 4: Chạy test + typecheck**

```bash
npx jest src/stamps/geometry-2d/ai/__tests__/normalizeIntent.test.ts src/stamps/geometry-2d/ai/__tests__/buildFigureIntent.normalize.test.ts
npm run typecheck
```

Expected: 11/11 tests pass, typecheck OK.

- [ ] **Step 5: Run full test suite — đảm bảo không break**

```bash
npm test
```

Expected: tất cả tests pass (1547+ test xanh per CLAUDE.md).

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/ai/buildFigureIntent.ts src/stamps/geometry-2d/ai/__tests__/buildFigureIntent.normalize.test.ts
git commit -m "feat(ai): wire normalizeIntents vào pipeline post-parse"
```

---

### Task 5: Fix prompt inconsistency intentPrompt.ts

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intentPrompt.ts:220-227` (Variant enum section)
- Modify: `src/stamps/geometry-2d/ai/intentPrompt.ts:200-204` (Quy tắc variant)

- [ ] **Step 1: Sửa Variant enum block**

Edit `intentPrompt.ts:220-227`:

```text
## Variant enum (chỉ dùng giá trị này)
- triangle: any | equilateral | isoceles-AB | isoceles-BC | isoceles-CA | right-at-A | right-at-B | right-at-C
- square: standard
- rectangle: standard (default) | wide | tall
- rhombus: standard
- trapezoid: right | isoceles | general
- parallelogram: standard
- quadrilateral: any
```

- [ ] **Step 2: Reinforce isoceles label-position rule**

Edit `intentPrompt.ts:200-204`:

```text
2. **Shape variant phải khớp đề:**
   - "đều" → variant: "equilateral"
   - "vuông tại X" → variant: "right-at-X" (X là label đầu tiên trong labels[] khớp đề)
   - "cân tại X" — X là ĐỈNH CÂN, base là cạnh đối diện:
       * "tam giác ABC cân tại A" → variant: "isoceles-BC" (BC là đáy, A là apex)
       * "tam giác MNP cân tại N" → variant: "isoceles-CA" (CA là đáy theo canonical position)
       * Rule: variant đặt tên theo position trong labels[], KHÔNG phải tên literal.
         apex ở position 0 → "isoceles-BC"; position 1 → "isoceles-CA"; position 2 → "isoceles-AB".
   - không có từ khoá đặc biệt → variant: "any"
```

- [ ] **Step 3: Typecheck + test prompt builder không break**

```bash
npm run typecheck
npx jest src/stamps/geometry-2d/ai/__tests__/
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-2d/ai/intentPrompt.ts
git commit -m "fix(ai): prompt — align variant enum với examples + reinforce isoceles position rule"
```

---

### Task 6: Run eval, đo F1 gain, commit kết quả

**Files:**
- Create: `docs/superpowers/results/2026-06-04-eval-12b-variant-norm.txt`

- [ ] **Step 1: Chạy eval-intent baseline + sau-fix**

Cần Ollama serve đang chạy với `gemma3:12b` đã pull.

```bash
npx tsx scripts/eval-intent.ts gemma3:12b 2>&1 | tee docs/superpowers/results/2026-06-04-eval-12b-variant-norm.txt
```

Expected: chạy ~30-40 phút (45 problems × ~50s).

- [ ] **Step 2: So sánh với baseline 2026-06-02**

Đọc dòng cuối:
```
Avg Recall=XX.X% Precision=XX.X% F1=XX.X%
```

Baseline 2026-06-02: `Avg Recall=74.2% Precision=73.2% F1=73.7%`

Target: F1 ≥ 85%. Acceptable: F1 ≥ 80% (vẫn cần fix transpile_error riêng).

- [ ] **Step 3: Update memory + plan với kết quả thật**

Nếu F1 đạt target, append vào memory `project_ai_tier45_eval.md`:

```text
- 2026-06-04: variant normalizer ship → F1 XX% (từ 73.7%). Top fixed: Tier 0×5 + t1-rect-diag + t1-para-diags + t3-square-en.
- Bottleneck còn lại: transpile_error Tier 4-5 (intent→DSL bridge bugs).
```

- [ ] **Step 4: Commit eval result**

```bash
git add docs/superpowers/results/2026-06-04-eval-12b-variant-norm.txt
git commit -m "chore(eval): variant normalizer kết quả gemma3:12b"
```

- [ ] **Step 5: Push lên main**

```bash
git push
```

(Standing authorization per memory `feedback_git_push_authorization.md`.)

---

## Self-review checklist

- [ ] Spec coverage: 5 fail types từ root-cause table đều có task fix
- [ ] Placeholder scan: không có TBD/TODO trong steps
- [ ] Type consistency: `normalizeIntents` signature giống nhau ở Task 1/2/3/4
- [ ] Tests đầy đủ: 4 isoceles + 5 quad-standard + 2 integration = 11 unit
- [ ] Eval baseline rõ ràng (73.7% F1) + target có số (≥80% acceptable, ≥85% target)

## Out of scope (Sprint 2+)

- Pipeline transpile_error (7 ca Tier 4-5) — cần debug `intentToDsl.ts` riêng
- secondIntersection / circleIntersection / tangencyPoint rule-based intent extractors
- Quadrilateral compound diagonal extractor (đã được variant normalizer cover gần hết)
- English keyword aliases mở rộng (Tier 3 các case còn lại)

## Execution mode

**Plan complete and saved to `docs/superpowers/plans/2026-06-04-variant-normalizer.md`.**

Recommended: **Inline Execution** với checkpoint sau Task 3 (test pass) và Task 5 (prompt fix) — sprint nhỏ (~3-4h tổng), không cần subagent overhead.
