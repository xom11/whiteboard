# AI Fast Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giảm độ trễ dựng-hình-AI từ 10-75s xuống <100ms (60-80% case phổ thông) hoặc <8s p50 (fallback LLM tối ưu), bằng cách thêm deterministic-first parser + slim prompt + Claude Agent SDK default + token streaming.

**Architecture:**
- **Track A**: `parseDeterministic()` parse tiếng Việt → DSL skeleton + derived, confidence-gated. Hit confidence ≥ 0.85 → return ngay, không gọi LLM.
- **Track B**: Slim system prompt (6.5k→1.8k tok) + ClaudeAgentSdkProvider làm default + onToken streaming qua provider interface.
- **Track C** (race mode): defer sang issue sau A+B merge.

**Tech Stack:** TypeScript strict, Zod (DSL schema), Jest + jsdom, Vitest (some scripts), Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`).

**Spec:** `docs/superpowers/specs/2026-06-03-ai-fast-path-design.md`

---

## File Structure

### Track A (PR1)

```
NEW src/stamps/geometry-2d/ai/deterministic/
├── vocabulary.ts          ← Vietnamese geometry keywords (~50 entries)
├── skeleton.ts            ← parse base shapes: triangle/circle/quad
├── derived.ts             ← wrap+extend extractRequirements()
├── confidence.ts          ← scoring + threshold logic
├── index.ts               ← public parseDeterministic() + types
└── __tests__/
    ├── vocabulary.test.ts
    ├── skeleton.test.ts
    ├── derived.test.ts
    ├── confidence.test.ts
    └── parseDeterministic.test.ts

NEW scripts/bench-fast-path.ts   ← latency p50/p95 bench

MODIFIED src/stamps/geometry-2d/ai/handleGenerateFigure.ts
  + parseDeterministic fast-path before LLM
MODIFIED src/stamps/geometry-2d/ai/buildFigure.ts
  + opts.useDeterministic + deterministicThreshold passthrough
MODIFIED src/stamps/geometry-2d/ai/index.ts
  + export parseDeterministic
```

### Track B (PR2)

```
NEW src/stamps/geometry-2d/ai/promptSlim.ts
  ← 5-fixture slim variant of buildSystemPrompt

MODIFIED src/stamps/geometry-2d/ai/buildFigure.ts
  + opts.promptVariant: 'full' | 'slim' (default 'slim')
MODIFIED src/stamps/geometry-2d/ai/providers/types.ts
  + ProviderRequest.onToken?: (chunk: string) => void
MODIFIED src/stamps/geometry-2d/ai/providers/claude-agent-sdk.ts
  + emit onToken per assistant text block + memoize schema serialize
MODIFIED src/stamps/geometry-2d/ai/providers/ollama.ts
  + stream:true NDJSON + onToken emission
MODIFIED src/stamps/geometry-2d/ai/providers/index.ts
  + default = 'claude-agent-sdk' (was 'ollama')
MODIFIED scripts/demo/aiMiddlewarePlugin.ts
  + log new default
MODIFIED CLAUDE.md
  + section "AI provider default = Claude Agent SDK"
```

---

# TRACK A — Deterministic-first

## Task 1: Vocabulary list

**Files:**
- Create: `src/stamps/geometry-2d/ai/deterministic/vocabulary.ts`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/vocabulary.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/ai/deterministic/__tests__/vocabulary.test.ts
import { countGeometryKeywords, GEOMETRY_KEYWORDS } from '../vocabulary';

describe('vocabulary', () => {
  test('GEOMETRY_KEYWORDS includes core nouns', () => {
    expect(GEOMETRY_KEYWORDS).toEqual(
      expect.arrayContaining([
        'tam giác', 'đường tròn', 'trung điểm', 'đường cao',
        'phân giác', 'tiếp tuyến', 'nội tiếp', 'ngoại tiếp',
      ]),
    );
  });

  test('countGeometryKeywords matches case-insensitive + diacritic', () => {
    expect(countGeometryKeywords('Cho tam giác ABC')).toBe(1);
    expect(countGeometryKeywords('TAM GIÁC ABC, đường cao AH, trung điểm M')).toBe(3);
    expect(countGeometryKeywords('Hello world')).toBe(0);
  });

  test('overlapping keyword counted once per occurrence', () => {
    // "đường tròn nội tiếp" có 2 keyword distinct: đường tròn + nội tiếp
    expect(countGeometryKeywords('đường tròn nội tiếp tam giác ABC')).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/vocabulary.test.ts`
Expected: FAIL — `Cannot find module '../vocabulary'`

- [ ] **Step 3: Implement vocabulary**

```ts
// src/stamps/geometry-2d/ai/deterministic/vocabulary.ts
//
// Tập từ khóa "geometry-relevant" để confidence.ts đo coverage.
// Format: lowercase, có dấu. countGeometryKeywords lowercase input rồi match.
//
// Khi mở rộng parser → thêm keyword tương ứng để confidence tăng theo.

export const GEOMETRY_KEYWORDS: readonly string[] = [
  // Base shapes
  'tam giác', 'đường tròn', 'hình chữ nhật', 'hình vuông',
  'hình bình hành', 'hình thoi', 'hình thang', 'tứ giác',
  // Triangle variants
  'vuông tại', 'cân tại', 'đều',
  // Circle parts
  'bán kính', 'tâm', 'đường kính',
  // Derived points
  'trung điểm', 'chân đường cao', 'hình chiếu',
  'trọng tâm', 'trực tâm', 'tâm nội tiếp', 'tâm ngoại tiếp',
  // Cevian names
  'đường cao', 'trung tuyến', 'phân giác', 'trung trực',
  // Special lines/circles
  'tiếp tuyến', 'tiếp điểm', 'tiếp xúc',
  'nội tiếp', 'ngoại tiếp',
  // Relations
  'song song', 'vuông góc', 'giao điểm', 'cắt',
  // Verbs
  'qua', 'kẻ', 'vẽ', 'dựng', 'nối',
];

export function countGeometryKeywords(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of GEOMETRY_KEYWORDS) {
    // Đếm số lần xuất hiện. "tam giác" 2 lần = count 2 (mỗi mention 1 weight).
    let from = 0;
    while (true) {
      const i = lower.indexOf(kw, from);
      if (i < 0) break;
      count++;
      from = i + kw.length;
    }
  }
  return count;
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/vocabulary.test.ts`
Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/vocabulary.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/vocabulary.test.ts
git commit -m "feat(ai): deterministic — vocabulary list + countGeometryKeywords"
```

---

## Task 2: Skeleton parser — Triangle

**Files:**
- Create: `src/stamps/geometry-2d/ai/deterministic/skeleton.ts`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts`

- [ ] **Step 1: Write failing test (triangle variants)**

```ts
// src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts
import { parseSkeleton } from '../skeleton';

describe('parseSkeleton — triangle', () => {
  test('plain "tam giác ABC" → 3 free points scalene + 3 segments', () => {
    const r = parseSkeleton('Cho tam giác ABC');
    expect(r.points).toEqual([
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
    ]);
    expect(r.shapes).toEqual([
      { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'CA', kind: 'segment', p1: 'C', p2: 'A' },
    ]);
    expect(r.matched).toContain('triangle');
  });

  test('"tam giác vuông tại A" → right-triangle template', () => {
    const r = parseSkeleton('tam giác ABC vuông tại A');
    expect(r.points).toEqual([
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 4, y: 0 },
      { name: 'C', kind: 'free', x: 0, y: 3 },
    ]);
    expect(r.matched).toContain('triangle-right');
  });

  test('"tam giác đều ABC" → equilateral template', () => {
    const r = parseSkeleton('tam giác đều ABC');
    expect(r.points[0]).toEqual({ name: 'A', kind: 'free', x: 0, y: 2.6 });
    expect(r.points[1]).toEqual({ name: 'B', kind: 'free', x: -1.5, y: 0 });
    expect(r.points[2]).toEqual({ name: 'C', kind: 'free', x: 1.5, y: 0 });
    expect(r.matched).toContain('triangle-equilateral');
  });

  test('"tam giác cân tại A" → isoceles template', () => {
    const r = parseSkeleton('tam giác ABC cân tại A');
    expect(r.points[0]).toEqual({ name: 'A', kind: 'free', x: 0, y: 3 });
    expect(r.points[1]).toEqual({ name: 'B', kind: 'free', x: -2, y: 0 });
    expect(r.points[2]).toEqual({ name: 'C', kind: 'free', x: 2, y: 0 });
    expect(r.matched).toContain('triangle-isoceles');
  });

  test('no triangle → empty result', () => {
    const r = parseSkeleton('Cho đường thẳng AB');
    expect(r.points).toEqual([]);
    expect(r.shapes).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement triangle parsing**

```ts
// src/stamps/geometry-2d/ai/deterministic/skeleton.ts
//
// Parse base shapes from Vietnamese problem statement.
// Returns DSL points + shapes + matched pattern labels (for confidence).

