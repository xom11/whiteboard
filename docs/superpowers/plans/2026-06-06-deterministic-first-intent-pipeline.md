# Deterministic-first intent pipeline — Implementation Plan (Mức 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đảo trục dựng hình 2D thành deterministic-first — rule engine emit `IntentT[]`, escalate AI chỉ khi coverage không đầy đủ; kèm safety net ref-validation registry-driven ở transpile.

**Architecture:** Hai track hội tụ tại `IntentT[]`: Track A (rule engine deterministic) thử trước; nếu phủ hết clause hình học **và** transpile+verify pass thì dùng luôn, bỏ qua LLM. Track B (LLM hiện tại) là fallback. Dùng chung `normalizeIntents → intentsToDsl → transpile → verifyGeometry`.

**Tech Stack:** TypeScript strict, Zod, Jest 29 + ts-jest. Spec: `docs/superpowers/specs/2026-06-06-deterministic-first-intent-pipeline-design.md`.

---

## Nhóm 1 — Safety net: ref-validation registry-driven (issue #43 Phase 1)

### Task 1: Jest ignore `.claude/worktrees`

**Files:**
- Modify: `jest.config.js` (hoặc `package.json` jest block — kiểm tra file nào tồn tại)

- [ ] **Step 1:** Tìm jest config

Run: `cat jest.config.* 2>/dev/null; grep -n '"jest"' package.json`
Expected: thấy `testPathIgnorePatterns` hoặc chưa có.

- [ ] **Step 2:** Thêm ignore pattern

Thêm `'/.claude/worktrees/'` và `'/node_modules/'` vào `testPathIgnorePatterns`, và `modulePathIgnorePatterns: ['/.claude/worktrees/']` để tránh duplicate `package.json`/manual-mock collision.

- [ ] **Step 3:** Verify

Run: `npx jest --listTests 2>&1 | grep -c worktrees`
Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add jest.config.* package.json
git commit -m "chore(test): jest ignore .claude/worktrees tránh duplicate suite"
```

---

### Task 2: Thêm `RefSpec` / `RefRole` vào `DslKindModule`

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/kinds/_types.ts`

- [ ] **Step 1: Thêm type** (sau `KindCategory`, line 14)

```ts
/** Vai trò ref mà một field của kind yêu cầu — dùng cho validateRefs registry-driven. */
export type RefRole =
  | 'point'
  | 'line-like'
  | 'circle'
  | 'segment'
  | 'shape'
  | 'any-existing';

export interface RefSpec {
  /** Tên field trên entity chứa ref (vd 'from', 'circle', 'vertices'). */
  field: string;
  role: RefRole;
  /** field là mảng tên (vd vertices[]). */
  many?: boolean;
}
```

- [ ] **Step 2: Thêm field optional vào `DslKindModule`** (trong interface, sau `collectRefs`)

```ts
  /**
   * Khai báo ref requirements để validateRefs kiểm tra unknown/mismatch mà không
   * cần switch theo kind. Dạng hàm cho kind có ref phụ thuộc discriminated union
   * (vd pointAtDistance.distance). Kind chưa khai → validateRefs dùng legacy switch.
   */
  refSpecs?: readonly RefSpec[] | ((entity: TInput) => readonly RefSpec[]);
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (field optional, chưa ai dùng).

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/_types.ts
git commit -m "feat(dsl): RefSpec/RefRole + refSpecs optional trên DslKindModule"
```

---

### Task 3: `validateRefs` registry-driven (legacy switch làm fallback)

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/transpile/refs.ts`
- Test: `src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts`

- [ ] **Step 1: Viết test fail** (append vào file test)

```ts
import { transpile } from '../index';

