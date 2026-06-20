# Lớp sửa-lỗi input học sinh (`correctUserInput`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm lớp tiền-xử-lý xác định `correctUserInput` chạy TRƯỚC `normalizeProblemText` ở cả 3 entry, sửa lỗi gõ của học sinh (case lộn xộn, xuống dòng/space rác, thiếu dấu thanh, typo, ký hiệu) mà KHÔNG đụng nhãn toán — để đề gõ-tay khớp rule engine nhiều hơn, 0 regression trên corpus OCR.

**Architecture:** Module thuần + idempotent, 3 tầng có cờ bật/tắt + ngưỡng: (1) cấu trúc (whitespace/newline + bảng ký hiệu), (2) phục-hồi-dấu qua đối-chiếu dạng fold-bỏ-dấu với từ điển vocab hình học closed-set, (3) typo Levenshtein ≤ ngưỡng. Một GUARD xuyên suốt: chỉ đụng token chữ-thuần-văn-xuôi, tuyệt đối bỏ qua token trông như nhãn/đơn-vị (HOA, prime, số). Validate bằng mutation test-set tự sinh + gate `diag-all` 0-regression.

**Tech Stack:** TypeScript strict, `String.prototype.normalize('NFD')` + regex `\p{Diacritic}` (built-in, fold dấu), Levenshtein **inline** (~12 dòng DP — KHÔNG thêm runtime dependency; vocab ~90 từ nên so trực tiếp), Jest 29 + ts-jest, `tsx` cho script.

## Global Constraints