import type { DslPointT, DslShapeT } from '../../dsl/schema';

export interface SkeletonResult {
  readonly points: DslPointT[];
  readonly shapes: DslShapeT[];
  /** Pattern labels matched. Used by confidence.ts to bump score. */
  readonly matched: string[];
}

const TRI_RE = /tam\s*giác(?:\s+(?:vuông|cân|đều))?\s+([A-Z])([A-Z])([A-Z])/i;
const TRI_RIGHT_RE = /tam\s*giác(?:\s+([A-Z])([A-Z])([A-Z]))?\s+vuông\s+tại\s+([A-Z])/i;
const TRI_ISOSCELES_RE = /tam\s*giác(?:\s+([A-Z])([A-Z])([A-Z]))?\s+cân\s+tại\s+([A-Z])/i;
const TRI_EQUILATERAL_RE = /tam\s*giác\s+đều\s+([A-Z])([A-Z])([A-Z])/i;

export function parseSkeleton(prompt: string): SkeletonResult {
  const points: DslPointT[] = [];
  const shapes: DslShapeT[] = [];
  const matched: string[] = [];

  parseTriangle(prompt, points, shapes, matched);

  return { points, shapes, matched };
}

function parseTriangle(
  prompt: string,
  points: DslPointT[],
  shapes: DslShapeT[],
  matched: string[],
): void {
  // 1. Equilateral
  const mEq = prompt.match(TRI_EQUILATERAL_RE);
  if (mEq) {
    const [A, B, C] = [mEq[1].toUpperCase(), mEq[2].toUpperCase(), mEq[3].toUpperCase()];
    points.push(
      { name: A, kind: 'free', x: 0, y: 2.6 },
      { name: B, kind: 'free', x: -1.5, y: 0 },
      { name: C, kind: 'free', x: 1.5, y: 0 },
    );
    pushTriangleSegments(shapes, A, B, C);
    matched.push('triangle', 'triangle-equilateral');
    return;
  }

  // 2. Right
  const mRight = prompt.match(TRI_RIGHT_RE);
  if (mRight) {
    // Group 1-3 maybe absent ("tam giác vuông tại A" no labels); group 4 = right vertex
    const labels = mRight[1] && mRight[2] && mRight[3]
      ? [mRight[1].toUpperCase(), mRight[2].toUpperCase(), mRight[3].toUpperCase()]
      : extractAnyTriple(prompt) ?? ['A', 'B', 'C'];
    const rightV = mRight[4].toUpperCase();
    const others = labels.filter((l) => l !== rightV);
    if (others.length === 2) {
      points.push(
        { name: rightV, kind: 'free', x: 0, y: 0 },
        { name: others[0], kind: 'free', x: 4, y: 0 },
        { name: others[1], kind: 'free', x: 0, y: 3 },
      );
      pushTriangleSegments(shapes, labels[0], labels[1], labels[2]);
      matched.push('triangle', 'triangle-right');
      return;
    }
  }

  // 3. Isoceles
  const mIso = prompt.match(TRI_ISOSCELES_RE);
  if (mIso) {
    const labels = mIso[1] && mIso[2] && mIso[3]
      ? [mIso[1].toUpperCase(), mIso[2].toUpperCase(), mIso[3].toUpperCase()]
      : extractAnyTriple(prompt) ?? ['A', 'B', 'C'];
    const apex = mIso[4].toUpperCase();
    const others = labels.filter((l) => l !== apex);
    if (others.length === 2) {
      points.push(
        { name: apex, kind: 'free', x: 0, y: 3 },
        { name: others[0], kind: 'free', x: -2, y: 0 },
        { name: others[1], kind: 'free', x: 2, y: 0 },
      );
      pushTriangleSegments(shapes, labels[0], labels[1], labels[2]);
      matched.push('triangle', 'triangle-isoceles');
      return;
    }
  }

  // 4. Generic scalene
  const m = prompt.match(TRI_RE);
  if (m) {
    const [A, B, C] = [m[1].toUpperCase(), m[2].toUpperCase(), m[3].toUpperCase()];
    points.push(
      { name: A, kind: 'free', x: 0, y: 3 },
      { name: B, kind: 'free', x: -2, y: 0 },
      { name: C, kind: 'free', x: 3, y: 0 },
    );
    pushTriangleSegments(shapes, A, B, C);
    matched.push('triangle');
  }
}

function pushTriangleSegments(shapes: DslShapeT[], a: string, b: string, c: string): void {
  shapes.push(
    { name: a + b, kind: 'segment', p1: a, p2: b },
    { name: b + c, kind: 'segment', p1: b, p2: c },
    { name: c + a, kind: 'segment', p1: c, p2: a },
  );
}