describe('validateRefs registry-driven — kind mới', () => {
  const P = (over: object) => ({ name: 'X', kind: 'free', x: 0, y: 0, ...over });

  it('tangentPointExt.circle trỏ point → KIND_MISMATCH, không throw', () => {
    const dsl = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'T', kind: 'tangentPointExt', from: 'A', circle: 'B', which: 0 },
      ],
      shapes: [],
    };
    const r = transpile(dsl);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });

  it('tangentPointExt.circle unknown → UNKNOWN_REF, không throw', () => {
    const dsl = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'T', kind: 'tangentPointExt', from: 'A', circle: 'Z', which: 0 },
      ],
      shapes: [],
    };
    let r: ReturnType<typeof transpile>;
    expect(() => { r = transpile(dsl); }).not.toThrow();
    expect(r!.ok).toBe(false);
    if (!r!.ok) expect(r!.errors.some((e) => e.code === 'UNKNOWN_REF')).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts -t "kind mới" --runInBand`
Expected: FAIL — hiện `tangentPointExt` không có case → ok:true hoặc throw "emit: id not assigned for Z".

- [ ] **Step 3: Refactor `validateRefs`** — thêm registry pass trước legacy switch

Thêm import + role→predicate map ở đầu file (sau các helper isPointLike…):

```ts
import { KIND_REGISTRY } from '../registry';
import type { RefRole, RefSpec } from '../kinds/_types';

const ROLE_PREDICATE: Record<RefRole, (s: Symbol | undefined) => boolean> = {
  point: isPointLike,
  'line-like': isLineLike,
  circle: isCircleLike,
  segment: isSegmentExact,
  shape: (s) => !!s && s.role === 'shape',
  'any-existing': (s) => !!s,
};
const ROLE_EXPECTED: Record<RefRole, string> = {
  point: 'point', 'line-like': 'line-like', circle: 'circle',
  segment: 'segment', shape: 'shape', 'any-existing': 'tồn tại',
};
```

Trong `validateRefs`, trước 2 vòng switch, gom các entity đã được refSpecs xử lý để switch bỏ qua:

```ts
  const handledByRegistry = new Set<string>();

  const runSpecs = (owner: string, entity: any) => {
    const mod = KIND_REGISTRY.get(entity.kind);
    const raw = mod?.refSpecs;
    if (!raw) return false;
    const specs: readonly RefSpec[] = typeof raw === 'function' ? raw(entity) : raw;
    for (const spec of specs) {
      const val = entity[spec.field];
      const names: string[] = spec.many ? (val ?? []) : val == null ? [] : [val];
      names.forEach((refName, i) => {
        const field = spec.many ? `${spec.field}[${i}]` : spec.field;
        check(owner, field, refName, ROLE_PREDICATE[spec.role], ROLE_EXPECTED[spec.role]);
      });
    }
    handledByRegistry.add(owner);
    return true;
  };

  for (const p of dsl.points) runSpecs(p.name, p);
  for (const s of dsl.shapes) runSpecs(s.name, s);
```

Sau đó bọc 2 vòng switch hiện có để skip entity đã xử lý:

```ts
  for (const p of dsl.points) {
    if (handledByRegistry.has(p.name)) continue;
    switch (p.kind) { /* …giữ nguyên… */ }
  }
  for (const s of dsl.shapes) {
    if (handledByRegistry.has(s.name)) continue;
    switch (s.kind) { /* …giữ nguyên… */ }
  }
```

> Lưu ý: `check()` đang đóng (closure) trên `errors`/`symbols`, đặt `runSpecs` SAU khai báo `check`. Các kind cũ chưa có refSpecs vẫn đi đường switch như cũ → không regression.

- [ ] **Step 4: Thêm refSpecs cho `tangentPointExt`** để test pass

Modify `src/stamps/geometry-2d/dsl/kinds/points/tangentPointExt.ts` — thêm vào object module:

```ts
  refSpecs: [
    { field: 'from', role: 'point' },
    { field: 'circle', role: 'circle' },
  ],
```

- [ ] **Step 5: Run, verify pass**

Run: `npm test -- src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts --runInBand`
Expected: PASS toàn bộ (24 cũ + 2 mới).

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/dsl/transpile/refs.ts src/stamps/geometry-2d/dsl/kinds/points/tangentPointExt.ts src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts
git commit -m "feat(dsl): validateRefs registry-driven qua refSpecs + fix tangentPointExt (issue #43 repro 1+2)"
```

---

### Task 4: Backfill `refSpecs` cho các kind còn thiếu validate