- **Hướng A (đã brainstorm, chốt trong issue #50):** deterministic + primitive nhẹ + từ điển domain. KHÔNG dùng thư viện VN-NLP/ML phi-xác-định.
- **KHÔNG thêm runtime dependency mới.** Levenshtein viết inline (spec cho phép `fastest-levenshtein`/`leven`, nhưng inline = 0 dep + 0 interop-risk + thuần xác-định).
- **GUARD sống còn:** CHỈ đụng token **chữ-thường thuần** (`/^\p{L}+$/u`, không digit/prime/ký-hiệu). TUYỆT ĐỐI bỏ qua HOA-đơn/đôi (A, BC, ABC), prime (O', A′), số/đơn-vị (2R, 5cm, 90°). Token chứa HOA chỉ được phép phục-hồi-dấu khi **fold-khớp CHÍNH XÁC** vocab (shouted keyword), KHÔNG fuzzy → nhãn không bao giờ bị fuzzy.
- **Thuần + idempotent:** `correctUserInput(correctUserInput(x)) === correctUserInput(x)`. Không side-effect.
- **Mỗi tầng có cờ + ngưỡng cấu hình** qua `CorrectConfig` + có test riêng từng tầng.
- **Wire TRƯỚC `normalizeProblemText` ở cả 3 entry:** `tryDeterministicFigure.ts:96`, `runDeterministicIntents.ts:31` (trong `collectDeterministic`), `partialFigure.ts:58`.
- **Gate hồi quy (bắt buộc, không thương lượng):** `npx tsx scripts/diag-all.ts` → **FULL ≥ 519** và **0 bài ok→fail** (so `.work/escalations.json` trước/sau). Đo FULL bằng snippet trong memory `project_ai_full_partial_none_metric`.
- **Git:** commit message tiếng Việt, prefix tiếng Anh (`feat`/`fix`/`test`/`chore`). **KHÔNG** thêm `Co-Authored-By`.
- `typecheck` (`npm run typecheck`) + `jest` (`npm test`) phải xanh trước khi đóng issue #50.

## File Structure

- **Create** `src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts` — module chính: util fold/levenshtein, vocab + FOLDED_VOCAB, guard, 3 tầng, hàm `correctUserInput`.
- **Create** `src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts` — unit test util + guard + từng tầng + idempotency + label-protection.
- **Create** `scripts/gen-mutation-fixture.ts` — đọc `.work/escalations.json`, chọn ~40 bài đã-FULL, ghi fixture committed.
- **Create** `src/stamps/geometry-2d/ai/deterministic/__tests__/fixtures/full-problems.json` — fixture ~40 đề FULL (committed).
- **Create** `src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.mutation.test.ts` — sinh biến thể xác định từ fixture, assert vẫn FULL ≥ ngưỡng.
- **Modify** `src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure.ts:16,96` — import + wrap.
- **Modify** `src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents.ts:8,31` — import + wrap.
- **Modify** `src/stamps/geometry-2d/ai/deterministic/partialFigure.ts:23,58` — import + wrap.

---

### Task 1: Util thuần — `foldVietnamese` + `levenshtein`

**Files:**
- Create: `src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts`

**Interfaces:**
- Produces: `export function foldVietnamese(s: string): string` (lowercase + đ→d + strip dấu thanh/mũ/móc); `function levenshtein(a: string, b: string): number` (module-private DP).

- [ ] **Step 1: Viết test thất bại**

```ts
// src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts
import { foldVietnamese } from '../correctUserInput';

describe('foldVietnamese', () => {
  it('bỏ dấu thanh + mũ + móc', () => {
    expect(foldVietnamese('đường')).toBe('duong');
    expect(foldVietnamese('tròn')).toBe('tron');
    expect(foldVietnamese('giác')).toBe('giac');
    expect(foldVietnamese('tâm')).toBe('tam');
    expect(foldVietnamese('tiếp tuyến')).toBe('tiep tuyen');
  });
  it('lowercase + Đ→d', () => {
    expect(foldVietnamese('Đường')).toBe('duong');
    expect(foldVietnamese('DUONG')).toBe('duong');
  });
  it('input đã-bỏ-dấu giữ nguyên (idempotent fold)', () => {
    expect(foldVietnamese('duong tron')).toBe('duong tron');
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx jest correctUserInput.test --no-coverage -t foldVietnamese`
Expected: FAIL — `Cannot find module '../correctUserInput'`.

- [ ] **Step 3: Viết implementation tối thiểu**

```ts
// src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts
//
// Lớp sửa-lỗi input HỌC SINH GÕ (case lộn xộn, xuống dòng/space rác, thiếu dấu
// thanh, typo, ký hiệu) — chạy TRƯỚC normalizeProblemText. Khác normalizeText
// (vốn cho nhiễu OCR). Thuần + idempotent. GUARD: chỉ đụng token chữ-thường
// thuần, bỏ qua mọi token trông như nhãn toán (HOA/prime/số/đơn-vị).

/** Fold tiếng Việt về dạng không-dấu để đối-chiếu vocab: lowercase → đ/Đ→d →
 *  NFD tách dấu → strip combining marks (U+0300–U+036F phủ mọi dấu thanh/mũ/móc
 *  của tiếng Việt). "đường"→"duong", "Giác"→"giac". */
export function foldVietnamese(s: string): string {
  return s
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Edit-distance DP (inline, không dependency). Vocab nhỏ nên O(n·m) thoải mái. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = new Array<number>(n + 1);
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}
```

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `npx jest correctUserInput.test --no-coverage -t foldVietnamese`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts
git commit -m "feat(ai/correct): util foldVietnamese + levenshtein inline cho lớp sửa input"
```

---

### Task 2: Từ điển vocab + map fold→canonical

**Files:**
- Modify: `src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts`

**Interfaces:**
- Consumes: `foldVietnamese` (Task 1).
- Produces: `const CORRECTION_VOCAB: readonly string[]` (từ-đơn hình học có dấu, canonical); `const FOLDED_VOCAB: Map<string, string>` (fold → canonical, geometry-priority first-wins).

- [ ] **Step 1: Viết test thất bại**

```ts
// thêm vào correctUserInput.test.ts
import { FOLDED_VOCAB } from '../correctUserInput';

describe('FOLDED_VOCAB', () => {
  it('fold thiếu-dấu → canonical có-dấu', () => {
    expect(FOLDED_VOCAB.get('duong')).toBe('đường');
    expect(FOLDED_VOCAB.get('tron')).toBe('tròn');
    expect(FOLDED_VOCAB.get('giac')).toBe('giác');
    expect(FOLDED_VOCAB.get('tiep')).toBe('tiếp');
    expect(FOLDED_VOCAB.get('tuyen')).toBe('tuyến');
    expect(FOLDED_VOCAB.get('vuong')).toBe('vuông');
    expect(FOLDED_VOCAB.get('goc')).toBe('góc');
  });
  it('mọi key là dạng fold của chính canonical (self-consistent)', () => {
    for (const [folded, canonical] of FOLDED_VOCAB) {
      expect(require('../correctUserInput').foldVietnamese(canonical)).toBe(folded);
    }
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx jest correctUserInput.test --no-coverage -t FOLDED_VOCAB`
Expected: FAIL — `FOLDED_VOCAB` undefined.

- [ ] **Step 3: Viết implementation tối thiểu**

```ts
// thêm vào correctUserInput.ts (sau levenshtein)

// Closed-set từ-ĐƠN hình học (canonical, có dấu). Nguồn: GLUE_VOCAB trong
// normalizeText.ts + từ-đơn tách từ GEOMETRY_KEYWORDS (vocabulary.ts) + vài từ
// cấu trúc phổ biến. CHỈ từ-đơn (corrector chạy token-by-token); cụm nhiều-từ
// tự khớp khi từng token khớp ("vuong goc"→"vuông góc"). Thứ tự = ưu tiên: nếu 2
// canonical fold trùng key thì từ ĐỨNG TRƯỚC thắng (geometry-priority).
const CORRECTION_VOCAB: readonly string[] = [
  // circle / line core
  'đường', 'tròn', 'thẳng', 'tâm', 'bán', 'kính', 'vòng',
  // polygon / triangle
  'tam', 'giác', 'tứ', 'góc', 'cạnh', 'đoạn', 'hình', 'chữ', 'nhật',
  'vuông', 'cân', 'nhọn', 'đều', 'thoi', 'thang', 'bình', 'hành',
  // chord / arc / point
  'dây', 'cung', 'điểm', 'tia', 'nửa',
  // tangent / inscribed
  'tiếp', 'tuyến', 'nội', 'ngoại', 'xúc',
  // cevians / projection
  'trung', 'trực', 'cao', 'phân', 'chiếu', 'đối', 'xứng',
  // verbs / connectors phổ biến trong đề
  'cho', 'gọi', 'vẽ', 'kẻ', 'lấy', 'qua', 'cắt', 'trên', 'dưới', 'đến',
  'song', 'với', 'của', 'và', 'là', 'đi', 'có', 'nằm', 'thuộc', 'tại',
  'một', 'hai', 'ba', 'các', 'lần', 'lượt', 'thứ', 'bất', 'kì', 'kỳ',
  'trong', 'ngoài', 'lên', 'xuống',
];

// fold → canonical (first-wins theo thứ tự CORRECTION_VOCAB).
export const FOLDED_VOCAB: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const w of CORRECTION_VOCAB) {
    const f = foldVietnamese(w);
    if (!m.has(f)) m.set(f, w);
  }
  return m;
})();
```

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `npx jest correctUserInput.test --no-coverage -t FOLDED_VOCAB`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts
git commit -m "feat(ai/correct): từ điển vocab hình học + map fold→canonical"
```

---

### Task 3: Guard phân loại token (bảo vệ nhãn toán)

**Files:**
- Modify: `src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts`

**Interfaces:**
- Produces: `export type TokenClass = 'protected' | 'upper' | 'lower'`; `export function classifyToken(token: string): TokenClass`.
  - `protected`: chứa digit/prime/ký-hiệu/không-thuần-chữ → KHÔNG đụng (2R, 5cm, O', 90°, "(O)").
  - `upper`: thuần-chữ NHƯNG có ≥1 chữ HOA (A, BC, ABC, Ax, hoặc shouted "DUONG") → chỉ được phục-hồi-dấu khi fold-khớp-CHÍNH-XÁC, KHÔNG fuzzy.
  - `lower`: thuần-chữ toàn-thường → được cả exact + fuzzy.

- [ ] **Step 1: Viết test thất bại**

```ts
// thêm vào correctUserInput.test.ts
import { classifyToken } from '../correctUserInput';

describe('classifyToken (guard)', () => {
  it('nhãn toán + đơn vị → protected', () => {
    for (const t of ['A', 'BC', 'ABC', 'MNPQ', "O'", 'A′', '2R', '5cm', '90°', '(O)', 'O₁']) {
      expect(classifyToken(t)).toBe('protected');
    }
  });
  it('token thuần-chữ có HOA → upper', () => {
    for (const t of ['Ax', 'By', 'DUONG', 'Cho', 'Đường']) {
      expect(classifyToken(t)).toBe('upper');
    }
  });
  it('token thuần-chữ toàn-thường → lower', () => {
    for (const t of ['duong', 'tron', 'giac', 'tiep', 'gisc']) {
      expect(classifyToken(t)).toBe('lower');
    }
  });
});
```

> Lưu ý: `Ax`/`By` (tia đặt tên) phân loại `upper` → vì fold "ax"/"by" KHÔNG có trong vocab nên ở tầng sau vẫn được giữ nguyên (an toàn). `Cho`/`Đường` (`upper`) fold-khớp vocab → sẽ phục-hồi-dấu + giữ case đầu ở Task 5/6.

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx jest correctUserInput.test --no-coverage -t guard`
Expected: FAIL — `classifyToken` undefined.

- [ ] **Step 3: Viết implementation tối thiểu**

```ts
// thêm vào correctUserInput.ts
export type TokenClass = 'protected' | 'upper' | 'lower';

const LETTERS_ONLY = /^\p{L}+$/u; // thuần chữ (gồm tiếng Việt), không digit/ký-hiệu
const HAS_UPPER = /\p{Lu}/u;

/** Phân loại 1 whitespace-token. Token KHÔNG thuần-chữ (có số/prime/ký-hiệu/ngoặc)
 *  → protected (nhãn/đơn-vị). Thuần-chữ có HOA → upper (chỉ exact-fold). Thuần-chữ
 *  toàn-thường → lower (exact + fuzzy). */
export function classifyToken(token: string): TokenClass {
  if (!LETTERS_ONLY.test(token)) return 'protected';
  return HAS_UPPER.test(token) ? 'upper' : 'lower';
}
```

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `npx jest correctUserInput.test --no-coverage -t guard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts
git commit -m "feat(ai/correct): guard classifyToken bảo vệ nhãn toán (HOA/prime/số/đơn-vị)"
```

---

### Task 4: Config + Tầng 1 (cấu trúc: whitespace + bảng ký hiệu)

**Files:**
- Modify: `src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts`

**Interfaces:**
- Produces: `export interface CorrectConfig { structure: boolean; accents: boolean; typo: boolean; maxTypoDistance: number; minTypoLen: number }`; `export const DEFAULT_CORRECT_CONFIG: CorrectConfig`; `function applyStructure(s: string): string`.

- [ ] **Step 1: Viết test thất bại**

```ts
// thêm vào correctUserInput.test.ts
import { applyStructure, DEFAULT_CORRECT_CONFIG } from '../correctUserInput';

describe('applyStructure (tầng 1)', () => {
  it('gộp xuống dòng + space thừa', () => {
    expect(applyStructure('Cho tam giác\n  ABC   nội  tiếp')).toBe('Cho tam giác ABC nội tiếp');
  });
  it('ký hiệu // → song song', () => {
    expect(applyStructure('AB // CD')).toBe('AB song song CD');
  });
  it('độ: "90 do" / "90 độ" → 90°', () => {
    expect(applyStructure('góc bằng 90 do')).toBe('góc bằng 90°');
    expect(applyStructure('góc bằng 90 độ')).toBe('góc bằng 90°');
  });
  it('config mặc định bật cả 3 tầng', () => {
    expect(DEFAULT_CORRECT_CONFIG).toEqual({
      structure: true, accents: true, typo: true, maxTypoDistance: 1, minTypoLen: 4,
    });
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx jest correctUserInput.test --no-coverage -t "tầng 1"`
Expected: FAIL — `applyStructure`/`DEFAULT_CORRECT_CONFIG` undefined.

- [ ] **Step 3: Viết implementation tối thiểu**

```ts
// thêm vào correctUserInput.ts
export interface CorrectConfig {
  /** Tầng 1: whitespace/newline + bảng ký hiệu. Luôn an toàn. */
  structure: boolean;
  /** Tầng 2: phục-hồi-dấu qua fold-khớp-chính-xác vocab. */
  accents: boolean;
  /** Tầng 3: typo fuzzy Levenshtein. */
  typo: boolean;
  /** Tầng 3: ngưỡng edit-distance tối đa (trên dạng fold). */
  maxTypoDistance: number;
  /** Tầng 3: độ dài fold tối thiểu mới fuzzy (tránh phá từ ngắn mơ hồ). */
  minTypoLen: number;
}

export const DEFAULT_CORRECT_CONFIG: CorrectConfig = {
  structure: true,
  accents: true,
  typo: true,
  maxTypoDistance: 1,
  minTypoLen: 4,
};

// Bảng ký hiệu/cụm → dạng rule engine hiểu. Giữ TỐI THIỂU + high-confidence;
// thêm entry phải qua gate diag-all (xem Task 9). "//" → "song song" (rule +
// vocab dùng "song song"). "<số> do|độ" → "<số>°".
const SYMBOL_MAP: ReadonlyArray<readonly [RegExp, string]> = [
  [/\/\//g, ' song song '],
  [/(\d+)\s*(?:độ|do)\b/giu, '$1°'],
];

/** Tầng 1: gộp xuống dòng + khoảng trắng dư về 1 space; áp bảng ký hiệu. */
function applyStructure(s: string): string {
  let out = s;
  for (const [re, to] of SYMBOL_MAP) out = out.replace(re, to);
  return out.replace(/\s+/g, ' ').trim();
}
export { applyStructure };
```

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `npx jest correctUserInput.test --no-coverage -t "tầng 1"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts
git commit -m "feat(ai/correct): CorrectConfig + tầng 1 cấu trúc (whitespace + bảng ký hiệu)"
```

---

### Task 5: Tầng 2+3 token-wise + lắp ráp `correctUserInput`

**Files:**
- Modify: `src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts`

**Interfaces:**
- Consumes: `foldVietnamese`, `FOLDED_VOCAB`, `classifyToken`, `applyStructure`, `DEFAULT_CORRECT_CONFIG` (Tasks 1–4).
- Produces: `export function correctUserInput(input: string, cfg?: CorrectConfig): string`.

- [ ] **Step 1: Viết test thất bại**

```ts
// thêm vào correctUserInput.test.ts
import { correctUserInput } from '../correctUserInput';

describe('correctUserInput — tầng 2 (phục-hồi-dấu + case)', () => {
  it('thiếu dấu → có dấu', () => {
    expect(correctUserInput('cho duong tron')).toBe('cho đường tròn');
    expect(correctUserInput('tiep tuyen')).toBe('tiếp tuyến');
  });
  it('KHÔNG corrupt từ-đa-nghĩa bỏ-dấu (collision an toàn)', () => {
    // fold("tam")=fold("tâm")="tam" → giữ "tam" (đúng cho "tam giác"), KHÔNG đổi "tâm".
    expect(correctUserInput('tam giac ABC')).toBe('tam giác ABC');
    // fold("thang")=fold("thẳng")="thang" → giữ "thang" (đúng cho "hình thang").
    expect(correctUserInput('hinh thang ABCD')).toBe('hình thang ABCD');
  });
  it('giữ case đầu (sentence-start + shouted)', () => {
    expect(correctUserInput('Cho duong tron')).toBe('Cho đường tròn');
    expect(correctUserInput('DUONG TRON')).toBe('Đường Tròn');
    expect(correctUserInput('Đường tròn')).toBe('Đường tròn'); // đã đúng → unchanged
  });
});

describe('correctUserInput — tầng 3 (typo)', () => {
  it('typo edit-1 từ dài → canonical', () => {
    expect(correctUserInput('tam gisc ABC')).toBe('tam giác ABC');
    expect(correctUserInput('duong tronh')).toBe('đường tròn');
  });
  it('từ ngắn (<minTypoLen) KHÔNG fuzzy', () => {
    // "hoc" (fold) cách "goc"(góc) d=1 nhưng len 3 < 4 → giữ nguyên
    expect(correctUserInput('hoc sinh')).toBe('hoc sinh');
  });
});

describe('correctUserInput — GUARD label-protection (xuyên tầng)', () => {
  it('nhãn toán giữ nguyên qua mọi tầng', () => {
    const out = correctUserInput("tam giac ABC, duong kinh BC, tiep tuyen tai A', AD = 2R, goc 90 do");
    for (const label of ['ABC', 'BC', "A'", '2R', '90°']) {
      expect(out).toContain(label);
    }
    expect(out).toContain('tam giác');
    expect(out).toContain('tiếp tuyến');
  });
});

describe('correctUserInput — idempotent + cờ tầng', () => {
  const raw = 'CHO\nduong  tronh\ttam O, AB // CD';
  it('idempotent', () => {
    const once = correctUserInput(raw);
    expect(correctUserInput(once)).toBe(once);
  });
  it('tắt accents+typo → chỉ tầng cấu trúc', () => {
    const out = correctUserInput(raw, { ...DEFAULT_CORRECT_CONFIG, accents: false, typo: false });
    expect(out).toBe('CHO duong tronh tam O, AB song song CD');
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx jest correctUserInput.test --no-coverage -t correctUserInput`
Expected: FAIL — `correctUserInput` undefined.

- [ ] **Step 3: Viết implementation tối thiểu**

```ts
// thêm vào correctUserInput.ts (import DEFAULT_CORRECT_CONFIG đã có cùng file)

/** Áp lại kiểu HOA-đầu của token gốc lên canonical: gốc có chữ-đầu HOA → canonical
 *  viết-hoa-chữ-đầu (giữ "Cho"/"Đường" sentence-start, đưa shout "DUONG"→"Đường").
 *  Gốc toàn-thường → canonical giữ thường. */
function applyLeadingCase(canonical: string, original: string): string {
  const firstUpper = /\p{Lu}/u.test(original.charAt(0));
  if (!firstUpper) return canonical;
  return canonical.charAt(0).toUpperCase() + canonical.slice(1);
}

/** Tầng 3: tìm vocab gần-khớp DUY NHẤT trong ngưỡng. Trả canonical hoặc null
 *  (không khớp / mơ hồ → để nguyên). */
function fuzzyLookup(folded: string, cfg: CorrectConfig): string | null {
  if (folded.length < cfg.minTypoLen) return null;
  let best: string | null = null;
  let bestDist = cfg.maxTypoDistance + 1;
  let tie = false;
  for (const [key, canonical] of FOLDED_VOCAB) {
    if (Math.abs(key.length - folded.length) > cfg.maxTypoDistance) continue;
    const d = levenshtein(folded, key);
    if (d < bestDist) {
      bestDist = d;
      best = canonical;
      tie = false;
    } else if (d === bestDist) {
      tie = true;
    }
  }
  if (best === null || bestDist > cfg.maxTypoDistance || tie) return null;
  return best;
}

/** Sửa 1 token theo guard + tầng 2/3. Token protected hoặc không khớp → giữ nguyên. */
function correctToken(token: string, cfg: CorrectConfig): string {
  const klass = classifyToken(token);
  if (klass === 'protected') return token;
  const folded = foldVietnamese(token);
  // Tầng 2: fold-khớp-chính-xác (áp cho cả 'upper' shouted keyword lẫn 'lower').
  if (cfg.accents) {
    const exact = FOLDED_VOCAB.get(folded);
    if (exact) return applyLeadingCase(exact, token);
  }
  // Tầng 3: fuzzy CHỈ cho token toàn-thường ('lower') — KHÔNG fuzzy token có HOA
  // để tuyệt đối không mangle nhãn (ABD ~ abc…).
  if (cfg.typo && klass === 'lower') {
    const near = fuzzyLookup(folded, cfg);
    if (near) return near;
  }
  return token;
}

/**
 * Sửa lỗi input học sinh gõ. Thuần + idempotent. Chạy TRƯỚC normalizeProblemText.
 * GUARD: chỉ đụng token chữ-thường-thuần; nhãn toán (HOA/prime/số/đơn-vị) bất biến.
 */
export function correctUserInput(
  input: string,
  cfg: CorrectConfig = DEFAULT_CORRECT_CONFIG,
): string {
  let s = input;
  if (cfg.structure) s = applyStructure(s);
  if (!cfg.accents && !cfg.typo) return s;
  // Tách giữ separator để ghép lại nguyên vẹn.
  return s
    .split(/(\s+)/)
    .map((tok) => (/\s/.test(tok) || tok === '' ? tok : correctToken(tok, cfg)))
    .join('');
}
```

> Lưu ý case "DUONG TRON" → "Đường Tròn": mỗi token áp `applyLeadingCase` độc lập. Nếu mutation test (Task 8) cho thấy Title-case mid-sentence cản rule khớp, đổi `applyLeadingCase` sang luôn-trả-canonical-thường cho token `upper` shouted ALL-CAPS (giữ Title chỉ khi gốc là Title-case) — chốt qua gate.

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `npx jest correctUserInput.test --no-coverage`
Expected: PASS (toàn bộ describe trong file).

- [ ] **Step 5: typecheck**

Run: `npm run typecheck`
Expected: 0 lỗi.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts
git commit -m "feat(ai/correct): tầng 2 phục-hồi-dấu + tầng 3 typo + lắp correctUserInput (guard label-protection)"
```

---

### Task 6: Wire `correctUserInput` TRƯỚC `normalizeProblemText` ở 3 entry

**Files:**
- Modify: `src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure.ts:16,96`
- Modify: `src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents.ts:8,31`
- Modify: `src/stamps/geometry-2d/ai/deterministic/partialFigure.ts:23,58`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts`

**Interfaces:**
- Consumes: `correctUserInput`, `tryDeterministicFigure` (entry e2e).

- [ ] **Step 1: Viết test thất bại (e2e qua entry)**

```ts
// thêm vào correctUserInput.test.ts
import { tryDeterministicFigure } from '../tryDeterministicFigure';

describe('wiring e2e — đề gõ-tay lệch vẫn dựng được', () => {
  it('thiếu dấu + case + xuống dòng → FULL như bản chuẩn', () => {
    const messy = 'cho TAM giac ABC\nnoi tiep duong tron tam O';
    const clean = 'Cho tam giác ABC nội tiếp đường tròn tâm O';
    expect(tryDeterministicFigure(messy).ok).toBe(tryDeterministicFigure(clean).ok);
    expect(tryDeterministicFigure(clean).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó fail**

Run: `npx jest correctUserInput.test --no-coverage -t wiring`
Expected: FAIL — `messy` chưa được sửa nên `.ok` lệch (false) so với `clean` (true).

- [ ] **Step 3: Sửa 3 entry**

`tryDeterministicFigure.ts` — thêm import sau dòng 16, đổi dòng 96:
```ts
import { correctUserInput } from './correctUserInput';
```
```ts
  const problem = normalizeProblemText(correctUserInput(rawProblem));
```

`runDeterministicIntents.ts` — thêm import sau dòng 8, đổi dòng 31 (trong `collectDeterministic`):
```ts
import { correctUserInput } from './correctUserInput';
```
```ts
  const problem = normalizeProblemText(correctUserInput(rawProblem));
```

`partialFigure.ts` — thêm import sau dòng 23, đổi dòng 58:
```ts
import { correctUserInput } from './correctUserInput';
```
```ts
  const problem = normalizeProblemText(correctUserInput(rawProblem));
```

- [ ] **Step 4: Chạy test để chắc nó pass**

Run: `npx jest correctUserInput.test --no-coverage -t wiring`
Expected: PASS.

- [ ] **Step 5: typecheck**

Run: `npm run typecheck`
Expected: 0 lỗi.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure.ts \
        src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents.ts \
        src/stamps/geometry-2d/ai/deterministic/partialFigure.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.test.ts
git commit -m "feat(ai/correct): wire correctUserInput trước normalizeProblemText ở 3 entry"
```

---

### Task 7: Script sinh fixture ~40 đề đã-FULL

**Files:**
- Create: `scripts/gen-mutation-fixture.ts`
- Create (output, committed): `src/stamps/geometry-2d/ai/deterministic/__tests__/fixtures/full-problems.json`

**Interfaces:**
- Consumes: `.work/escalations.json` (sinh bởi `diag-all`).
- Produces: file fixture JSON `Array<{ dataset: string; id: string; text: string }>` — các bài `ok === true` (FULL), stratified theo dataset, ≤40 bài.

- [ ] **Step 1: Sinh dữ liệu nguồn**

Run: `npx tsx scripts/diag-all.ts`
Expected: in summary + ghi `.work/escalations.json`. Ghi lại số FULL (snippet memory `project_ai_full_partial_none_metric`) làm **baseline** cho Task 9.

- [ ] **Step 2: Viết script generator**

```ts
// scripts/gen-mutation-fixture.ts — chọn ~40 đề đã-FULL, stratified theo dataset,
// ghi fixture committed cho mutation test. Xác định (sort + lấy đều), không RNG.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

interface Esc { dataset: string; id: string; intro: string; ok: boolean }
const OUT = 'src/stamps/geometry-2d/ai/deterministic/__tests__/fixtures/full-problems.json';
const TARGET = 40;

const all: Esc[] = JSON.parse(readFileSync('.work/escalations.json', 'utf8'));
const full = all.filter((e) => e.ok && e.intro && e.intro.trim().length > 20);

// nhóm theo dataset, sort ổn định, lấy round-robin tới TARGET.
const byDs = new Map<string, Esc[]>();
for (const e of full) {
  if (!byDs.has(e.dataset)) byDs.set(e.dataset, []);
  byDs.get(e.dataset)!.push(e);
}
for (const arr of byDs.values()) arr.sort((a, b) => a.id.localeCompare(b.id));
const datasets = [...byDs.keys()].sort();

const picked: Esc[] = [];
let idx = 0;
while (picked.length < TARGET) {
  let progressed = false;
  for (const ds of datasets) {
    const arr = byDs.get(ds)!;
    if (idx < arr.length) {
      picked.push(arr[idx]);
      progressed = true;
      if (picked.length >= TARGET) break;
    }
  }
  if (!progressed) break;
  idx++;
}

const fixture = picked.map((e) => ({ dataset: e.dataset, id: e.id, text: e.intro.trim() }));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(fixture, null, 2) + '\n');
console.log(`Ghi ${fixture.length} đề FULL vào ${OUT}`);
```

- [ ] **Step 3: Chạy generator + kiểm fixture**

Run: `npx tsx scripts/gen-mutation-fixture.ts`
Expected: in `Ghi 40 đề FULL vào …` (hoặc < 40 nếu corpus ít FULL hơn — vẫn OK, ≥ 30 là đủ). File JSON tồn tại, mỗi phần tử có `text` không rỗng.

- [ ] **Step 4: Commit (script + fixture)**

```bash
git add scripts/gen-mutation-fixture.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/fixtures/full-problems.json
git commit -m "test(ai/correct): script + fixture ~40 đề đã-FULL cho mutation test-set"
```

---

### Task 8: Mutation test-set (assert biến thể vẫn FULL ≥ ngưỡng)

**Files:**
- Create: `src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.mutation.test.ts`
- Modify (nếu cần tinh chỉnh): `src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts`

**Interfaces:**
- Consumes: fixture `full-problems.json` (Task 7), `tryDeterministicFigure` (đã wire corrector ở Task 6).

- [ ] **Step 1: Viết test (4 loại biến thể XÁC ĐỊNH, không RNG)**

```ts
// src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.mutation.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tryDeterministicFigure } from '../tryDeterministicFigure';
import { foldVietnamese, classifyToken } from '../correctUserInput';

interface Fix { dataset: string; id: string; text: string }
const FIX: Fix[] = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/full-problems.json'), 'utf8'),
);

// --- mutator XÁC ĐỊNH: chỉ đụng token 'lower' (chữ-thường-thuần) để mô phỏng
//     học sinh gõ; KHÔNG đụng nhãn (giữ bài hợp lệ về mặt hình học). ---
const mapLowerTokens = (text: string, fn: (t: string) => string) =>
  text.split(/(\s+)/).map((t) => (classifyToken(t) === 'lower' ? fn(t) : t)).join('');

const stripAccents = (text: string) => mapLowerTokens(text, foldVietnamese); // bỏ dấu
const upcaseKeywords = (text: string) =>
  mapLowerTokens(text, (t) => (t.length >= 3 ? t.toUpperCase() : t)); // shout
const typo1 = (text: string) => {
  // xoá ký tự thứ 3 của token-lower ĐẦU TIÊN có độ dài ≥5 (đủ để corrector cứu).
  let done = false;
  return mapLowerTokens(text, (t) => {
    if (done || t.length < 5) return t;
    done = true;
    return t.slice(0, 2) + t.slice(3);
  });
};
const junkSpace = (text: string) => text.replace(/ /g, (_, i) => (i % 7 === 0 ? '\n  ' : ' '));

const MUTATORS: Array<[string, (t: string) => string]> = [
  ['stripAccents', stripAccents],
  ['upcaseKeywords', upcaseKeywords],
  ['typo1', typo1],
  ['junkSpace', junkSpace],
];

describe('mutation test-set', () => {
  it('baseline: mọi đề fixture FULL không cần sửa', () => {
    for (const f of FIX) expect(tryDeterministicFigure(f.text).ok).toBe(true);
  });

  it('≥85% biến thể vẫn FULL sau corrector', () => {
    let total = 0;
    let pass = 0;
    const fails: string[] = [];
    for (const f of FIX) {
      for (const [name, mut] of MUTATORS) {
        total++;
        const ok = tryDeterministicFigure(mut(f.text)).ok;
        if (ok) pass++;
        else fails.push(`${f.dataset}:${f.id} [${name}]`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`mutation FULL: ${pass}/${total}`, fails.slice(0, 20));
    expect(pass / total).toBeGreaterThanOrEqual(0.85);
  });
});
```

- [ ] **Step 2: Chạy test**

Run: `npx jest correctUserInput.mutation --no-coverage`
Expected: in `mutation FULL: <pass>/<total>`. Nếu `≥85%` → PASS.

- [ ] **Step 3: Nếu < 85% — tinh chỉnh (KHÔNG nới guard)**

Đọc danh sách `fails` in ra, phân loại theo mutator:
- **stripAccents/upcaseKeywords fail nhiều** → thiếu từ trong `CORRECTION_VOCAB` (thêm từ-đơn xuất hiện trong fail) **hoặc** `applyLeadingCase` Title-case cản match → đổi token `upper` ALL-CAPS sang trả canonical-thường (giữ Title chỉ khi gốc Title-case).
- **typo1 fail nhiều** → nâng `maxTypoDistance` 1→2 cho từ dài (đặt `minTypoLen` ≥6 khi d=2) hoặc bổ sung vocab.
- **junkSpace fail** → `applyStructure` chưa gộp hết; kiểm regex `\s+`.

Lặp Step 2 tới khi ≥85%. Chốt ngưỡng cuối cùng (có thể nâng lên 0.90 nếu đạt) vào assertion.

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/__tests__/correctUserInput.mutation.test.ts \
        src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts
git commit -m "test(ai/correct): mutation test-set 4 biến thể (bỏ dấu/shout/typo/space) ≥85% FULL"
```

---

### Task 9: Gate hồi quy `diag-all` (FULL ≥ 519, 0 ok→fail) + đóng issue

**Files:**
- (Có thể) Modify: `src/stamps/geometry-2d/ai/deterministic/correctUserInput.ts` — nếu gate phát hiện regression, tinh chỉnh config/vocab/symbol.

**Interfaces:**
- Consumes: `scripts/diag-all.ts`, baseline FULL ghi ở Task 7 Step 1.

- [ ] **Step 1: Lưu baseline trước (nếu chưa)**

Run:
```bash
cp .work/escalations.json .work/escalations.before.json 2>/dev/null || true
```
(Nếu Task 7 đã chạy diag-all TRƯỚC khi wire corrector, file này chính là baseline. Nếu không, checkout tạm trước Task 6, chạy diag-all, lưu lại — hoặc dùng FULL count đã ghi.)

- [ ] **Step 2: Chạy diag-all SAU khi wire**

Run: `npx tsx scripts/diag-all.ts`
Expected: hoàn tất, ghi `.work/escalations.json`.

- [ ] **Step 3: Đo FULL + đếm ok→fail**

Run:
```bash
node -e 'const a=require("./.work/escalations.json");const f=a.filter(x=>x.ok).length;const n=a.filter(x=>!x.ok&&(x.detIntents||[]).length===0).length;console.log("FULL:",f,"PARTIAL:",a.length-f-n,"NONE:",n)'
```
```bash
node -e 'const b=require("./.work/escalations.before.json");const a=require("./.work/escalations.json");const B=new Map(b.map(x=>[x.dataset+":"+x.id,x.ok]));const reg=a.filter(x=>!x.ok&&B.get(x.dataset+":"+x.id)===true).map(x=>x.dataset+":"+x.id);console.log("ok→fail:",reg.length,reg.slice(0,30))'
```
Expected: **FULL ≥ 519** và **ok→fail: 0**.

- [ ] **Step 4: Nếu regression — sửa rồi lặp**

Mỗi bài `ok→fail` là corrector đã đổi text khiến bài FULL trước đó hỏng. Cô lập bằng:
```bash
npx tsx scripts/dbg-bai.ts <dataset> <id>
```
So `correctUserInput(intro)` vs `intro` để thấy token bị đổi sai. Khắc phục bằng các núm (KHÔNG nới guard):
- Bỏ từ gây hại khỏi `CORRECTION_VOCAB` (fuzzy mangle), hoặc nâng `minTypoLen`, hoặc `maxTypoDistance` về 1.
- Xoá entry `SYMBOL_MAP` gây regression (vd "do" → ° trên ngữ cảnh "do đó" — nếu xuất hiện, siết regex hoặc bỏ nhánh `do`).
- Cùng lắm đặt mặc định `typo: false` (vẫn thoả spec: tầng tồn tại + có cờ) nếu tầng typo gây hại ròng trên corpus.
Lặp Step 2–3 tới khi đạt FULL ≥ 519 và 0 ok→fail.

- [ ] **Step 5: typecheck + full jest**

Run: `npm run typecheck && npm test`
Expected: typecheck 0 lỗi; toàn bộ suite xanh.

- [ ] **Step 6: Commit (nếu có tinh chỉnh ở Step 4) + đóng issue**

```bash
git add -A && git commit -m "fix(ai/correct): tinh chỉnh vocab/ngưỡng đạt diag-all 0-regression" || true
git push
gh issue close 50 --comment "Hoàn tất: correctUserInput 3 tầng + guard label-protection, wire 3 entry. Mutation test-set ≥85% FULL; diag-all FULL ≥519, 0 ok→fail; typecheck + jest xanh."
```

---

## Self-Review

**1. Spec coverage (issue #50):**
- `correctUserInput.ts` + wire trước `normalizeText` ở 3 entry → Task 6. ✓
- 3 tầng + guard, mỗi tầng có cờ + test riêng → Task 3 (guard), 4 (tầng 1), 5 (tầng 2+3 + cờ). ✓
- Mutation test-set ~40 đề × 4 biến thể → Task 7 (fixture) + Task 8 (test). ✓
- diag-all FULL ≥ 519, 0 regression → Task 9. ✓
- typecheck + jest xanh; idempotent + thuần → Task 5 (idempotent test), Task 9 Step 5. ✓
- KHÔNG đụng nhãn toán (test "AB"/"O'"/"2R"/"90°") → Task 5 GUARD test. ✓
- Tầng 1 (structure)/2 (NFD-fold vocab)/3 (Levenshtein) → Tasks 4/5/5. ✓
- KHÔNG lib VN-NLP nặng; `String.normalize('NFD')` + Levenshtein nhẹ → Task 1 (inline). ✓

**2. Placeholder scan:** không có TBD/“handle edge cases”; mọi step code có code đầy đủ; núm tinh chỉnh ở Task 8/9 là danh sách hành động cụ thể, không phải placeholder. ✓

**3. Type consistency:** `CorrectConfig`/`DEFAULT_CORRECT_CONFIG`/`correctUserInput`/`classifyToken`/`foldVietnamese`/`FOLDED_VOCAB`/`applyStructure` dùng nhất quán tên + chữ ký xuyên Task 1→8. `correctUserInput(input, cfg?)` khớp mọi call-site. ✓

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-20-correct-user-input.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch fresh subagent mỗi task, review giữa các task, iterate nhanh.

**2. Inline Execution** — chạy tuần tự trong session này qua executing-plans, batch + checkpoint review.

**Chọn cách nào?**