function extractAnyTriple(prompt: string): string[] | null {
  const m = prompt.match(/([A-Z])([A-Z])([A-Z])/);
  if (!m) return null;
  return [m[1], m[2], m[3]];
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts`
Expected: PASS — 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/skeleton.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts
git commit -m "feat(ai): deterministic — parseSkeleton triangle (4 variants)"
```

---

## Task 3: Skeleton parser — Circle

**Files:**
- Modify: `src/stamps/geometry-2d/ai/deterministic/skeleton.ts`
- Modify: `src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts`

- [ ] **Step 1: Add failing test cases**

Append to `skeleton.test.ts`:

```ts
describe('parseSkeleton — circle', () => {
  test('"(O; R=3)" → free O + circleCR radius 3', () => {
    const r = parseSkeleton('Cho đường tròn (O; R=3)');
    expect(r.points).toContainEqual({ name: 'O', kind: 'free', x: 0, y: 0 });
    expect(r.shapes).toContainEqual({ name: 'omega', kind: 'circleCR', center: 'O', radius: 3 });
    expect(r.matched).toContain('circle-cr');
  });

  test('"(O) bán kính 5" → radius 5', () => {
    const r = parseSkeleton('đường tròn (O) bán kính 5');
    expect(r.shapes[0]).toEqual({ name: 'omega', kind: 'circleCR', center: 'O', radius: 5 });
  });

  test('"đường tròn tâm I bán kính 2.5"', () => {
    const r = parseSkeleton('đường tròn tâm I bán kính 2.5');
    expect(r.points).toContainEqual({ name: 'I', kind: 'free', x: 0, y: 0 });
    expect(r.shapes[0]).toEqual({ name: 'omega', kind: 'circleCR', center: 'I', radius: 2.5 });
  });

  test('triangle + circle co-exist', () => {
    const r = parseSkeleton('Cho tam giác ABC và đường tròn (O; R=2)');
    expect(r.points.map((p) => p.name).sort()).toEqual(['A', 'B', 'C', 'O']);
    expect(r.shapes.some((s) => s.kind === 'circleCR')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts`
Expected: 4 new tests FAIL, triangle tests still PASS.

- [ ] **Step 3: Add circle parsing**

Edit `skeleton.ts` — add at top:

```ts
const CIRCLE_CR_RE = /\(\s*([A-Z])\s*;\s*R\s*=\s*(\d+(?:[.,]\d+)?)\s*\)/;
const CIRCLE_R_AFTER_RE = /\(\s*([A-Z])\s*\)\s*bán\s*kính\s*(\d+(?:[.,]\d+)?)/i;
const CIRCLE_NAMED_R_RE = /đường\s*tròn\s*tâm\s*([A-Z])\s*bán\s*kính\s*(\d+(?:[.,]\d+)?)/i;
```

Then add after `parseTriangle()` call in `parseSkeleton()`:

```ts
parseCircle(prompt, points, shapes, matched);
```

Add function:

```ts
function parseCircle(
  prompt: string,
  points: DslPointT[],
  shapes: DslShapeT[],
  matched: string[],
): void {
  let centerName: string | null = null;
  let radius: number | null = null;

  for (const re of [CIRCLE_CR_RE, CIRCLE_R_AFTER_RE, CIRCLE_NAMED_R_RE]) {
    const m = prompt.match(re);
    if (m) {
      centerName = m[1].toUpperCase();
      radius = parseFloat(m[2].replace(',', '.'));
      break;
    }
  }

  if (centerName === null || radius === null) return;

  // Free center if not already declared (e.g., by triangle parser).
  if (!points.some((p) => p.name === centerName)) {
    points.push({ name: centerName, kind: 'free', x: 0, y: 0 });
  }
  shapes.push({ name: 'omega', kind: 'circleCR', center: centerName, radius });
  matched.push('circle-cr');
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts`
Expected: PASS — all 9 tests (5 triangle + 4 circle)

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/skeleton.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts
git commit -m "feat(ai): deterministic — parseSkeleton circle (3 phrasings)"
```

---

## Task 4: Skeleton parser — Quadrilateral

**Files:**
- Modify: `src/stamps/geometry-2d/ai/deterministic/skeleton.ts`
- Modify: `src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts`

- [ ] **Step 1: Add failing test cases**

Append to `skeleton.test.ts`:

```ts
describe('parseSkeleton — quadrilateral', () => {
  test('"hình chữ nhật ABCD" → 4 free + 4 segments', () => {
    const r = parseSkeleton('Cho hình chữ nhật ABCD');
    expect(r.points).toEqual([
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 4, y: 0 },
      { name: 'C', kind: 'free', x: 4, y: 2.5 },
      { name: 'D', kind: 'free', x: 0, y: 2.5 },
    ]);
    expect(r.shapes).toEqual([
      { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'CD', kind: 'segment', p1: 'C', p2: 'D' },
      { name: 'DA', kind: 'segment', p1: 'D', p2: 'A' },
    ]);
    expect(r.matched).toContain('rectangle');
  });

  test('"hình vuông ABCD" → square 3x3', () => {
    const r = parseSkeleton('hình vuông ABCD');
    expect(r.points[0]).toEqual({ name: 'A', kind: 'free', x: 0, y: 0 });
    expect(r.points[2]).toEqual({ name: 'C', kind: 'free', x: 3, y: 3 });
    expect(r.matched).toContain('square');
  });

  test('"hình bình hành ABCD" → parallelogram with slant', () => {
    const r = parseSkeleton('Cho hình bình hành ABCD');
    expect(r.points).toEqual([
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 4, y: 0 },
      { name: 'C', kind: 'free', x: 5, y: 2.5 },
      { name: 'D', kind: 'free', x: 1, y: 2.5 },
    ]);
    expect(r.matched).toContain('parallelogram');
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts`
Expected: 3 new tests FAIL.

- [ ] **Step 3: Implement quadrilateral parsing**

Add regex constants:

```ts
const RECT_RE = /hình\s+chữ\s+nhật\s+([A-Z])([A-Z])([A-Z])([A-Z])/i;
const SQUARE_RE = /hình\s+vuông\s+([A-Z])([A-Z])([A-Z])([A-Z])/i;
const PARALLELOGRAM_RE = /hình\s+bình\s+hành\s+([A-Z])([A-Z])([A-Z])([A-Z])/i;
```

Call `parseQuadrilateral(prompt, points, shapes, matched)` from `parseSkeleton()` (before `parseTriangle` — quad has stronger match).

Add function:

```ts
function parseQuadrilateral(
  prompt: string,
  points: DslPointT[],
  shapes: DslShapeT[],
  matched: string[],
): void {
  // Square (3x3)
  let m = prompt.match(SQUARE_RE);
  if (m) {
    pushQuadFreePoints(points, m, [[0,0],[3,0],[3,3],[0,3]]);
    pushQuadSegments(shapes, m);
    matched.push('square');
    return;
  }
  // Rectangle (4x2.5)
  m = prompt.match(RECT_RE);
  if (m) {
    pushQuadFreePoints(points, m, [[0,0],[4,0],[4,2.5],[0,2.5]]);
    pushQuadSegments(shapes, m);
    matched.push('rectangle');
    return;
  }
  // Parallelogram (slanted)
  m = prompt.match(PARALLELOGRAM_RE);
  if (m) {
    pushQuadFreePoints(points, m, [[0,0],[4,0],[5,2.5],[1,2.5]]);
    pushQuadSegments(shapes, m);
    matched.push('parallelogram');
    return;
  }
}

function pushQuadFreePoints(
  points: DslPointT[],
  m: RegExpMatchArray,
  coords: [number, number][],
): void {
  for (let i = 0; i < 4; i++) {
    points.push({
      name: m[i + 1].toUpperCase(),
      kind: 'free',
      x: coords[i][0],
      y: coords[i][1],
    });
  }
}

function pushQuadSegments(shapes: DslShapeT[], m: RegExpMatchArray): void {
  const [a, b, c, d] = [m[1], m[2], m[3], m[4]].map((s) => s.toUpperCase());
  shapes.push(
    { name: a + b, kind: 'segment', p1: a, p2: b },
    { name: b + c, kind: 'segment', p1: b, p2: c },
    { name: c + d, kind: 'segment', p1: c, p2: d },
    { name: d + a, kind: 'segment', p1: d, p2: a },
  );
}
```

Note: skip triangle if quadrilateral matched (early-return) so "hình chữ nhật ABCD" with embedded `ABC` doesn't double-fire. Adjust `parseSkeleton`:

```ts
export function parseSkeleton(prompt: string): SkeletonResult {
  const points: DslPointT[] = [];
  const shapes: DslShapeT[] = [];
  const matched: string[] = [];

  parseQuadrilateral(prompt, points, shapes, matched);
  if (matched.length === 0) {
    parseTriangle(prompt, points, shapes, matched);
  }
  parseCircle(prompt, points, shapes, matched);

  return { points, shapes, matched };
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts`
Expected: PASS — all 12 tests

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/skeleton.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/skeleton.test.ts
git commit -m "feat(ai): deterministic — parseSkeleton quadrilateral (3 variants)"
```

---

## Task 5: Derived wrapper

**Files:**
- Create: `src/stamps/geometry-2d/ai/deterministic/derived.ts`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/derived.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/ai/deterministic/__tests__/derived.test.ts
import { applyDerived } from '../derived';
import type { DslPointT, DslShapeT } from '../../../dsl/schema';

function emptyState(): { points: DslPointT[]; shapes: DslShapeT[]; matched: string[] } {
  return { points: [], shapes: [], matched: [] };
}

describe('applyDerived', () => {
  test('"M là trung điểm BC" injects midpoint point', () => {
    const state = emptyState();
    // pretend triangle parser already emitted A, B, C + segments
    state.points.push(
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
    );
    state.shapes.push(
      { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'CA', kind: 'segment', p1: 'C', p2: 'A' },
    );

    applyDerived('M là trung điểm BC', state);

    expect(state.points).toContainEqual({
      name: 'M', kind: 'midpoint', p1: 'B', p2: 'C',
    });
    expect(state.matched).toContain('midpoint');
  });

  test('"đường cao AH" injects perpFoot H + segment AH', () => {
    const state = emptyState();
    state.points.push(
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
    );
    state.shapes.push(
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
    );

    applyDerived('Cho tam giác ABC, đường cao AH', state);

    expect(state.points).toContainEqual({
      name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC',
    });
    expect(state.shapes).toContainEqual({
      name: 'AH', kind: 'segment', p1: 'A', p2: 'H',
    });
    expect(state.matched).toContain('altitude');
  });

  test('no derived keyword → no-op', () => {
    const state = emptyState();
    state.points.push({ name: 'A', kind: 'free', x: 0, y: 0 });
    applyDerived('Cho điểm A', state);
    expect(state.points).toHaveLength(1);
    expect(state.matched).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/derived.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement derived wrapper**

```ts
// src/stamps/geometry-2d/ai/deterministic/derived.ts
//
// Wrap existing extractRequirements() (validator.ts) → mutate skeleton state
// in-place. Adds derived points (midpoint, perpFoot, centroid, ...) and
// supporting segments (e.g. AH for altitude).
//
// Duplicate-name check: if skeleton already has a point/shape with the same
// name, skip injection (skeleton wins — caller may have explicit override).

import type { DslPointT, DslShapeT } from '../../dsl/schema';
import { extractRequirements } from '../validator';

interface DerivedState {
  points: DslPointT[];
  shapes: DslShapeT[];
  matched: string[];
}

export function applyDerived(prompt: string, state: DerivedState): void {
  const ex = extractRequirements(prompt);

  for (const stub of ex.points) {
    if (state.points.some((p) => p.name === stub.name)) continue;
    state.points.push({ name: stub.name, kind: stub.kind, ...stub.fields } as DslPointT);
  }
  for (const stub of ex.shapes) {
    if (state.shapes.some((s) => s.name === stub.name)) continue;
    state.shapes.push({ name: stub.name, kind: stub.kind, ...stub.fields } as DslShapeT);
  }

  // Categorize for confidence labels.
  if (/trung\s*điểm/i.test(prompt)) state.matched.push('midpoint');
  if (/chân\s+(của\s+)?đường\s+(cao|vuông\s*góc)|hình\s*chiếu\s+vuông\s+góc/i.test(prompt))
    state.matched.push('altitude');
  if (/đường\s*cao\s+[A-Z]{2}/i.test(prompt)) state.matched.push('altitude');
  if (/trung\s*tuyến/i.test(prompt)) state.matched.push('median');
  if (/phân\s*giác/i.test(prompt)) state.matched.push('bisector');
  if (/trọng\s*tâm/i.test(prompt)) state.matched.push('centroid');
  if (/trực\s*tâm/i.test(prompt)) state.matched.push('orthocenter');
  if (/ngoại\s*tiếp/i.test(prompt)) state.matched.push('circumscribed');
  if (/nội\s*tiếp/i.test(prompt)) state.matched.push('inscribed');
  if (/tiếp\s*tuyến/i.test(prompt)) state.matched.push('tangent');
  if (/song\s*song/i.test(prompt)) state.matched.push('parallel');
  if (/vuông\s*góc/i.test(prompt)) state.matched.push('perpendicular');
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/derived.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/derived.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/derived.test.ts
git commit -m "feat(ai): deterministic — applyDerived wrap extractRequirements"
```

---

## Task 6: Confidence scoring

**Files:**
- Create: `src/stamps/geometry-2d/ai/deterministic/confidence.ts`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/confidence.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/ai/deterministic/__tests__/confidence.test.ts
import { scoreConfidence } from '../confidence';

describe('scoreConfidence', () => {
  test('full coverage → 1.0', () => {
    const c = scoreConfidence('Cho tam giác ABC, đường cao AH', ['triangle', 'altitude']);
    // 2 keyword (tam giác, đường cao) → both covered → 1.0
    expect(c).toBeCloseTo(1.0, 2);
  });

  test('partial coverage → fraction', () => {
    // "tam giác", "đường tròn Euler" — Euler không có pattern → 1/2 covered
    const c = scoreConfidence('tam giác ABC, đường tròn Euler', ['triangle']);
    // total keywords: "tam giác" (1) + "đường tròn" (1) = 2. matched ['triangle'] → 1 covered.
    expect(c).toBeCloseTo(0.5, 2);
  });

  test('no keywords → 0 (unparseable, force LLM)', () => {
    expect(scoreConfidence('Hello world', [])).toBe(0);
  });

  test('matched but no keywords in text → 1.0 fallback', () => {
    // Edge case: somehow matched but text has no recognized keyword.
    // Treat as parseable (perfect coverage of what was asked).
    expect(scoreConfidence('xyz', ['triangle'])).toBe(1.0);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/confidence.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement scoring**

```ts
// src/stamps/geometry-2d/ai/deterministic/confidence.ts
//
// Score: số keyword "đã handle" / số keyword "geometry-relevant" trong prompt.
// Threshold mặc định 0.85 — caller pass threshold qua opts.

import { countGeometryKeywords } from './vocabulary';

/** Mapping pattern label (skeleton/derived) → số keyword nó "đại diện". */
const LABEL_WEIGHT: Record<string, number> = {
  triangle: 1,
  'triangle-right': 1,        // "vuông tại" thêm 1 keyword
  'triangle-isoceles': 1,
  'triangle-equilateral': 1,
  rectangle: 1,
  square: 1,
  parallelogram: 1,
  'circle-cr': 2,             // "đường tròn" + "bán kính"
  midpoint: 1,
  altitude: 2,                // "đường cao" + possibly "chân"
  median: 1,
  bisector: 1,
  centroid: 1,
  orthocenter: 1,
  circumscribed: 1,
  inscribed: 1,
  tangent: 1,
  parallel: 1,
  perpendicular: 1,
};

export function scoreConfidence(prompt: string, matched: readonly string[]): number {
  const total = countGeometryKeywords(prompt);
  if (total === 0) {
    return matched.length > 0 ? 1.0 : 0;
  }
  let covered = 0;
  for (const label of matched) {
    covered += LABEL_WEIGHT[label] ?? 1;
  }
  return Math.min(1.0, covered / total);
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/confidence.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/confidence.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/confidence.test.ts
git commit -m "feat(ai): deterministic — scoreConfidence + LABEL_WEIGHT table"
```

---

## Task 7: parseDeterministic orchestrator

**Files:**
- Create: `src/stamps/geometry-2d/ai/deterministic/index.ts`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/parseDeterministic.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/ai/deterministic/__tests__/parseDeterministic.test.ts
import { parseDeterministic } from '../index';
import { transpile } from '../../../dsl';

describe('parseDeterministic', () => {
  test('"Cho tam giác ABC, đường cao AH" → ok + confidence ≥ 0.85', () => {
    const r = parseDeterministic('Cho tam giác ABC, đường cao AH');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
    expect(r.dsl.points.map((p) => p.name).sort()).toEqual(['A', 'B', 'C', 'H']);
    // DSL phải transpile được
    const trans = transpile(r.dsl);
    expect(trans.ok).toBe(true);
  });

  test('"đường tròn Euler tam giác ABC" → low confidence, miss', () => {
    const r = parseDeterministic('vẽ đường tròn Euler của tam giác ABC');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.confidence).toBeLessThan(0.85);
    expect(r.reason).toBe('low-confidence');
  });

  test('threshold override 0.5 lets through partial coverage', () => {
    const r = parseDeterministic('vẽ đường tròn Euler của tam giác ABC', { threshold: 0.5 });
    expect(r.ok).toBe(true);
  });

  test('empty problem → miss with confidence 0', () => {
    const r = parseDeterministic('');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.confidence).toBe(0);
  });

  test('"(O; R=3), từ điểm A ngoài (O) kẻ hai tiếp tuyến AB, AC (B, C là tiếp điểm)" → tangent ext hit', () => {
    const r = parseDeterministic(
      'Cho đường tròn (O; R=3) và điểm A nằm ngoài (O). Từ A kẻ hai tiếp tuyến AB, AC (B, C là hai tiếp điểm).',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Tangent ext qua extractRequirements (scope='tangent-from-external')
    expect(r.dsl.points.some((p) => p.kind === 'tangentPointExt')).toBe(true);
    expect(r.dsl.shapes.some((s) => s.kind === 'tangent')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/parseDeterministic.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement orchestrator**

```ts
// src/stamps/geometry-2d/ai/deterministic/index.ts
//
// Public API: parseDeterministic(problem, opts) → DSL hoàn chỉnh nếu confidence
// ≥ threshold (default 0.85), else miss (caller fallback LLM).
//
// Pipeline: skeleton → derived → confidence. Skeleton emit base shapes; derived
// wrap extractRequirements() để add derived points + supporting segments.

import type { DslInputT, DslPointT, DslShapeT } from '../../dsl/schema';
import { applyDerived } from './derived';
import { parseSkeleton } from './skeleton';
import { scoreConfidence } from './confidence';

export interface ParseOptions {
  /** Confidence threshold để decide hit/miss. Default 0.85. */
  threshold?: number;
}

export type ParseResult =
  | {
      ok: true;
      dsl: DslInputT;
      confidence: number;
      matched: readonly string[];
    }
  | {
      ok: false;
      reason: 'low-confidence' | 'empty';
      confidence: number;
      matched: readonly string[];
    };

const DEFAULT_THRESHOLD = 0.85;

export function parseDeterministic(
  problem: string,
  opts: ParseOptions = {},
): ParseResult {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const trimmed = problem.trim();
  if (!trimmed) {
    return { ok: false, reason: 'empty', confidence: 0, matched: [] };
  }

  const skel = parseSkeleton(trimmed);
  const state = {
    points: [...skel.points] as DslPointT[],
    shapes: [...skel.shapes] as DslShapeT[],
    matched: [...skel.matched],
  };
  applyDerived(trimmed, state);

  const confidence = scoreConfidence(trimmed, state.matched);
  if (confidence < threshold) {
    return { ok: false, reason: 'low-confidence', confidence, matched: state.matched };
  }

  // Build DslInputT envelope.
  const dsl: DslInputT = {
    version: 1,
    points: state.points,
    shapes: state.shapes,
  };
  return { ok: true, dsl, confidence, matched: state.matched };
}

export type { SkeletonResult } from './skeleton';
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx jest src/stamps/geometry-2d/ai/deterministic/__tests__/parseDeterministic.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/index.ts \
        src/stamps/geometry-2d/ai/deterministic/__tests__/parseDeterministic.test.ts
git commit -m "feat(ai): deterministic — parseDeterministic orchestrator"
```

---

## Task 8: Integrate fast path into handleGenerateFigure

**Files:**
- Modify: `src/stamps/geometry-2d/ai/handleGenerateFigure.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/handleGenerateFigure.test.ts`

- [ ] **Step 1: Write failing test for fast-path hit**

Read current `__tests__/handleGenerateFigure.test.ts` first to see existing test style. Then append:

```ts
import { parseDeterministic } from '../deterministic';

describe('handleGenerateFigure — deterministic fast path', () => {
  test('high-confidence problem skips LLM provider entirely', async () => {
    const providerCallSpy = jest.fn();
    const mockProvider = {
      name: 'mock', defaultModel: 'mock', call: providerCallSpy,
    };
    const r = await handleGenerateFigure(
      { problem: 'Cho tam giác ABC, đường cao AH' },
      { provider: mockProvider },
    );
    expect(r.ok).toBe(true);
    expect(providerCallSpy).not.toHaveBeenCalled();
  });

  test('low-confidence problem falls back to LLM', async () => {
    const providerCallSpy = jest.fn().mockResolvedValue({
      kind: 'error', message: 'mock-not-real-call',
    });
    const mockProvider = {
      name: 'mock', defaultModel: 'mock', call: providerCallSpy,
    };
    await handleGenerateFigure(
      { problem: 'vẽ đường tròn Euler của tam giác ABC' },
      { provider: mockProvider },
    );
    expect(providerCallSpy).toHaveBeenCalled();
  });

  test('useDeterministic=false always uses LLM', async () => {
    const providerCallSpy = jest.fn().mockResolvedValue({
      kind: 'error', message: 'mock',
    });
    await handleGenerateFigure(
      { problem: 'Cho tam giác ABC, đường cao AH' },
      { provider: { name: 'mock', defaultModel: 'mock', call: providerCallSpy }, useDeterministic: false },
    );
    expect(providerCallSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/handleGenerateFigure.test.ts`
Expected: 3 new tests FAIL (`useDeterministic` unknown option, fast-path not implemented).

- [ ] **Step 3: Implement fast path**

Edit `src/stamps/geometry-2d/ai/handleGenerateFigure.ts` — add imports at top:

```ts
import { transpile } from '../dsl';
import { parseDeterministic } from './deterministic';
```

Extend `HandleGenerateFigureOptions`:

```ts
export interface HandleGenerateFigureOptions extends GenerateOptions {
  // ... existing ...
  /**
   * Bật deterministic fast path. Default true. Set false để bypass cho A/B test
   * hoặc khi muốn force LLM (vd debug accuracy LLM).
   */
  useDeterministic?: boolean;
  /** Confidence threshold cho fast path. Default 0.85. */
  deterministicThreshold?: number;
}
```

Replace body of `handleGenerateFigure`:

```ts
export async function handleGenerateFigure(
  input: HandleGenerateFigureInput,
  opts: HandleGenerateFigureOptions = {},
): Promise<AiFigureUiResult> {
  const { onResult, maxAttempts: rawMax, useDeterministic, deterministicThreshold, ...generateOpts } = opts;

  // === Track A: deterministic fast path ===
  if (useDeterministic !== false) {
    const det = parseDeterministic(input.problem, {
      threshold: deterministicThreshold,
    });
    if (det.ok) {
      const trans = transpile(det.dsl);
      if (trans.ok) {
        // Emit synthetic GenerateResult cho telemetry consistency
        if (onResult) {
          try {
            onResult(
              {
                ok: true,
                state: trans.state,
                dsl: det.dsl,
                usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
                provider: 'deterministic',
                retries: 0,
              },
              0,
            );
          } catch { /* swallow */ }
        }
        return { ok: true, state: trans.state };
      }
      // Transpile fail → silent fall-through to LLM
    }
  }

  // === Track B: LLM path (existing logic) ===
  const maxAttempts = clampAttempts(rawMax ?? DEFAULT_MAX_ATTEMPTS);
  let lastResult: GenerateResult | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await generateFigure(input.problem, generateOpts);
    lastResult = result;
    if (onResult) {
      try { onResult(result, attempt); } catch { /* swallow */ }
    }
    if (result.ok) return { ok: true, state: result.state };
    if (result.reason === 'transpile_error' && attempt < maxAttempts) continue;
    break;
  }
  return mapErrorToUi(lastResult!);
}
```

- [ ] **Step 4: Run all handleGenerateFigure tests**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/handleGenerateFigure.test.ts`
Expected: PASS — new 3 tests + existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/handleGenerateFigure.ts \
        src/stamps/geometry-2d/ai/__tests__/handleGenerateFigure.test.ts
git commit -m "feat(ai): handleGenerateFigure — deterministic fast path before LLM"
```

---

## Task 9: Public API export

**Files:**
- Modify: `src/stamps/geometry-2d/ai/index.ts`

- [ ] **Step 1: Add export**

Append to `src/stamps/geometry-2d/ai/index.ts`:

```ts
// Deterministic fast-path API.
export {
  parseDeterministic,
  type ParseOptions,
  type ParseResult,
  type SkeletonResult,
} from './deterministic';
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/stamps/geometry-2d/ai/index.ts
git commit -m "feat(ai): export parseDeterministic + types"
```

---

## Task 10: Benchmark script

**Files:**
- Create: `scripts/bench-fast-path.ts`

- [ ] **Step 1: Implement bench**

```ts
// scripts/bench-fast-path.ts
//
// Đo latency của parseDeterministic trên 50 đề mẫu × 5 lần → p50, p95.
// Usage: npx tsx scripts/bench-fast-path.ts

import { parseDeterministic } from '../src/stamps/geometry-2d/ai/deterministic';

const SAMPLES = [
  'Cho tam giác ABC',
  'Cho tam giác ABC vuông tại A',
  'tam giác đều ABC',
  'tam giác ABC cân tại A',
  'Cho tam giác ABC, đường cao AH',
  'Cho tam giác ABC, M là trung điểm BC',
  'Cho tam giác ABC, vẽ trung tuyến AM',
  'Cho tam giác ABC, phân giác AD',
  'tam giác ABC nội tiếp đường tròn (O)',
  'tam giác ABC, tâm I nội tiếp tam giác',
  'tam giác ABC, trọng tâm G',
  'tam giác ABC, trực tâm H',
  'Cho đường tròn (O; R=3)',
  'đường tròn tâm O bán kính 5',
  'Cho hình chữ nhật ABCD',
  'Cho hình vuông ABCD',
  'Cho hình bình hành ABCD',
  'tam giác ABC, đường cao AH, M trung điểm BC',
  'Từ A ngoài (O; R=3), kẻ 2 tiếp tuyến AB, AC (B, C là tiếp điểm)',
  'tam giác ABC, đường tròn ngoại tiếp tâm O',
  // ... mở rộng đến 50 trong process iterate
];

const ITER = 5;

interface Sample {
  problem: string;
  durationsMs: number[];
  hit: boolean;
  confidence: number;
}

const results: Sample[] = SAMPLES.map((problem) => {
  const durations: number[] = [];
  let hit = false;
  let conf = 0;
  for (let i = 0; i < ITER; i++) {
    const t0 = performance.now();
    const r = parseDeterministic(problem);
    const t1 = performance.now();
    durations.push(t1 - t0);
    hit = r.ok;
    conf = r.confidence;
  }
  return { problem, durationsMs: durations, hit, confidence: conf };
});

const allDurations = results.flatMap((r) => r.durationsMs).sort((a, b) => a - b);
const p50 = allDurations[Math.floor(allDurations.length * 0.5)];
const p95 = allDurations[Math.floor(allDurations.length * 0.95)];
const hitRate = results.filter((r) => r.hit).length / results.length;

console.log(`\n=== bench-fast-path ===`);
console.log(`Samples: ${SAMPLES.length} × ${ITER} = ${allDurations.length} runs`);
console.log(`p50: ${p50.toFixed(3)}ms | p95: ${p95.toFixed(3)}ms`);
console.log(`Hit rate (confidence ≥ 0.85): ${(hitRate * 100).toFixed(1)}%`);
console.log();
for (const r of results) {
  const avg = r.durationsMs.reduce((a, b) => a + b, 0) / r.durationsMs.length;
  console.log(
    `${r.hit ? '✓' : '✗'} ${avg.toFixed(2)}ms (conf=${r.confidence.toFixed(2)}) — ${r.problem.slice(0, 60)}`,
  );
}
```

- [ ] **Step 2: Run bench**

Run: `npx tsx scripts/bench-fast-path.ts`
Expected: hit rate ≥ 60%, p95 < 5ms.

- [ ] **Step 3: Commit (only commit script, bench output not committed)**

```bash
git add scripts/bench-fast-path.ts
git commit -m "feat(ai): bench-fast-path — measure parseDeterministic p50/p95"
```

---

## **Track A PR boundary** — push & open PR

- [ ] **Step 1: Push branch**

```bash
git push origin main
```

(Or feature branch if using PR workflow.)

- [ ] **Step 2: Verify all tests + typecheck**

```bash
npm test
npm run typecheck
```

Expected: all green.

---

# TRACK B — LLM call flow optimization

## Task 11: Slim system prompt

**Files:**
- Create: `src/stamps/geometry-2d/ai/promptSlim.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/promptSlim.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/ai/__tests__/promptSlim.test.ts
import { buildSystemPromptSlim } from '../promptSlim';

describe('buildSystemPromptSlim', () => {
  test('produces prompt under 8000 chars (~2k tok)', () => {
    const p = buildSystemPromptSlim();
    expect(p.length).toBeLessThan(8000);
  });

  test('includes core mandatory rules', () => {
    const p = buildSystemPromptSlim();
    expect(p).toContain('BẮT BUỘC');
    expect(p).toContain('midpoint');
    expect(p).toContain('perpFoot');
    expect(p).toContain('circle3');
  });

  test('includes exactly 5 fixtures', () => {
    const p = buildSystemPromptSlim();
    const exampleCount = (p.match(/### Ví dụ \d+/g) ?? []).length;
    expect(exampleCount).toBe(5);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/promptSlim.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement slim prompt**

```ts
// src/stamps/geometry-2d/ai/promptSlim.ts
//
// Slim variant của buildSystemPrompt() — chỉ 5 fixture core thay vì 21.
// Mục tiêu: 6.5k → ~1.8k token cho fallback path Claude Agent SDK / Ollama
// (không có prompt cache native).
//
// 5 fixture chosen để đại diện:
//   1. triangle-altitude   → derived (perpFoot + segments)
//   2. triangle-circumcircle → circle3 + circumcenter
//   3. triangle-incircle   → incircle + tangencyPoint (Tier 4)
//   4. tangent-from-external-named → tangent ngoài (Tier 4)
//   5. parallelogram       → tứ giác

import { fixture as alt } from '../dsl/fixtures/triangle-altitude';
import { fixture as cc } from '../dsl/fixtures/triangle-circumcircle';
import { fixture as ic } from '../dsl/fixtures/triangle-incircle';
import { fixture as tanExt } from '../dsl/fixtures/tangent-from-external-named';
import { fixture as par } from '../dsl/fixtures/parallelogram';

const FIXTURES = [alt, cc, ic, tanExt, par];

export function buildSystemPromptSlim(): string {
  const examples = FIXTURES.map((f, i) =>
    `### Ví dụ ${i + 1}
**Đề:** ${f.problem}
**Output:**
${JSON.stringify({ decision: 'build', figure: f.dsl }, null, 2)}`,
  ).join('\n\n');

  return `Bạn là trợ lý vẽ hình học 2D cho học sinh Việt Nam.

## Nhiệm vụ
Đọc đề tiếng Việt → emit JSON envelope mô tả hình. Hệ thống render từ DSL.

## Output format (CHỈ JSON)
{ "decision": "build", "figure": { /* DSL */ } }
hoặc
{ "decision": "refuse", "reason": "..." }

## ⚠️ BẮT BUỘC — Từ khoá → kind

| Đề có | BẮT BUỘC kind |
|---|---|
| "trung điểm" | point kind:"midpoint" {p1, p2} |
| "chân đường cao" / "hình chiếu vuông góc" | point kind:"perpFoot" {from, onLine} |
| "trọng tâm" | point kind:"centroid" {vertices:[A,B,C]} |
| "trực tâm" | point kind:"orthocenter" {vertices} |
| "tâm nội tiếp" | point kind:"incenter" {vertices} |
| "ngoại tiếp" (tâm) | point kind:"circumcenter" {vertices} |
| "đường tròn ngoại tiếp tam giác" | shape kind:"circle3" {p1,p2,p3} |
| "phân giác" | shape kind:"angleBisector" {p1,vertex,p2} |
| "trung trực" | shape kind:"perpBisector" {p1,p2} |
| "tiếp tuyến tại/từ" | shape kind:"tangent" {throughPoint,toCircle} |
| "B, C là tiếp điểm" (từ điểm ngoài) | point kind:"tangentPointExt" {from,circle,which:0|1} |
| "tiếp xúc BC tại D" (incircle) | point kind:"tangencyPoint" {circle,onLine} |
| "(O; R=3)" / "bán kính N" | shape kind:"circleCR" {center,radius} |
| "đường tròn nội tiếp tam giác" | shape kind:"incircle" {vertices} |
| "qua ... song song ..." | shape kind:"parallel" {throughPoint,toLine} |
| "qua ... vuông góc ..." | shape kind:"perpendicular" |
| "giao điểm" | point kind:"intersection" {ref1,ref2} |

TUYỆT ĐỐI KHÔNG dùng kind:"free" với coord tự compute cho các trường hợp trên.

## ⚠️ Tam giác bất kỳ KHÔNG vuông tại gốc
"tam giác ABC" → scalene template: A(0,3), B(-2,0), C(3,0). KHÔNG A(0,0) + 2 cạnh trên trục.
Chỉ A(0,0) khi đề nói rõ "vuông tại A".

## Quy tắc
1. Vẽ được → decision="build" + figure DSL đầy đủ.
2. Đại số / 3D / phép biến hình lớp 11+ → decision="refuse".
3. Mọi point có ràng buộc hình học → derived kind. "free" chỉ cho điểm gốc.
4. Topological order: free → derived → shape. KHÔNG forward-ref.

## Primitives
**Points:** free, midpoint, onSegment, onLine, onCircle, perpFoot, circumcenter, incenter, centroid, orthocenter, intersection, secondIntersection, circleIntersection, tangencyPoint, tangentPointExt
**Shapes:** segment, line, ray, polygon, perpendicular, parallel, perpBisector, angleBisector, tangent, circleCP, circleCR, circle3, incircle

## ${FIXTURES.length} ví dụ
${examples}

Trả về CHỈ 1 JSON object đúng schema. Không lời dẫn, không markdown fence.`;
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/promptSlim.test.ts`
Expected: PASS — 3 tests

Also verify size:
```bash
npx tsx -e "import {buildSystemPromptSlim} from './src/stamps/geometry-2d/ai/promptSlim'; const p = buildSystemPromptSlim(); console.log('chars:', p.length, 'tok≈', Math.round(p.length/4));"
```
Expected: chars ~6000-7500, tok ≈ 1500-1900.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/promptSlim.ts \
        src/stamps/geometry-2d/ai/__tests__/promptSlim.test.ts
git commit -m "feat(ai): promptSlim — 5 fixtures, ~1.8k tok (vs full 6.5k)"
```

---

## Task 12: `promptVariant` option in buildFigure

**Files:**
- Modify: `src/stamps/geometry-2d/ai/buildFigure.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts`

- [ ] **Step 1: Write failing test**

Append to `buildFigure.test.ts`:

```ts
describe('generateFigure — promptVariant', () => {
  test('default uses slim prompt', async () => {
    let captured = '';
    const provider = {
      name: 'mock', defaultModel: 'm',
      call: async (req: { systemPrompt: string }) => {
        captured = req.systemPrompt;
        return { kind: 'error', message: 'mock' } as const;
      },
    };
    await generateFigure('Cho tam giác ABC', { provider });
    // Slim < 8000 chars
    expect(captured.length).toBeLessThan(8000);
  });

  test('promptVariant=full uses full prompt (21 fixtures)', async () => {
    let captured = '';
    const provider = {
      name: 'mock', defaultModel: 'm',
      call: async (req: { systemPrompt: string }) => {
        captured = req.systemPrompt;
        return { kind: 'error', message: 'mock' } as const;
      },
    };
    await generateFigure('Cho tam giác ABC', { provider, promptVariant: 'full' });
    expect(captured.length).toBeGreaterThan(20000);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts`
Expected: FAIL — `promptVariant` unknown.

- [ ] **Step 3: Implement option**

Edit `buildFigure.ts`:

```ts
import { buildSystemPrompt } from './prompt';
import { buildSystemPromptSlim } from './promptSlim';
```

Extend `GenerateOptions`:

```ts
export interface GenerateOptions extends SelectProviderOptions {
  // ... existing ...
  /**
   * Prompt variant. 'slim' (~1.8k tok, 5 fixtures, default) hoặc 'full'
   * (~6.5k tok, 21 fixtures). 'full' giữ lại cho debug / khi eval cho thấy
   * accuracy drop > 5%.
   */
  promptVariant?: 'full' | 'slim';
}
```

Replace `const systemPrompt = buildSystemPrompt();` with:

```ts
const systemPrompt = (opts.promptVariant === 'full')
  ? buildSystemPrompt()
  : buildSystemPromptSlim();
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts`
Expected: PASS — new + existing tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/buildFigure.ts \
        src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts
git commit -m "feat(ai): generateFigure — promptVariant option (slim default)"
```

---

## Task 13: `onToken` callback type

**Files:**
- Modify: `src/stamps/geometry-2d/ai/providers/types.ts`

- [ ] **Step 1: Add field**

Edit `types.ts` — extend `ProviderRequest`:

```ts
export interface ProviderRequest {
  systemPrompt: string;
  userPrompt: string;
  schema: Record<string, unknown>;
  model: string;
  maxTokens: number;
  signal?: AbortSignal;
  /**
   * Optional callback nhận text chunk khi provider stream incremental output.
   * Provider không stream được (Anthropic tool_use, Claude CLI) → không gọi.
   * Caller dùng để cập nhật UI progress (token count).
   */
  onToken?: (chunk: string) => void;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors (existing providers ignore the new optional field).

- [ ] **Step 3: Commit**

```bash
git add src/stamps/geometry-2d/ai/providers/types.ts
git commit -m "feat(ai): ProviderRequest.onToken — token-level streaming hook"
```

---

## Task 14: claude-agent-sdk emit onToken + memoize schema

**Files:**
- Modify: `src/stamps/geometry-2d/ai/providers/claude-agent-sdk.ts`
- Test: `src/stamps/geometry-2d/ai/providers/__tests__/claude-agent-sdk.test.ts` (existing or create if absent)

- [ ] **Step 1: Check existing tests**

Run: `ls src/stamps/geometry-2d/ai/providers/__tests__/`
If `claude-agent-sdk.test.ts` exists, append. Else create.

- [ ] **Step 2: Write failing test**

```ts
// src/stamps/geometry-2d/ai/providers/__tests__/claude-agent-sdk.test.ts (append or create)
import { ClaudeAgentSdkProvider } from '../claude-agent-sdk';

describe('ClaudeAgentSdkProvider — onToken', () => {
  test('emits onToken for each assistant text block', async () => {
    const chunks: string[] = [];
    const queryImpl = async function* () {
      yield {
        type: 'assistant' as const,
        message: { content: [{ type: 'text' as const, text: 'hello ' }] },
      };
      yield {
        type: 'assistant' as const,
        message: { content: [{ type: 'text' as const, text: 'world' }] },
      };
      yield { type: 'result' as const, subtype: 'success' as const };
    };
    const p = new ClaudeAgentSdkProvider({ queryImpl: queryImpl as never });

    // assistant text needs to be JSON for outer parse → use single block that is valid JSON
    // Actually since we're testing onToken emission, not final parse — we accept parse_error.
    await p.call({
      systemPrompt: 'sys',
      userPrompt: 'usr',
      schema: { type: 'object' } as never,
      model: 'm',
      maxTokens: 100,
      onToken: (c) => chunks.push(c),
    });

    expect(chunks).toEqual(['hello ', 'world']);
  });
});
```

- [ ] **Step 3: Run test, verify fail**

Run: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/claude-agent-sdk.test.ts`
Expected: FAIL — `chunks` empty.

- [ ] **Step 4: Implement onToken emission + memoize schema**

Edit `claude-agent-sdk.ts`:

Add module-level memo for schema serialization:

```ts
const SCHEMA_CACHE = new WeakMap<object, string>();

function memoSchemaJson(schema: object): string {
  let s = SCHEMA_CACHE.get(schema);
  if (s) return s;
  s = JSON.stringify(schema, null, 2);
  SCHEMA_CACHE.set(schema, s);
  return s;
}
```

Replace `const schemaText = JSON.stringify(req.schema, null, 2);` with:

```ts
const schemaText = memoSchemaJson(req.schema as object);
```

In the `for await (const msg of query(...))` loop, inside the `if (msg.type === 'assistant')` block, after `assistantText += b.text;` add:

```ts
              if (req.onToken) {
                try { req.onToken(b.text); } catch { /* swallow */ }
              }
```

- [ ] **Step 5: Run test, verify pass**

Run: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/claude-agent-sdk.test.ts`
Expected: PASS — onToken test + any existing tests.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/ai/providers/claude-agent-sdk.ts \
        src/stamps/geometry-2d/ai/providers/__tests__/claude-agent-sdk.test.ts
git commit -m "feat(ai): claude-agent-sdk — onToken streaming + memoize schema serialize"
```

---

## Task 15: Ollama provider stream + onToken

**Files:**
- Modify: `src/stamps/geometry-2d/ai/providers/ollama.ts`
- Test: `src/stamps/geometry-2d/ai/providers/__tests__/ollama.test.ts` (existing)

- [ ] **Step 1: Write failing test**

Append to ollama.test.ts (find existing file first):

```ts
describe('OllamaProvider — onToken streaming', () => {
  test('emits onToken per NDJSON chunk', async () => {
    const chunks: string[] = [];
    const ndjson = [
      JSON.stringify({ message: { content: 'hel' }, done: false }),
      JSON.stringify({ message: { content: 'lo' }, done: false }),
      JSON.stringify({ message: { content: '' }, done: true, prompt_eval_count: 10, eval_count: 5 }),
    ].join('\n') + '\n';

    const fakeFetch = jest.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(ndjson));
          controller.close();
        },
      }),
    });

    const provider = new OllamaProvider({ fetchImpl: fakeFetch as never });
    await provider.call({
      systemPrompt: 's', userPrompt: 'u',
      schema: { type: 'object' } as never,
      model: 'gemma3:4b', maxTokens: 100,
      onToken: (c) => chunks.push(c),
    });

    expect(chunks).toEqual(['hel', 'lo']);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/ollama.test.ts`
Expected: FAIL.

- [ ] **Step 3: Switch Ollama to stream mode**

Edit `ollama.ts` — replace `call()` body. Key change: `stream: true`, parse NDJSON, accumulate content, emit onToken per chunk:

```ts
async call(req: ProviderRequest): Promise<ProviderOutput> {
  const body = {
    model: req.model,
    messages: [
      { role: 'system', content: req.systemPrompt },
      { role: 'user', content: req.userPrompt },
    ],
    format: req.schema,
    stream: true,  // CHANGED
    options: { num_predict: req.maxTokens, temperature: 0.2 },
  };

  let doFetch: typeof fetch;
  try {
    doFetch = this.resolveFetch();
  } catch (e) {
    return { kind: 'error', message: (e as { message?: string }).message ?? 'fetch không khả dụng' };
  }

  let resp: Response;
  try {
    resp = await doFetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: req.signal,
    });
  } catch (e) {
    return {
      kind: 'error',
      message: (e as { message?: string }).message ?? `Không kết nối được Ollama ở ${this.baseUrl}`,
    };
  }

  if (!resp.ok || !resp.body) {
    let detail = '';
    try { detail = await resp.text(); } catch { /* */ }
    return {
      kind: 'error',
      message: `Ollama HTTP ${resp.status}: ${detail || resp.statusText}`,
      status: resp.status,
    };
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let promptEvalCount = 0;
  let evalCount = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const chunk = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
          prompt_eval_count?: number;
          eval_count?: number;
        };
        if (chunk.message?.content) {
          content += chunk.message.content;
          if (req.onToken) {
            try { req.onToken(chunk.message.content); } catch { /* swallow */ }
          }
        }
        if (chunk.done) {
          promptEvalCount = chunk.prompt_eval_count ?? promptEvalCount;
          evalCount = chunk.eval_count ?? evalCount;
        }
      } catch { /* skip malformed line */ }
    }
  }

  const trimmed = content.trim();
  if (!trimmed) return { kind: 'error', message: 'Ollama trả content rỗng' };

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch (e) {
    return {
      kind: 'error',
      message: 'Ollama content không parse được JSON: ' + ((e as { message?: string }).message ?? '?'),
    };
  }

  return {
    kind: 'json',
    data,
    usage: {
      inputTokens: promptEvalCount,
      outputTokens: evalCount,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    },
  };
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/ollama.test.ts`
Expected: PASS — new test + all existing tests (mock fetch was returning whole response.json() before; existing tests may need adjustment for stream).

If existing tests break due to assumption of non-stream: update them to use the new NDJSON stream mock pattern.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/providers/ollama.ts \
        src/stamps/geometry-2d/ai/providers/__tests__/ollama.test.ts
git commit -m "feat(ai): ollama — stream:true + onToken emission"
```

---

## Task 16: Default provider → claude-agent-sdk

**Files:**
- Modify: `src/stamps/geometry-2d/ai/providers/index.ts`
- Test: `src/stamps/geometry-2d/ai/providers/__tests__/index.test.ts` (existing or create)

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/ai/providers/__tests__/index.test.ts
import { selectProvider } from '../index';

describe('selectProvider defaults', () => {
  test('no env → claude-agent-sdk', () => {
    const p = selectProvider({ env: {} });
    expect(p.name).toBe('claude-agent-sdk');
  });

  test('explicit WHITEBOARD_AI_PROVIDER=ollama → ollama', () => {
    const p = selectProvider({ env: { WHITEBOARD_AI_PROVIDER: 'ollama' } });
    expect(p.name).toBe('ollama');
  });
});
```

- [ ] **Step 2: Run test, verify first case fails**

Run: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/index.test.ts`
Expected: first test FAIL (current default = ollama).

- [ ] **Step 3: Switch default**

Edit `providers/index.ts:61` — change:

```ts
  const wanted = (env.WHITEBOARD_AI_PROVIDER ?? 'ollama').toLowerCase();
```

to:

```ts
  const wanted = (env.WHITEBOARD_AI_PROVIDER ?? 'claude-agent-sdk').toLowerCase();
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/index.test.ts`
Expected: PASS.

Also re-run all provider tests:
```bash
npx jest src/stamps/geometry-2d/ai/providers
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/providers/index.ts \
        src/stamps/geometry-2d/ai/providers/__tests__/index.test.ts
git commit -m "feat(ai): default provider claude-agent-sdk (was ollama)"
```

---

## Task 17: Update CLAUDE.md doc + demo plugin

**Files:**
- Modify: `CLAUDE.md`
- Modify: `scripts/demo/aiMiddlewarePlugin.ts`

- [ ] **Step 1: Update CLAUDE.md AI providers section**

Find the section starting with `**AI providers (DSL/Intent gen)**:` and change:

```
- `ollama` — local Gemma 3 4B/12B, free, cần `ollama serve` (default lib, demo override sang claude-agent-sdk)
```

to:

```
- `ollama` — local Gemma 3 4B/12B, free, cần `ollama serve` (fallback dev offline)
```

And update the leading line to indicate `claude-agent-sdk` is the default:

```
- **AI providers (DSL/Intent gen)**: 4 options qua `WHITEBOARD_AI_PROVIDER` env. **Default = `claude-agent-sdk`** (Sonnet 4.6 OAuth subscription, Team plan OK production):
```

Also update `aiMiddlewarePlugin.ts:68` log comment:

Edit lines around 67-68:

```ts
const wantedProvider = (process.env.WHITEBOARD_AI_PROVIDER ?? 'claude-agent-sdk').toLowerCase();
```

(Match the new default.) Also at lines 279, 329 — apply same change.

- [ ] **Step 2: Run dev demo manually (sanity)**

```bash
npm run dev
```

Open playground (http://localhost:5173 or similar), type "Cho tam giác ABC, đường cao AH", verify response < 1s (deterministic hit).

Try "vẽ đường tròn Euler tam giác ABC" → falls back to claude-agent-sdk (if OAuth setup); else expect api_error.

(This step is manual verification; no automated test.)

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md scripts/demo/aiMiddlewarePlugin.ts
git commit -m "docs+demo: default WHITEBOARD_AI_PROVIDER=claude-agent-sdk"
```

---

## Task 18: Final integration test + typecheck

**Files:**
- (no new files)

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all green.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Run bench**

```bash
npx tsx scripts/bench-fast-path.ts
```

Expected: hit rate ≥ 60%, p95 < 5ms.

- [ ] **Step 4: Build dist**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 5: Final commit (if any straggling fixes)**

If anything broke, fix + commit. Else skip.

---

## **Track B PR boundary** — push

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Bump version + release**

```bash
npm version minor   # 0.26.1 → 0.27.0
npm publish --access public
git push --follow-tags
```

---

# Self-review checklist (run after writing plan)

✅ **Spec coverage:**
- Track A: tasks 1-10 cover skeleton (3 shape families), derived (extractRequirements wrap), confidence, orchestrator, integration, exports, bench. ✓
- Track B: tasks 11-17 cover slim prompt, variant option, onToken type, agent-sdk impl, ollama stream impl, default switch, doc. ✓
- Track C: deferred per spec. ✓
- Error handling: fast-path transpile fail falls through silently (task 8 step 3). ✓
- Testing: each task has TDD; bench script measures p50/p95 (task 10). ✓
- Performance targets: bench enforces ≥ 60% hit rate + p95 < 5ms (task 18). ✓

✅ **Placeholder scan:**
- No "TBD", "TODO", "implement appropriately" — each step has concrete code/command. ✓
- Exception: "expand to 50 samples" in bench script (task 10) — acceptable since 20 starter samples + iterate during use, not a blocker for shipping. ✓

✅ **Type consistency:**
- `parseDeterministic` signature: same in tasks 7, 8, 9. ✓
- `SkeletonResult.matched: string[]` — used consistently in tasks 2, 3, 4, 5, 6, 7. ✓
- `ProviderRequest.onToken` — defined task 13, used in tasks 14, 15. Same signature `(chunk: string) => void`. ✓
- `GenerateOptions.promptVariant` — defined + used in task 12. ✓
- `HandleGenerateFigureOptions.useDeterministic` / `deterministicThreshold` — defined + used in task 8. ✓