**Files (modify từng module + 1 file test gom):**
- `src/stamps/geometry-2d/dsl/kinds/points/secondIntersection.ts` → `[{field:'line',role:'line-like'},{field:'circle',role:'circle'},{field:'other',role:'point'}]`
- `src/stamps/geometry-2d/dsl/kinds/points/circleIntersection.ts` → `[{field:'c1',role:'circle'},{field:'c2',role:'circle'}]`
- `src/stamps/geometry-2d/dsl/kinds/points/tangencyPoint.ts` → `[{field:'circle',role:'circle'},{field:'onLine',role:'line-like'}]`
- `src/stamps/geometry-2d/dsl/kinds/circles/circleCR.ts` → `[{field:'center',role:'point'}]`
- `src/stamps/geometry-2d/dsl/kinds/circles/incircle.ts` → `[{field:'vertices',role:'point',many:true}]`
- `src/stamps/geometry-2d/dsl/kinds/circles/excircle.ts` → `[{field:'vertices',role:'point',many:true}]`
- `src/stamps/geometry-2d/dsl/kinds/points/pointAtDistance.ts` → dạng hàm (distance là discriminated union):

```ts
  refSpecs: (e) => {
    const specs = [{ field: 'from', role: 'point' as const }, { field: 'through', role: 'point' as const }];
    if (e.distance.kind === 'circleRadius') return [...specs, { field: 'circle', role: 'circle' as const }];
    if (e.distance.kind === 'segmentLength') return [...specs]; // p1/p2 nằm trong distance, validate riêng nếu cần
    return specs;
  },
```

> `pointAtDistance.distance.segmentLength.{p1,p2}` là nested — refSpec phẳng không với tới. Để Mức 1 chỉ validate `from/through/circle`; nested segment refs defer (ghi TODO trong file). Không chặn bug chính.

- Test: `src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts`

- [ ] **Step 1: Viết test fail** cho từng kind (mỗi kind 1 `it`), pattern:

```ts
it('circleIntersection.c1 trỏ point → KIND_MISMATCH', () => {
  const dsl = { version: 1, points: [
    { name: 'A', kind: 'free', x: 0, y: 0 },
    { name: 'P', kind: 'circleIntersection', c1: 'A', c2: 'A', which: 0 },
  ], shapes: [] };
  const r = transpile(dsl);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
});
```

Lặp tương tự cho `secondIntersection.line`, `tangencyPoint.circle`, `circleCR.center` (center trỏ shape → mismatch), `incircle.vertices` (vertex trỏ shape → mismatch). Mỗi test dựng entity với ref sai kiểu.

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts --runInBand`
Expected: các test mới FAIL (chưa có refSpecs).

- [ ] **Step 3: Thêm refSpecs** vào 7 module theo bảng trên.

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: Typecheck + full suite nhanh**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/ src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts
git commit -m "feat(dsl): backfill refSpecs cho 7 kind mới (secondIntersection/circleIntersection/tangencyPoint/circleCR/incircle/excircle/pointAtDistance)"
```

---

## Nhóm 2 — Deterministic engine emit Intent[] + coverage

### Task 5: `coverage.ts` — segment clause + compute coverage

**Files:**
- Create: `src/stamps/geometry-2d/ai/deterministic/coverage.ts`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/coverage.test.ts`
- Dùng lại: `src/stamps/geometry-2d/ai/deterministic/vocabulary.ts` (`countGeometryKeywords`)

- [ ] **Step 1: Viết test fail**

```ts
import { segmentClauses, computeCoverage } from '../coverage';

describe('segmentClauses', () => {
  it('tách theo dấu chấm/phẩy/; và đánh dấu hasGeometry', () => {
    const cls = segmentClauses('Cho tam giác ABC. Gọi M là trung điểm BC. Hôm nay trời đẹp');
    expect(cls.length).toBe(3);
    expect(cls[0].hasGeometry).toBe(true);   // tam giác
    expect(cls[1].hasGeometry).toBe(true);   // trung điểm
    expect(cls[2].hasGeometry).toBe(false);  // văn xuôi
  });
});

describe('computeCoverage', () => {
  it('complete khi mọi clause hình học được match claim', () => {
    const cls = segmentClauses('Cho tam giác ABC. Gọi M là trung điểm BC');
    const matches = [
      { ruleId: 'triangle', clauseIds: [0], intents: [] },
      { ruleId: 'midpoint', clauseIds: [1], intents: [] },
    ];
    const cov = computeCoverage(cls, matches);
    expect(cov.complete).toBe(true);
    expect(cov.uncovered.length).toBe(0);
  });

  it('incomplete khi còn clause hình học chưa match', () => {
    const cls = segmentClauses('Cho tam giác ABC. Vẽ đường tròn ngoại tiếp');
    const matches = [{ ruleId: 'triangle', clauseIds: [0], intents: [] }];
    const cov = computeCoverage(cls, matches);
    expect(cov.complete).toBe(false);
    expect(cov.uncovered.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/stamps/geometry-2d/ai/deterministic/__tests__/coverage.test.ts --runInBand`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Implement `coverage.ts`**

```ts
// src/stamps/geometry-2d/ai/deterministic/coverage.ts
import { countGeometryKeywords } from './vocabulary';

export interface Clause { id: number; text: string; hasGeometry: boolean; }
export interface CoverageReport {
  complete: boolean;
  coveredClauseIds: number[];
  uncovered: Clause[];
  ratio: number;
}
interface MatchLike { clauseIds: number[]; }

export function segmentClauses(problem: string): Clause[] {
  return problem
    .split(/[.;\n]+|(?:,\s*(?=(?:Gọi|Vẽ|Kẻ|Cho|Lấy|Dựng|trên|với)\b))/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((text, id) => ({ id, text, hasGeometry: countGeometryKeywords(text) > 0 }));
}

export function computeCoverage(clauses: readonly Clause[], matches: readonly MatchLike[]): CoverageReport {
  const claimed = new Set<number>();
  for (const m of matches) for (const id of m.clauseIds) claimed.add(id);
  const geoClauses = clauses.filter((c) => c.hasGeometry);
  const uncovered = geoClauses.filter((c) => !claimed.has(c.id));
  const coveredClauseIds = geoClauses.filter((c) => claimed.has(c.id)).map((c) => c.id);
  return {
    complete: uncovered.length === 0 && geoClauses.length > 0,
    coveredClauseIds,
    uncovered,
    ratio: geoClauses.length === 0 ? 0 : coveredClauseIds.length / geoClauses.length,
  };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- src/stamps/geometry-2d/ai/deterministic/__tests__/coverage.test.ts --runInBand`
Expected: PASS. (Nếu split regex tách sai số clause, tinh chỉnh separator cho đúng 3/2.)

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/deterministic/coverage.ts src/stamps/geometry-2d/ai/deterministic/__tests__/coverage.test.ts
git commit -m "feat(ai): coverage model — segmentClauses + computeCoverage (deterministic-first gate)"
```

---

### Task 6: Rule registry types + engine + rule đầu tiên (triangle)

**Files:**
- Create: `src/stamps/geometry-2d/ai/rules/_types.ts`
- Create: `src/stamps/geometry-2d/ai/rules/registry.ts`
- Create: `src/stamps/geometry-2d/ai/rules/triangle.ts`
- Test: `src/stamps/geometry-2d/ai/rules/__tests__/triangle.test.ts`
- Test: `src/stamps/geometry-2d/ai/rules/__tests__/registry.test.ts`

- [ ] **Step 1: Viết test fail (triangle rule)**

```ts
import { triangleRule } from '../triangle';
import { segmentClauses } from '../../deterministic/coverage';

it('nhận "tam giác ABC" → draw-shape triangle any', () => {
  const clauses = segmentClauses('Cho tam giác ABC');
  const matches = triangleRule.match({ problem: 'Cho tam giác ABC', clauses });
  expect(matches.length).toBe(1);
  const intent = matches[0].intents[0];
  expect(intent.op).toBe('draw-shape');
  expect((intent as any).shape).toBe('triangle');
  expect((intent as any).vertices).toEqual(['A', 'B', 'C']);
  expect(matches[0].clauseIds).toContain(0);
});

it('nhận "tam giác ABC vuông tại A" → variant right-at-A', () => {
  const clauses = segmentClauses('Cho tam giác ABC vuông tại A');
  const m = triangleRule.match({ problem: 'Cho tam giác ABC vuông tại A', clauses });
  expect((m[0].intents[0] as any).variant).toBe('right-at-A');
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/stamps/geometry-2d/ai/rules/__tests__/triangle.test.ts --runInBand`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Implement `_types.ts`**

```ts
// src/stamps/geometry-2d/ai/rules/_types.ts
import type { IntentT } from '../intent';
import type { Clause } from '../deterministic/coverage';

export interface RuleContext { problem: string; clauses: readonly Clause[]; }
export interface RuleMatch { ruleId: string; clauseIds: number[]; intents: IntentT[]; }
export interface LanguageRule {
  id: string;
  priority: number;
  languages: readonly ('vi' | 'en')[];
  patterns: readonly RegExp[];
  match(ctx: RuleContext): RuleMatch[];
}
```

- [ ] **Step 4: Implement `triangle.ts`**

```ts
// src/stamps/geometry-2d/ai/rules/triangle.ts
import type { LanguageRule, RuleMatch } from './_types';

const TRI = /tam giác\s+([A-Z])([A-Z])([A-Z])/u;
const RIGHT_AT = /vuông\s+tại\s+([A-Z])/u;
const ISO_AT = /cân\s+tại\s+([A-Z])/u;
const EQUILATERAL = /(đều|equilateral)/u;

export const triangleRule: LanguageRule = {
  id: 'triangle',
  priority: 100,
  languages: ['vi'],
  patterns: [TRI],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = TRI.exec(c.text);
      if (!m) continue;
      const vertices = [m[1], m[2], m[3]];
      let variant: string = 'any';
      const ra = RIGHT_AT.exec(c.text);
      const iso = ISO_AT.exec(c.text);
      if (EQUILATERAL.test(c.text)) variant = 'equilateral';
      else if (ra && vertices.includes(ra[1])) variant = `right-at-${ra[1]}`;
      else if (iso && vertices.includes(iso[1])) variant = `isoceles-${vertices.filter((v) => v !== iso[1]).join('')}`;
      out.push({
        ruleId: 'triangle',
        clauseIds: [c.id],
        intents: [{ op: 'draw-shape', shape: 'triangle', variant, vertices } as any],
      });
    }
    return out;
  },
};
```

> Variant `isoceles-XY` phải khớp enum `TriangleVariantZ` (kiểm tra `intent.ts:24`). Nếu enum dùng `isoceles-BC` (2 đỉnh đáy) thì logic `filter !== apex` đã đúng. Verify bằng test step 6.

- [ ] **Step 5: Implement `registry.ts`**

```ts
// src/stamps/geometry-2d/ai/rules/registry.ts
import type { LanguageRule, RuleContext, RuleMatch } from './_types';
import { triangleRule } from './triangle';

export const ALL_RULES: readonly LanguageRule[] = [
  triangleRule,
].slice().sort((a, b) => b.priority - a.priority);

export function runRules(ctx: RuleContext): RuleMatch[] {
  const matches: RuleMatch[] = [];
  for (const rule of ALL_RULES) {
    if (!rule.patterns.some((p) => p.test(ctx.problem))) continue;
    matches.push(...rule.match(ctx));
  }
  return matches;
}
```

- [ ] **Step 6: Run, verify pass**

Run: `npm test -- src/stamps/geometry-2d/ai/rules/__tests__/ --runInBand`
Expected: PASS. (Sửa variant string nếu enum khác.)

- [ ] **Step 7: Commit**

```bash
git add src/stamps/geometry-2d/ai/rules/
git commit -m "feat(ai): rule registry + LanguageRule engine + triangle rule (emit IntentT[])"
```

---

### Task 7: Thêm rule module cho các construct đã hỗ trợ hôm nay

**Mục tiêu:** port phrasing đang được `validator.extractRequirements()` / `deterministic/skeleton.ts` nhận, sang rule module emit `IntentT[]`. Mỗi module = 1 file + 1 test, đăng ký vào `ALL_RULES`.

**Pattern mỗi module** (giống `triangle.ts`): regex → tạo `IntentT` → `clauseIds`. Ưu tiên `priority` để tránh overlap (vd `perpBisector "trung trực"` priority CAO hơn `midpoint "trung điểm"`).

Danh sách module + intent emit (mỗi cái 1 sub-task TDD):

- [ ] **midpoint** (`/trung điểm\s+([A-Z])([A-Z])/`, đặt tên điểm từ "Gọi/Lấy ([A-Z]) là") → `{op:'add-point', name, constraint:{kind:'midpoint', p1, p2}}`. priority 50.
- [ ] **cevian-altitude** (`/đường cao\s+([A-Z])([A-Z])/` hoặc "kẻ ... vuông góc") → perpFoot + connect. priority 60.
- [ ] **cevian-median / cevian-bisector** ("trung tuyến", "phân giác") → tương ứng. priority 60.
- [ ] **centers** ("trọng tâm"→centroid, "trực tâm"→orthocenter, "tâm đường tròn ngoại tiếp"→circumcenter, "tâm đường tròn nội tiếp"→incenter) → `add-point` với `vertices`. priority 70.
- [ ] **perpFoot** ("hình chiếu của X trên (đường thẳng) YZ") → `{constraint:{kind:'perpFoot', from, onLine}}`. priority 65.
- [ ] **incircle** ("đường tròn nội tiếp tam giác ABC") → `draw-circle inscribedIn` hoặc `incircle` kind. priority 70.
- [ ] **circle-center-radius** ("đường tròn (O; R)" / "(O) bán kính r") → `draw-circle centerRadius`. priority 75.
- [ ] **tangent-from-ext** ("tiếp tuyến từ điểm A đến đường tròn") → `draw-line tangentFromExt` + tangentPointExt. priority 65.
- [ ] **arc-midpoint** ("điểm chính giữa cung BC không chứa A") → `add-point arcMidpoint`. priority 60.
- [ ] **reflection** ("đối xứng của X qua Y") → `reflectPoint`/`reflectLine`. priority 55.
- [ ] **pointAtDistance** ("kéo dài AB ... lấy C sao cho BC = R/đoạn/số") → `add-point pointAtDistance`. priority 55.

Với MỖI module thực hiện đủ chu trình:
- [ ] Viết test (input VN → expected intent) → run FAIL
- [ ] Implement module + đăng ký `ALL_RULES`
- [ ] Run PASS
- [ ] Commit `feat(ai): rule <name> (deterministic intent)`

> **Lưu ý chống regression overlap:** sau khi thêm ≥3 module, viết 1 test `registry.test.ts` cho đề ghép ("Cho tam giác ABC. Gọi M là trung điểm BC. Gọi H là trực tâm") → `runRules` trả đúng 3 match, không trùng intent. Naming điểm ("Gọi X là …") cần helper `extractPointName(clause)` shared trong `rules/_shared.ts`.

---

### Task 8: `runDeterministicIntents` orchestrator

**Files:**
- Create: `src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents.ts`
- Test: `src/stamps/geometry-2d/ai/deterministic/__tests__/runDeterministicIntents.test.ts`

- [ ] **Step 1: Viết test fail**

```ts
import { runDeterministicIntents } from '../runDeterministicIntents';

it('đề phủ đủ → ok:true + intents', () => {
  const r = runDeterministicIntents('Cho tam giác ABC. Gọi M là trung điểm BC');
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.coverage.complete).toBe(true);
    expect(r.intents.length).toBeGreaterThanOrEqual(2);
  }
});

it('đề có clause lạ → ok:false incomplete-coverage', () => {
  const r = runDeterministicIntents('Cho tam giác ABC. Tính diện tích tam giác');
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.reason).toBe('incomplete-coverage');
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/stamps/geometry-2d/ai/deterministic/__tests__/runDeterministicIntents.test.ts --runInBand`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents.ts
import type { IntentT } from '../intent';
import { segmentClauses, computeCoverage, type CoverageReport } from './coverage';
import { runRules } from '../rules/registry';

export type DetIntentResult =
  | { ok: true; intents: IntentT[]; coverage: CoverageReport }
  | { ok: false; reason: 'incomplete-coverage' | 'no-match'; coverage: CoverageReport };

export function runDeterministicIntents(problem: string): DetIntentResult {
  const clauses = segmentClauses(problem);
  const matches = runRules({ problem, clauses });
  const coverage = computeCoverage(clauses, matches);
  if (matches.length === 0) return { ok: false, reason: 'no-match', coverage };
  if (!coverage.complete) return { ok: false, reason: 'incomplete-coverage', coverage };
  const intents = matches.flatMap((m) => m.intents);
  return { ok: true, intents, coverage };
}
```

- [ ] **Step 4: Run, verify pass** → PASS
- [ ] **Step 5: Commit** `feat(ai): runDeterministicIntents — rules + coverage gate → IntentT[]`

---

## Nhóm 3 — Router: wire Track A vào intent pipeline

### Task 9: Deterministic-first router trong `generateFigureIntent`

**Files:**
- Modify: `src/stamps/geometry-2d/ai/buildFigureIntent.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/buildFigureIntent.deterministic.test.ts`

- [ ] **Step 1: Viết test fail** (mock provider để chứng minh KHÔNG gọi LLM khi deterministic hit)

```ts
import { generateFigureIntent } from '../buildFigureIntent';

// Mock selectProvider để bắt việc provider.call có được gọi không.
const call = jest.fn();
jest.mock('../providers', () => ({   // path provider thật — chỉnh theo selectProvider import
  selectProvider: () => ({ name: 'mock', defaultModel: 'm', call }),
}));

it('đề deterministic-hit → provider:"deterministic", KHÔNG gọi LLM', async () => {
  const r = await generateFigureIntent('Cho tam giác ABC. Gọi M là trung điểm BC');
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.provider).toBe('deterministic');
  expect(call).not.toHaveBeenCalled();
});
```

> Kiểm tra đúng module path của `selectProvider` (xem import đầu `buildFigureIntent.ts`) trước khi viết `jest.mock`.

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/stamps/geometry-2d/ai/__tests__/buildFigureIntent.deterministic.test.ts --runInBand`
Expected: FAIL — hiện luôn gọi provider.

- [ ] **Step 3: Thêm Track A** đầu `generateFigureIntent` (trước `selectProvider`):

```ts
  // === Track A: deterministic-first ===
  if (opts.useDeterministic !== false) {
    const det = runDeterministicIntents(problem);
    if (det.ok && det.coverage.complete) {
      const norm = normalizeIntents(det.intents, problem);
      try {
        const dsl = intentsToDsl(norm);
        const tResult = transpile(dsl);
        if (tResult.ok) {
          const vReport = verifyGeometry(norm, dsl);
          if (vReport.ok) {
            return {
              ok: true, intents: norm, dsl, transpile: tResult, verify: vReport,
              usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
              provider: 'deterministic',
            };
          }
        }
      } catch { /* fall through to LLM */ }
    }
    // không hit → tiếp tục Track B
  }
```

Thêm import: `import { runDeterministicIntents } from './deterministic/runDeterministicIntents';` và mở rộng `GenerateIntentOptions` với `useDeterministic?: boolean`.

- [ ] **Step 4: Run, verify pass** → PASS. Chạy thêm test cũ `buildFigureIntent*.test.ts` đảm bảo không regression (đề khó vẫn gọi LLM mock).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/buildFigureIntent.ts src/stamps/geometry-2d/ai/__tests__/buildFigureIntent.deterministic.test.ts
git commit -m "feat(ai): deterministic-first router trong intent pipeline (Track A, issue #43)"
```

---

### Task 10: Verify toàn cục + eval nhanh

- [ ] **Step 1:** `npm test` — toàn bộ suite xanh.
- [ ] **Step 2:** `npm run typecheck` — PASS.
- [ ] **Step 3:** (nếu có Ollama/eval offline) chạy `npx tsx scripts/eval-intent.ts` đối chiếu: đề Tier 0–2 nên hit deterministic (provider:'deterministic'), đề Tier 4–5 escalate. Ghi kết quả vào `docs/superpowers/results/2026-06-06-deterministic-first.txt`.
- [ ] **Step 4: Commit** kết quả eval nếu có.

---

## Self-review (đã rà)

- **Spec coverage:** Track A router (Task 9) ✓, emit IntentT[] (Task 6-8) ✓, coverage escalation (Task 5,8) ✓, rule registry mở rộng (Task 6-7) ✓, ref-validation safety net (Task 1-4) ✓, jest worktrees (Task 1) ✓.
- **Type consistency:** `IntentT` (không phải `Intent`), `intentsToDsl(readonly IntentT[]): DslInputT`, `verifyGeometry(intents, dsl): VerifyReport` có `.ok`, `transpile(): TranspileResult` `{ok}|{ok:false,errors}`, `normalizeIntents(intents, problem)`, `CoverageReport`/`Clause`/`RuleMatch`/`LanguageRule` nhất quán giữa các task.
- **Defer rõ:** nested `pointAtDistance.distance.segmentLength` refs (Task 4 note); Mức 2 (fixture matrix VN/EN, capability matrix); Mức 3 (intent-builders/scene-handlers/finalize registry) tách issue riêng.
- **Rủi ro chính:** rule mis-parse báo coverage đủ → chặn bằng `verifyGeometry` + ref-validation (2 lớp guard). Overlap rule chặn bằng `priority` + registry overlap test (Task 7 note).
