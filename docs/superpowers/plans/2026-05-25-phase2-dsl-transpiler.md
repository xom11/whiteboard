# Phase 2.0 — DSL + Transpiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) hoặc `superpowers:executing-plans`. Steps dùng checkbox (`- [ ]`).

**Goal:** Xây Zod-validated DSL + transpiler `DSL → geometry-2d State`, không LLM, 9 fixture đề Việt Nam, ~84 tests pass.

**Architecture:** Module `src/stamps/geometry-2d/dsl/` (NOT trong `ai/`). DSL declarative JSON, transpiler 6-stage pipeline (schema → symbols → refs → cycles → ids → emit). Strict + collected errors. Public barrel `dsl/index.ts`.

**Tech Stack:** TypeScript strict, Zod (new dep), Jest 29 + jsdom + ts-jest, existing State types từ `src/core/scene/`.

**Spec:** `docs/superpowers/specs/2026-05-25-phase2-dsl-transpiler-design.md`

---

## File map

PR 1 (schema + errors + barrel + dep):
- Modify: `package.json` (add `zod` dep)
- Create: `src/stamps/geometry-2d/dsl/schema.ts`
- Create: `src/stamps/geometry-2d/dsl/transpile/errors.ts`
- Create: `src/stamps/geometry-2d/dsl/index.ts`
- Create: `src/stamps/geometry-2d/dsl/__tests__/schema.test.ts`

PR 2 (validation pipeline):
- Create: `src/stamps/geometry-2d/dsl/transpile/symbols.ts`
- Create: `src/stamps/geometry-2d/dsl/transpile/refs.ts`
- Create: `src/stamps/geometry-2d/dsl/transpile/cycles.ts`
- Create: `src/stamps/geometry-2d/dsl/transpile/ids.ts`
- Create: `src/stamps/geometry-2d/dsl/__tests__/transpile.symbols.test.ts`
- Create: `src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts`
- Create: `src/stamps/geometry-2d/dsl/__tests__/transpile.cycles.test.ts`

PR 3 (emit + orchestrator):
- Create: `src/stamps/geometry-2d/dsl/transpile/emitPoint.ts`
- Create: `src/stamps/geometry-2d/dsl/transpile/emitShape.ts`
- Create: `src/stamps/geometry-2d/dsl/transpile.ts`
- Modify: `src/stamps/geometry-2d/dsl/index.ts` (export real transpile)
- Create: `src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts`

PR 4 (fixtures + integration tests):
- Create: 9 × `src/stamps/geometry-2d/dsl/fixtures/<name>.ts`
- Create: `src/stamps/geometry-2d/dsl/__tests__/transpile.fixtures.test.ts`

---

## PR 1 — DSL Zod schema + error type + barrel

### Task 1.1: Add `zod` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add zod to `dependencies`**

Edit `package.json` "dependencies" block. Add `"zod": "^3.23.8"` alphabetically before `pdfjs-dist`:

```json
  "dependencies": {
    "immer": "^10.2.0",
    "pdfjs-dist": "^5.7.284",
    "zod": "^3.23.8"
  }
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: no errors, `package-lock.json` updated.

- [ ] **Step 3: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: exit 0, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add zod ^3.23.8 cho Phase 2.0 DSL validation"
```

---

### Task 1.2: Create error types

**Files:**
- Create: `src/stamps/geometry-2d/dsl/transpile/errors.ts`

- [ ] **Step 1: Create file**

Path: `src/stamps/geometry-2d/dsl/transpile/errors.ts`

```ts
// src/stamps/geometry-2d/dsl/transpile/errors.ts
import type { State } from '../../../../core/scene/types';

export type TranspileErrorCode =
  | 'SCHEMA'
  | 'DUPLICATE_NAME'
  | 'UNKNOWN_REF'
  | 'KIND_MISMATCH'
  | 'CYCLE';

export interface TranspileError {
  code: TranspileErrorCode;
  message: string;
  path?: string[];
  hint?: string;
}

export type TranspileResult =
  | { ok: true; state: State }
  | { ok: false; errors: TranspileError[] };

export function mkError(
  code: TranspileErrorCode,
  message: string,
  opts?: { path?: string[]; hint?: string },
): TranspileError {
  return { code, message, path: opts?.path, hint: opts?.hint };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0. File compiles, `State` import resolves.

- [ ] **Step 3: Commit**

```bash
git add src/stamps/geometry-2d/dsl/transpile/errors.ts
git commit -m "feat(dsl): TranspileError + TranspileResult types — PR 1/4"
```

---

### Task 1.3: Failing test cho NameZ + DslInput skeleton

**Files:**
- Create: `src/stamps/geometry-2d/dsl/__tests__/schema.test.ts`

- [ ] **Step 1: Write failing test**

Path: `src/stamps/geometry-2d/dsl/__tests__/schema.test.ts`

```ts
// src/stamps/geometry-2d/dsl/__tests__/schema.test.ts
import { NameZ, DslInput } from '../schema';

describe('NameZ regex', () => {
  it.each([
    'A', 'B', 'AB', 'M_1', "A'", 'O₁', 'O₂', 'P12',
  ])('accepts %s', (s) => {
    expect(NameZ.safeParse(s).success).toBe(true);
  });

  it.each([
    '', '1A', 'a b', 'A.B', 'ThisLabelIsTooLong13',
  ])('rejects %s', (s) => {
    expect(NameZ.safeParse(s).success).toBe(false);
  });
});

describe('DslInput root', () => {
  it('parses empty version-1 input', () => {
    const r = DslInput.safeParse({ version: 1, points: [], shapes: [] });
    expect(r.success).toBe(true);
  });

  it('shapes defaults to []', () => {
    const r = DslInput.safeParse({ version: 1, points: [] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.shapes).toEqual([]);
  });

  it('rejects version other than 1', () => {
    const r = DslInput.safeParse({ version: 2, points: [], shapes: [] });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/schema.test.ts`
Expected: FAIL — Cannot find module '../schema'.

- [ ] **Step 3: Create skeleton schema.ts**

Path: `src/stamps/geometry-2d/dsl/schema.ts`

```ts
// src/stamps/geometry-2d/dsl/schema.ts
import { z } from 'zod';

// Label-style name: chữ cái Latin đầu, cho phép unicode prime (') + subscript ₀-₉.
// Max length 12 ký tự. Phân biệt hoa/thường.
export const NameZ = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_'₀-₉]{0,11}$/);

// Placeholder — sẽ mở rộng trong Task 1.4+.
export const DslPoint = z.never();
export const DslShape = z.never();

export const DslInput = z.object({
  version: z.literal(1),
  points: z.array(DslPoint),
  shapes: z.array(DslShape).default([]),
});

export type DslPointT = z.infer<typeof DslPoint>;
export type DslShapeT = z.infer<typeof DslShape>;
export type DslInputT = z.infer<typeof DslInput>;
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/schema.test.ts`
Expected: PASS — all 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/schema.ts src/stamps/geometry-2d/dsl/__tests__/schema.test.ts
git commit -m "feat(dsl): NameZ regex + DslInput skeleton — PR 1/4"
```

---

### Task 1.4: Add `DslPoint` discriminated union (11 kinds)

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/schema.ts`
- Modify: `src/stamps/geometry-2d/dsl/__tests__/schema.test.ts`

- [ ] **Step 1: Write failing tests cho 11 point kinds**

Append vào `__tests__/schema.test.ts` (sau block `DslInput root`):

```ts
describe('DslPoint kinds', () => {
  const valid: Array<[string, unknown]> = [
    ['free',         { name: 'A', kind: 'free', x: 0, y: 0 }],
    ['midpoint',     { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' }],
    ['onSegment',    { name: 'P', kind: 'onSegment', segmentId: 'AB', t: 0.5 }],
    ['onLine',       { name: 'P', kind: 'onLine', lineId: 'L', t: 0.5 }],
    ['onCircle',     { name: 'P', kind: 'onCircle', circleId: 'C', theta: 1.2 }],
    ['perpFoot',     { name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC' }],
    ['circumcenter', { name: 'O', kind: 'circumcenter', vertices: ['A', 'B', 'C'] }],
    ['incenter',     { name: 'I', kind: 'incenter', vertices: ['A', 'B', 'C'] }],
    ['centroid',     { name: 'G', kind: 'centroid', vertices: ['A', 'B', 'C'] }],
    ['orthocenter',  { name: 'H', kind: 'orthocenter', vertices: ['A', 'B', 'C'] }],
    ['intersection', { name: 'P', kind: 'intersection', ref1: 'L1', ref2: 'L2' }],
    ['intersection branch 0', { name: 'P', kind: 'intersection', ref1: 'C1', ref2: 'C2', branch: 0 }],
    ['intersection branch 1', { name: 'P', kind: 'intersection', ref1: 'C1', ref2: 'C2', branch: 1 }],
  ];

  it.each(valid)('accepts %s', (_, obj) => {
    expect(DslPoint.safeParse(obj).success).toBe(true);
  });

  const invalid: Array<[string, unknown]> = [
    ['unknown kind',       { name: 'A', kind: 'wat', x: 0, y: 0 }],
    ['free missing y',     { name: 'A', kind: 'free', x: 0 }],
    ['free non-finite',    { name: 'A', kind: 'free', x: 0, y: NaN }],
    ['midpoint missing p2',{ name: 'M', kind: 'midpoint', p1: 'A' }],
    ['onSegment t<0',      { name: 'P', kind: 'onSegment', segmentId: 'AB', t: -0.1 }],
    ['onSegment t>1',      { name: 'P', kind: 'onSegment', segmentId: 'AB', t: 1.5 }],
    ['centroid 2 vertices',{ name: 'G', kind: 'centroid', vertices: ['A', 'B'] }],
    ['centroid 4 vertices',{ name: 'G', kind: 'centroid', vertices: ['A', 'B', 'C', 'D'] }],
    ['intersection branch 2', { name: 'P', kind: 'intersection', ref1: 'C1', ref2: 'C2', branch: 2 }],
    ['intersection missing ref2', { name: 'P', kind: 'intersection', ref1: 'L1' }],
    ['bad name regex',     { name: '1A', kind: 'free', x: 0, y: 0 }],
  ];

  it.each(invalid)('rejects %s', (_, obj) => {
    expect(DslPoint.safeParse(obj).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — verify FAIL**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/schema.test.ts -t 'DslPoint kinds'`
Expected: FAIL — tất cả tests fail (DslPoint hiện là `z.never()`).

- [ ] **Step 3: Replace `DslPoint` placeholder với discriminated union**

Trong `schema.ts`, thay block `export const DslPoint = z.never();`:

```ts
export const DslPoint = z.discriminatedUnion('kind', [
  z.object({ name: NameZ, kind: z.literal('free'),
             x: z.number().finite(), y: z.number().finite() }),
  z.object({ name: NameZ, kind: z.literal('midpoint'),
             p1: NameZ, p2: NameZ }),
  z.object({ name: NameZ, kind: z.literal('onSegment'),
             segmentId: NameZ, t: z.number().min(0).max(1) }),
  z.object({ name: NameZ, kind: z.literal('onLine'),
             lineId: NameZ, t: z.number().finite() }),
  z.object({ name: NameZ, kind: z.literal('onCircle'),
             circleId: NameZ, theta: z.number().finite() }),
  z.object({ name: NameZ, kind: z.literal('perpFoot'),
             from: NameZ, onLine: NameZ }),
  z.object({ name: NameZ, kind: z.literal('circumcenter'),
             vertices: z.tuple([NameZ, NameZ, NameZ]) }),
  z.object({ name: NameZ, kind: z.literal('incenter'),
             vertices: z.tuple([NameZ, NameZ, NameZ]) }),
  z.object({ name: NameZ, kind: z.literal('centroid'),
             vertices: z.tuple([NameZ, NameZ, NameZ]) }),
  z.object({ name: NameZ, kind: z.literal('orthocenter'),
             vertices: z.tuple([NameZ, NameZ, NameZ]) }),
  z.object({ name: NameZ, kind: z.literal('intersection'),
             ref1: NameZ, ref2: NameZ,
             branch: z.union([z.literal(0), z.literal(1)]).optional() }),
]);
```

- [ ] **Step 4: Run tests — verify PASS**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/schema.test.ts`
Expected: PASS — bao gồm 13 valid + 11 invalid DslPoint tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/schema.ts src/stamps/geometry-2d/dsl/__tests__/schema.test.ts
git commit -m "feat(dsl): DslPoint discriminated union (11 kinds) — PR 1/4"
```

---

### Task 1.5: Add `DslShape` discriminated union (11 kinds)

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/schema.ts`
- Modify: `src/stamps/geometry-2d/dsl/__tests__/schema.test.ts`

- [ ] **Step 1: Append failing tests cho 11 shape kinds**

Append vào `__tests__/schema.test.ts`:

```ts
describe('DslShape kinds', () => {
  const valid: Array<[string, unknown]> = [
    ['segment',        { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' }],
    ['line',           { name: 'L',  kind: 'line', p1: 'A', p2: 'B' }],
    ['ray',            { name: 'r',  kind: 'ray', origin: 'A', through: 'B' }],
    ['polygon 3',      { name: 'T',  kind: 'polygon', vertices: ['A','B','C'] }],
    ['polygon 4',      { name: 'Q',  kind: 'polygon', vertices: ['A','B','C','D'] }],
    ['perpendicular',  { name: 'L',  kind: 'perpendicular', throughPoint: 'A', toLine: 'BC' }],
    ['parallel',       { name: 'L',  kind: 'parallel', throughPoint: 'A', toLine: 'BC' }],
    ['perpBisector',   { name: 'd',  kind: 'perpBisector', p1: 'A', p2: 'B' }],
    ['angleBisector',  { name: 'b',  kind: 'angleBisector', p1: 'A', vertex: 'B', p2: 'C' }],
    ['tangent',        { name: 't',  kind: 'tangent', throughPoint: 'P', toCircle: 'C' }],
    ['tangent branch', { name: 't',  kind: 'tangent', throughPoint: 'P', toCircle: 'C', branch: 1 }],
    ['tangent on',     { name: 't',  kind: 'tangent', throughPoint: 'P', toCircle: 'C', branch: 'on' }],
    ['circleCP',       { name: 'c',  kind: 'circleCP', center: 'O', surfacePoint: 'A' }],
    ['circle3',        { name: 'c',  kind: 'circle3', p1: 'A', p2: 'B', p3: 'C' }],
  ];

  it.each(valid)('accepts %s', (_, obj) => {
    expect(DslShape.safeParse(obj).success).toBe(true);
  });

  const invalid: Array<[string, unknown]> = [
    ['unknown kind',    { name: 'X', kind: 'foo', p1: 'A', p2: 'B' }],
    ['polygon 2 verts', { name: 'P', kind: 'polygon', vertices: ['A','B'] }],
    ['segment missing p2', { name: 'AB', kind: 'segment', p1: 'A' }],
    ['tangent branch 2', { name: 't', kind: 'tangent', throughPoint: 'P', toCircle: 'C', branch: 2 }],
    ['circle3 missing p3', { name: 'c', kind: 'circle3', p1: 'A', p2: 'B' }],
  ];

  it.each(invalid)('rejects %s', (_, obj) => {
    expect(DslShape.safeParse(obj).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — verify FAIL**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/schema.test.ts -t 'DslShape kinds'`
Expected: FAIL — DslShape vẫn là `z.never()`.

- [ ] **Step 3: Replace `DslShape` placeholder**

Trong `schema.ts`, thay block `export const DslShape = z.never();`:

```ts
export const DslShape = z.discriminatedUnion('kind', [
  z.object({ name: NameZ, kind: z.literal('segment'),
             p1: NameZ, p2: NameZ }),
  z.object({ name: NameZ, kind: z.literal('line'),
             p1: NameZ, p2: NameZ }),
  z.object({ name: NameZ, kind: z.literal('ray'),
             origin: NameZ, through: NameZ }),
  z.object({ name: NameZ, kind: z.literal('polygon'),
             vertices: z.array(NameZ).min(3) }),
  // Line constructions
  z.object({ name: NameZ, kind: z.literal('perpendicular'),
             throughPoint: NameZ, toLine: NameZ }),
  z.object({ name: NameZ, kind: z.literal('parallel'),
             throughPoint: NameZ, toLine: NameZ }),
  z.object({ name: NameZ, kind: z.literal('perpBisector'),
             p1: NameZ, p2: NameZ }),
  z.object({ name: NameZ, kind: z.literal('angleBisector'),
             p1: NameZ, vertex: NameZ, p2: NameZ }),
  z.object({ name: NameZ, kind: z.literal('tangent'),
             throughPoint: NameZ, toCircle: NameZ,
             branch: z.union([z.literal(0), z.literal(1), z.literal('on')]).optional() }),
  // Circle constructions
  z.object({ name: NameZ, kind: z.literal('circleCP'),
             center: NameZ, surfacePoint: NameZ }),
  z.object({ name: NameZ, kind: z.literal('circle3'),
             p1: NameZ, p2: NameZ, p3: NameZ }),
]);
```

- [ ] **Step 4: Run tests — verify PASS**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/schema.test.ts`
Expected: PASS — full schema.test.ts (~38 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/schema.ts src/stamps/geometry-2d/dsl/__tests__/schema.test.ts
git commit -m "feat(dsl): DslShape discriminated union (11 kinds) — PR 1/4"
```

---

### Task 1.6: Create barrel `index.ts`

**Files:**
- Create: `src/stamps/geometry-2d/dsl/index.ts`

- [ ] **Step 1: Create barrel**

```ts
// src/stamps/geometry-2d/dsl/index.ts
export {
  NameZ,
  DslPoint,
  DslShape,
  DslInput,
} from './schema';

export type {
  DslPointT,
  DslShapeT,
  DslInputT,
} from './schema';

export type {
  TranspileError,
  TranspileErrorCode,
  TranspileResult,
} from './transpile/errors';

// `transpile()` được wire trong PR 3. Stub tạm để barrel typecheck OK.
import type { TranspileResult } from './transpile/errors';
export function transpile(_dsl: unknown): TranspileResult {
  return {
    ok: false,
    errors: [{ code: 'SCHEMA', message: 'transpile not yet implemented (PR 3/4)' }],
  };
}
```

- [ ] **Step 2: Typecheck + test**

Run: `npm run typecheck && npx jest src/stamps/geometry-2d/dsl`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/stamps/geometry-2d/dsl/index.ts
git commit -m "feat(dsl): barrel index.ts + transpile stub — PR 1/4"
```

---

### Task 1.7: PR 1 final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test -- --silent`
Expected: all green, +~38 new tests trong `schema.test.ts`. Total existing 967 → ~1005.

- [ ] **Step 2: Run typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 3: Verify file layout**

Run: `ls -1 src/stamps/geometry-2d/dsl/ src/stamps/geometry-2d/dsl/transpile/ src/stamps/geometry-2d/dsl/__tests__/`
Expected:
```
src/stamps/geometry-2d/dsl/:
__tests__
index.ts
schema.ts
transpile

src/stamps/geometry-2d/dsl/transpile/:
errors.ts

src/stamps/geometry-2d/dsl/__tests__/:
schema.test.ts
```

PR 1 done. ✅

---

## PR 2 — Validation pipeline (symbols + refs + cycles + ids)

### Task 2.1: Symbol table với duplicate detection

**Files:**
- Create: `src/stamps/geometry-2d/dsl/transpile/symbols.ts`
- Create: `src/stamps/geometry-2d/dsl/__tests__/transpile.symbols.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/dsl/__tests__/transpile.symbols.test.ts
import { buildSymbols } from '../transpile/symbols';
import type { DslInputT } from '../schema';

const A = { name: 'A', kind: 'free', x: 0, y: 0 } as const;
const B = { name: 'B', kind: 'free', x: 1, y: 0 } as const;
const M = { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' } as const;

describe('buildSymbols', () => {
  it('empty input → empty map + no errors', () => {
    const dsl: DslInputT = { version: 1, points: [], shapes: [] };
    const r = buildSymbols(dsl);
    expect(r.errors).toEqual([]);
    expect(r.symbols.size).toBe(0);
  });

  it('builds map keyed by name across points + shapes', () => {
    const seg = { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' } as const;
    const dsl: DslInputT = { version: 1, points: [A, B], shapes: [seg] };
    const r = buildSymbols(dsl);
    expect(r.errors).toEqual([]);
    expect(r.symbols.size).toBe(3);
    expect(r.symbols.get('A')?.entity).toEqual(A);
    expect(r.symbols.get('A')?.role).toBe('point');
    expect(r.symbols.get('AB')?.role).toBe('shape');
  });

  it('detects duplicate name across point + shape', () => {
    const dup = { name: 'A', kind: 'segment', p1: 'A', p2: 'B' } as const;
    const dsl: DslInputT = { version: 1, points: [A, B], shapes: [dup] };
    const r = buildSymbols(dsl);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].code).toBe('DUPLICATE_NAME');
    expect(r.errors[0].path).toEqual(['A']);
  });

  it('detects duplicate name within points list', () => {
    const dup = { name: 'A', kind: 'free', x: 5, y: 5 } as const;
    const dsl: DslInputT = { version: 1, points: [A, dup], shapes: [] };
    const r = buildSymbols(dsl);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].code).toBe('DUPLICATE_NAME');
  });

  it('still emits symbols map for non-duplicate entries when duplicates exist', () => {
    const dup = { name: 'A', kind: 'free', x: 5, y: 5 } as const;
    const dsl: DslInputT = { version: 1, points: [A, B, dup], shapes: [] };
    const r = buildSymbols(dsl);
    expect(r.symbols.has('B')).toBe(true);
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.symbols.test.ts`
Expected: FAIL — Cannot find module '../transpile/symbols'.

- [ ] **Step 3: Implement**

```ts
// src/stamps/geometry-2d/dsl/transpile/symbols.ts
import type { DslInputT, DslPointT, DslShapeT } from '../schema';
import { mkError, type TranspileError } from './errors';

export type Role = 'point' | 'shape';

export interface Symbol {
  name: string;
  role: Role;
  entity: DslPointT | DslShapeT;
  index: number; // vị trí trong list nguyên thuỷ (cho deterministic id assign sau)
}

export interface SymbolResult {
  symbols: Map<string, Symbol>;
  errors: TranspileError[];
}

export function buildSymbols(dsl: DslInputT): SymbolResult {
  const symbols = new Map<string, Symbol>();
  const errors: TranspileError[] = [];
  let counter = 0;

  for (const p of dsl.points) {
    if (symbols.has(p.name)) {
      errors.push(mkError('DUPLICATE_NAME', `Tên trùng: "${p.name}"`, { path: [p.name] }));
      continue;
    }
    symbols.set(p.name, { name: p.name, role: 'point', entity: p, index: counter++ });
  }

  for (const s of dsl.shapes) {
    if (symbols.has(s.name)) {
      errors.push(mkError('DUPLICATE_NAME', `Tên trùng: "${s.name}"`, { path: [s.name] }));
      continue;
    }
    symbols.set(s.name, { name: s.name, role: 'shape', entity: s, index: counter++ });
  }

  return { symbols, errors };
}
```

- [ ] **Step 4: Run — PASS**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.symbols.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/transpile/symbols.ts src/stamps/geometry-2d/dsl/__tests__/transpile.symbols.test.ts
git commit -m "feat(dsl): symbol table + duplicate detection — PR 2/4"
```

---

### Task 2.2: Refs validation + kind compatibility table

**Files:**
- Create: `src/stamps/geometry-2d/dsl/transpile/refs.ts`
- Create: `src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts
import { validateRefs } from '../transpile/refs';
import { buildSymbols } from '../transpile/symbols';
import type { DslInputT } from '../schema';

function check(dsl: DslInputT) {
  const { symbols } = buildSymbols(dsl);
  return validateRefs(dsl, symbols);
}

describe('validateRefs', () => {
  it('all anchors → no errors', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
      ],
      shapes: [],
    };
    expect(check(dsl).errors).toEqual([]);
  });

  it('unknown ref → UNKNOWN_REF', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'Z' },
      ],
      shapes: [],
    };
    const r = check(dsl);
    expect(r.errors.some((e) => e.code === 'UNKNOWN_REF' && e.path?.includes('M'))).toBe(true);
  });

  it('point field referencing shape → KIND_MISMATCH', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        // midpoint.p2 referencing a segment AB instead of point — bad
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'AB' },
      ],
      shapes: [{ name: 'AB', kind: 'segment', p1: 'A', p2: 'B' }],
    };
    const r = check(dsl);
    expect(r.errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });

  it('perpFoot.onLine accepts segment', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 1 },
        { name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC' },
      ],
      shapes: [{ name: 'BC', kind: 'segment', p1: 'B', p2: 'C' }],
    };
    expect(check(dsl).errors).toEqual([]);
  });

  it('tangent.toCircle rejects segment', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'P', kind: 'free', x: 2, y: 2 },
      ],
      shapes: [
        { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
        { name: 't', kind: 'tangent', throughPoint: 'P', toCircle: 'AB' },
      ],
    };
    expect(check(dsl).errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });

  it('intersection.ref1 must be line-like or circle-like', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        // intersection ref1 referencing a free point — bad
        { name: 'P', kind: 'intersection', ref1: 'A', ref2: 'B' },
        { name: 'B', kind: 'free', x: 1, y: 0 },
      ],
      shapes: [],
    };
    expect(check(dsl).errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });

  it('triangle center vertices accept point-like only', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 1 },
        { name: 'G', kind: 'centroid', vertices: ['A', 'B', 'C'] },
      ],
      shapes: [],
    };
    expect(check(dsl).errors).toEqual([]);
  });

  it('polygon.vertices accept point-like only', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 1 },
      ],
      shapes: [
        { name: 'L', kind: 'line', p1: 'A', p2: 'B' },
        // polygon mistakenly references line L instead of a point
        { name: 'T', kind: 'polygon', vertices: ['A', 'B', 'L'] },
      ],
    };
    expect(check(dsl).errors.some((e) => e.code === 'KIND_MISMATCH')).toBe(true);
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts`
Expected: FAIL — Cannot find module.

- [ ] **Step 3: Implement refs.ts**

```ts
// src/stamps/geometry-2d/dsl/transpile/refs.ts
import type { DslInputT, DslPointT, DslShapeT } from '../schema';
import type { Symbol } from './symbols';
import { mkError, type TranspileError } from './errors';

// "Point-like" = DslPoint of any kind. State sẽ emit `kind: 'point'` hoặc
// `kind: 'intersection'`; cả hai visualize as points.
function isPointLike(sym: Symbol | undefined): boolean {
  return !!sym && sym.role === 'point';
}

// "Line-like" gồm: line / segment / ray + 5 line-constructions.
const LINE_LIKE_SHAPE_KINDS = new Set<DslShapeT['kind']>([
  'line', 'segment', 'ray',
  'perpendicular', 'parallel', 'perpBisector', 'angleBisector', 'tangent',
]);

const CIRCLE_KINDS = new Set<DslShapeT['kind']>(['circleCP', 'circle3']);

function isLineLike(sym: Symbol | undefined): boolean {
  if (!sym || sym.role !== 'shape') return false;
  return LINE_LIKE_SHAPE_KINDS.has((sym.entity as DslShapeT).kind);
}

function isCircleLike(sym: Symbol | undefined): boolean {
  if (!sym || sym.role !== 'shape') return false;
  return CIRCLE_KINDS.has((sym.entity as DslShapeT).kind);
}

function isSegmentExact(sym: Symbol | undefined): boolean {
  return !!sym && sym.role === 'shape' && (sym.entity as DslShapeT).kind === 'segment';
}

export interface RefsResult {
  errors: TranspileError[];
}

export function validateRefs(dsl: DslInputT, symbols: Map<string, Symbol>): RefsResult {
  const errors: TranspileError[] = [];

  const check = (
    owner: string,
    field: string,
    refName: string,
    predicate: (s: Symbol | undefined) => boolean,
    expected: string,
  ) => {
    const sym = symbols.get(refName);
    if (!sym) {
      errors.push(mkError('UNKNOWN_REF',
        `${owner}.${field} tham chiếu "${refName}" không tồn tại`,
        { path: [owner, field] }));
      return;
    }
    if (!predicate(sym)) {
      errors.push(mkError('KIND_MISMATCH',
        `${owner}.${field}="${refName}" sai kiểu (cần ${expected}, gặp ${sym.role === 'point' ? 'point' : (sym.entity as DslShapeT).kind})`,
        { path: [owner, field] }));
    }
  };

  for (const p of dsl.points) {
    switch (p.kind) {
      case 'free': break;
      case 'midpoint':
        check(p.name, 'p1', p.p1, isPointLike, 'point');
        check(p.name, 'p2', p.p2, isPointLike, 'point');
        break;
      case 'onSegment':
        check(p.name, 'segmentId', p.segmentId, isSegmentExact, 'segment');
        break;
      case 'onLine':
        check(p.name, 'lineId', p.lineId, isLineLike, 'line-like');
        break;
      case 'onCircle':
        check(p.name, 'circleId', p.circleId, isCircleLike, 'circle');
        break;
      case 'perpFoot':
        check(p.name, 'from', p.from, isPointLike, 'point');
        check(p.name, 'onLine', p.onLine, isLineLike, 'line-like');
        break;
      case 'circumcenter':
      case 'incenter':
      case 'centroid':
      case 'orthocenter':
        for (let i = 0; i < 3; i++) {
          check(p.name, `vertices[${i}]`, p.vertices[i], isPointLike, 'point');
        }
        break;
      case 'intersection': {
        const refPredicate = (s: Symbol | undefined) => isLineLike(s) || isCircleLike(s);
        check(p.name, 'ref1', p.ref1, refPredicate, 'line-like hoặc circle');
        check(p.name, 'ref2', p.ref2, refPredicate, 'line-like hoặc circle');
        break;
      }
    }
  }

  for (const s of dsl.shapes) {
    switch (s.kind) {
      case 'segment':
      case 'line':
        check(s.name, 'p1', s.p1, isPointLike, 'point');
        check(s.name, 'p2', s.p2, isPointLike, 'point');
        break;
      case 'ray':
        check(s.name, 'origin', s.origin, isPointLike, 'point');
        check(s.name, 'through', s.through, isPointLike, 'point');
        break;
      case 'polygon':
        s.vertices.forEach((v, i) =>
          check(s.name, `vertices[${i}]`, v, isPointLike, 'point'));
        break;
      case 'perpendicular':
      case 'parallel':
        check(s.name, 'throughPoint', s.throughPoint, isPointLike, 'point');
        check(s.name, 'toLine', s.toLine, isLineLike, 'line-like');
        break;
      case 'perpBisector':
        check(s.name, 'p1', s.p1, isPointLike, 'point');
        check(s.name, 'p2', s.p2, isPointLike, 'point');
        break;
      case 'angleBisector':
        check(s.name, 'p1', s.p1, isPointLike, 'point');
        check(s.name, 'vertex', s.vertex, isPointLike, 'point');
        check(s.name, 'p2', s.p2, isPointLike, 'point');
        break;
      case 'tangent':
        check(s.name, 'throughPoint', s.throughPoint, isPointLike, 'point');
        check(s.name, 'toCircle', s.toCircle, isCircleLike, 'circle');
        break;
      case 'circleCP':
        check(s.name, 'center', s.center, isPointLike, 'point');
        check(s.name, 'surfacePoint', s.surfacePoint, isPointLike, 'point');
        break;
      case 'circle3':
        check(s.name, 'p1', s.p1, isPointLike, 'point');
        check(s.name, 'p2', s.p2, isPointLike, 'point');
        check(s.name, 'p3', s.p3, isPointLike, 'point');
        break;
    }
  }

  return { errors };
}

// Helper export cho cycles.ts: collect refs cho mỗi entity (name) trả về list ref names.
export function collectRefs(entity: DslPointT | DslShapeT): string[] {
  if ('kind' in entity) {
    switch (entity.kind) {
      case 'free':         return [];
      case 'midpoint':     return [entity.p1, entity.p2];
      case 'onSegment':    return [entity.segmentId];
      case 'onLine':       return [entity.lineId];
      case 'onCircle':     return [entity.circleId];
      case 'perpFoot':     return [entity.from, entity.onLine];
      case 'circumcenter':
      case 'incenter':
      case 'centroid':
      case 'orthocenter':  return [...entity.vertices];
      case 'intersection': return [entity.ref1, entity.ref2];
      case 'segment':
      case 'line':         return [entity.p1, entity.p2];
      case 'ray':          return [entity.origin, entity.through];
      case 'polygon':      return [...entity.vertices];
      case 'perpendicular':
      case 'parallel':     return [entity.throughPoint, entity.toLine];
      case 'perpBisector': return [entity.p1, entity.p2];
      case 'angleBisector':return [entity.p1, entity.vertex, entity.p2];
      case 'tangent':      return [entity.throughPoint, entity.toCircle];
      case 'circleCP':     return [entity.center, entity.surfacePoint];
      case 'circle3':      return [entity.p1, entity.p2, entity.p3];
    }
  }
  return [];
}
```

- [ ] **Step 4: Run — PASS**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/transpile/refs.ts src/stamps/geometry-2d/dsl/__tests__/transpile.refs.test.ts
git commit -m "feat(dsl): refs validation + kind compat table — PR 2/4"
```

---

### Task 2.3: Cycle detection

**Files:**
- Create: `src/stamps/geometry-2d/dsl/transpile/cycles.ts`
- Create: `src/stamps/geometry-2d/dsl/__tests__/transpile.cycles.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/stamps/geometry-2d/dsl/__tests__/transpile.cycles.test.ts
import { detectCycles } from '../transpile/cycles';
import { buildSymbols } from '../transpile/symbols';
import type { DslInputT } from '../schema';

function check(dsl: DslInputT) {
  const { symbols } = buildSymbols(dsl);
  return detectCycles(symbols);
}

describe('detectCycles', () => {
  it('no cycle → empty errors', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' },
      ],
      shapes: [],
    };
    expect(check(dsl).errors).toEqual([]);
  });

  it('self-cycle detected', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        // M depends on itself
        { name: 'M', kind: 'midpoint', p1: 'M', p2: 'A' },
      ],
      shapes: [],
    };
    const r = check(dsl);
    expect(r.errors.some((e) => e.code === 'CYCLE')).toBe(true);
  });

  it('2-cycle detected', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'M', kind: 'midpoint', p1: 'N', p2: 'N' },
        { name: 'N', kind: 'midpoint', p1: 'M', p2: 'M' },
      ],
      shapes: [],
    };
    expect(check(dsl).errors.some((e) => e.code === 'CYCLE')).toBe(true);
  });

  it('3-cycle detected', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'X', kind: 'midpoint', p1: 'Y', p2: 'Y' },
        { name: 'Y', kind: 'midpoint', p1: 'Z', p2: 'Z' },
        { name: 'Z', kind: 'midpoint', p1: 'X', p2: 'X' },
      ],
      shapes: [],
    };
    expect(check(dsl).errors.some((e) => e.code === 'CYCLE')).toBe(true);
  });

  it('long chain no cycle OK', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' },
        { name: 'N', kind: 'midpoint', p1: 'A', p2: 'M' },
        { name: 'P', kind: 'midpoint', p1: 'M', p2: 'N' },
      ],
      shapes: [],
    };
    expect(check(dsl).errors).toEqual([]);
  });

  it('disconnected components: 1 cycle, 1 acyclic — only cycle reported', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' },
        { name: 'X', kind: 'midpoint', p1: 'Y', p2: 'Y' },
        { name: 'Y', kind: 'midpoint', p1: 'X', p2: 'X' },
      ],
      shapes: [],
    };
    expect(check(dsl).errors.length).toBeGreaterThan(0);
    expect(check(dsl).errors.every((e) => e.code === 'CYCLE')).toBe(true);
  });

  it('ignores refs pointing to unknown names (refs.ts catches those)', () => {
    // detectCycles không quan tâm UNKNOWN_REF — refs.ts handle. cycles chỉ traverse known.
    const dsl: DslInputT = {
      version: 1,
      points: [{ name: 'M', kind: 'midpoint', p1: 'Z_UNKNOWN', p2: 'Z_UNKNOWN' }],
      shapes: [],
    };
    expect(check(dsl).errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.cycles.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/stamps/geometry-2d/dsl/transpile/cycles.ts
import type { Symbol } from './symbols';
import { collectRefs } from './refs';
import { mkError, type TranspileError } from './errors';

type Color = 'white' | 'gray' | 'black';

export interface CyclesResult {
  errors: TranspileError[];
}

export function detectCycles(symbols: Map<string, Symbol>): CyclesResult {
  const color = new Map<string, Color>();
  const parent = new Map<string, string | null>();
  const errors: TranspileError[] = [];
  const reportedCycles = new Set<string>();

  for (const name of symbols.keys()) color.set(name, 'white');

  function reportCycle(start: string, hit: string) {
    // reconstruct chain hit ← ... ← start
    const chain: string[] = [start];
    let cur: string | null | undefined = parent.get(start);
    while (cur && cur !== hit && chain.length < symbols.size + 2) {
      chain.push(cur);
      cur = parent.get(cur);
    }
    chain.push(hit);
    // normalize cho dedupe (rotate min-first)
    const minIdx = chain.indexOf(chain.reduce((a, b) => (a < b ? a : b)));
    const rotated = [...chain.slice(minIdx), ...chain.slice(0, minIdx)];
    const key = rotated.join('→');
    if (reportedCycles.has(key)) return;
    reportedCycles.add(key);
    errors.push(mkError('CYCLE',
      `Phụ thuộc vòng: ${chain.reverse().join(' → ')}`,
      { path: [...chain], hint: 'Kiểm tra lại quan hệ midpoint/perpFoot/intersection.' }));
  }

  function dfs(name: string) {
    color.set(name, 'gray');
    const sym = symbols.get(name);
    if (sym) {
      for (const ref of collectRefs(sym.entity)) {
        if (!symbols.has(ref)) continue; // unknown — refs.ts handle
        const c = color.get(ref);
        if (c === 'gray') {
          reportCycle(name, ref);
          continue;
        }
        if (c === 'white') {
          parent.set(ref, name);
          dfs(ref);
        }
      }
    }
    color.set(name, 'black');
  }

  for (const name of symbols.keys()) {
    if (color.get(name) === 'white') {
      parent.set(name, null);
      dfs(name);
    }
  }

  return { errors };
}
```

- [ ] **Step 4: Run — PASS**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.cycles.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/transpile/cycles.ts src/stamps/geometry-2d/dsl/__tests__/transpile.cycles.test.ts
git commit -m "feat(dsl): cycle detection 3-color DFS — PR 2/4"
```

---

### Task 2.4: ID assignment (counter-based, deterministic)

**Files:**
- Create: `src/stamps/geometry-2d/dsl/transpile/ids.ts`
- Modify: `src/stamps/geometry-2d/dsl/__tests__/transpile.symbols.test.ts` (append id tests)

- [ ] **Step 1: Append failing tests trong `transpile.symbols.test.ts`**

Append:

```ts
import { assignIds } from '../transpile/ids';

describe('assignIds', () => {
  it('points get p1, p2, ... in DSL order', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'C', kind: 'free', x: 2, y: 0 },
      ],
      shapes: [],
    };
    const { symbols } = buildSymbols(dsl);
    const ids = assignIds(symbols);
    expect(ids.get('A')).toBe('p1');
    expect(ids.get('B')).toBe('p2');
    expect(ids.get('C')).toBe('p3');
  });

  it('intersection gets i prefix', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'P', kind: 'intersection', ref1: 'AB', ref2: 'CD' },
      ],
      shapes: [
        { name: 'AB', kind: 'line', p1: 'A', p2: 'A' },
        { name: 'CD', kind: 'line', p1: 'A', p2: 'A' },
      ],
    };
    const { symbols } = buildSymbols(dsl);
    const ids = assignIds(symbols);
    expect(ids.get('A')).toBe('p1');
    expect(ids.get('P')).toBe('i1');
    expect(ids.get('AB')).toBe('l1');
    expect(ids.get('CD')).toBe('l2');
  });

  it('mixed prefixes count independently', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [{ name: 'A', kind: 'free', x: 0, y: 0 }],
      shapes: [
        { name: 'S', kind: 'segment', p1: 'A', p2: 'A' },
        { name: 'L', kind: 'line', p1: 'A', p2: 'A' },
        { name: 'R', kind: 'ray', origin: 'A', through: 'A' },
        { name: 'P', kind: 'polygon', vertices: ['A','A','A'] },
        { name: 'C', kind: 'circleCP', center: 'A', surfacePoint: 'A' },
      ],
    };
    const { symbols } = buildSymbols(dsl);
    const ids = assignIds(symbols);
    expect(ids.get('S')).toBe('s1');
    expect(ids.get('L')).toBe('l1');
    expect(ids.get('R')).toBe('r1');
    expect(ids.get('P')).toBe('poly1');
    expect(ids.get('C')).toBe('c1');
  });

  it('all line-constructions share "l" prefix counter', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [{ name: 'A', kind: 'free', x: 0, y: 0 }],
      shapes: [
        { name: 'L1', kind: 'line', p1: 'A', p2: 'A' },
        { name: 'L2', kind: 'perpendicular', throughPoint: 'A', toLine: 'L1' },
        { name: 'L3', kind: 'parallel', throughPoint: 'A', toLine: 'L1' },
      ],
    };
    const { symbols } = buildSymbols(dsl);
    const ids = assignIds(symbols);
    expect(ids.get('L1')).toBe('l1');
    expect(ids.get('L2')).toBe('l2');
    expect(ids.get('L3')).toBe('l3');
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.symbols.test.ts -t assignIds`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/stamps/geometry-2d/dsl/transpile/ids.ts
import type { DslPointT, DslShapeT } from '../schema';
import type { Symbol } from './symbols';

type Prefix = 'p' | 'i' | 's' | 'l' | 'r' | 'poly' | 'c';

function prefixFor(sym: Symbol): Prefix {
  if (sym.role === 'point') {
    const p = sym.entity as DslPointT;
    return p.kind === 'intersection' ? 'i' : 'p';
  }
  const s = sym.entity as DslShapeT;
  switch (s.kind) {
    case 'segment':       return 's';
    case 'ray':           return 'r';
    case 'polygon':       return 'poly';
    case 'circleCP':
    case 'circle3':       return 'c';
    // line + 5 line-constructions all share 'l'
    case 'line':
    case 'perpendicular':
    case 'parallel':
    case 'perpBisector':
    case 'angleBisector':
    case 'tangent':       return 'l';
  }
}

export function assignIds(symbols: Map<string, Symbol>): Map<string, string> {
  const counters: Record<Prefix, number> = { p: 0, i: 0, s: 0, l: 0, r: 0, poly: 0, c: 0 };
  const ids = new Map<string, string>();
  // Insertion order của Map khớp DSL order (points first, shapes after) — buildSymbols guarantee.
  for (const [name, sym] of symbols.entries()) {
    const prefix = prefixFor(sym);
    counters[prefix] += 1;
    ids.set(name, `${prefix}${counters[prefix]}`);
  }
  return ids;
}
```

- [ ] **Step 4: Run — PASS**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.symbols.test.ts`
Expected: PASS — 5 buildSymbols + 4 assignIds.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/transpile/ids.ts src/stamps/geometry-2d/dsl/__tests__/transpile.symbols.test.ts
git commit -m "feat(dsl): id assignment counter-based — PR 2/4"
```

---

### Task 2.5: PR 2 final verification

- [ ] **Step 1: Test + typecheck**

Run: `npm run typecheck && npx jest src/stamps/geometry-2d/dsl`
Expected: both pass. ~38 (PR 1) + 24 (PR 2) = ~62 tests trong dsl/.

- [ ] **Step 2: Full suite**

Run: `npm test -- --silent`
Expected: all green.

PR 2 done. ✅

---

## PR 3 — State emit + main orchestrator

### Task 3.1: emitPoint — DSL points/intersection → State

**Files:**
- Create: `src/stamps/geometry-2d/dsl/transpile/emitPoint.ts`
- Create: `src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts`

- [ ] **Step 1: Write failing tests cho emitPoint**

```ts
// src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts
import { emitPoint } from '../transpile/emitPoint';
import type { DslPointT } from '../schema';

const ids = new Map<string, string>([
  ['A', 'p1'], ['B', 'p2'], ['C', 'p3'],
  ['M', 'p4'], ['H', 'p5'], ['P', 'i1'],
  ['AB', 's1'], ['BC', 's2'], ['L', 'l1'], ['CR', 'c1'],
]);

function emit(p: DslPointT) {
  return emitPoint(p, ids, new Map());
}

describe('emitPoint', () => {
  it('free → SceneObject kind=point', () => {
    const obj = emit({ name: 'A', kind: 'free', x: 0, y: 0 });
    expect(obj.id).toBe('p1');
    expect(obj.kind).toBe('point');
    expect(obj.label).toBe('A');
    expect(obj.visible).toBe(true);
    expect(obj.locked).toBe(false);
    expect(obj.schemaVersion).toBe(1);
    expect((obj.attrs as { constraint: { kind: string; x: number; y: number } }).constraint)
      .toEqual({ kind: 'free', x: 0, y: 0 });
  });

  it('midpoint resolves p1/p2 → ids', () => {
    const obj = emit({ name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' });
    expect((obj.attrs as { constraint: { kind: string; p1: string; p2: string } }).constraint)
      .toEqual({ kind: 'midpoint', p1: 'p1', p2: 'p2' });
  });

  it('onSegment maps segmentId', () => {
    const obj = emit({ name: 'P', kind: 'onSegment', segmentId: 'AB', t: 0.5 });
    expect((obj.attrs as { constraint: { kind: string; segmentId: string; t: number } }).constraint)
      .toEqual({ kind: 'onSegment', segmentId: 's1', t: 0.5 });
  });

  it('perpFoot maps from/onLine', () => {
    const obj = emit({ name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC' });
    expect((obj.attrs as { constraint: { kind: string; from: string; onLine: string } }).constraint)
      .toEqual({ kind: 'perpFoot', from: 'p1', onLine: 's2' });
  });

  it('triangle centers preserve vertices tuple', () => {
    const obj = emit({ name: 'G', kind: 'centroid', vertices: ['A', 'B', 'C'] });
    expect((obj.attrs as { constraint: { kind: string; vertices: string[] } }).constraint)
      .toEqual({ kind: 'centroid', vertices: ['p1', 'p2', 'p3'] });
  });

  it('intersection lineLine inference (2 line-like refs)', () => {
    const kindMap = new Map<string, 'line' | 'segment' | 'ray' | 'lineConstruction' | 'circle'>([
      ['AB', 'segment'], ['BC', 'segment'],
    ]);
    const obj = emitPoint(
      { name: 'P', kind: 'intersection', ref1: 'AB', ref2: 'BC' },
      ids, kindMap,
    );
    expect(obj.kind).toBe('intersection');
    expect(obj.id).toBe('i1');
    expect(obj.attrs).toMatchObject({ kind: 'lineLine', ref1: 's1', ref2: 's2' });
  });

  it('intersection circleCircle inference', () => {
    const kindMap = new Map<string, 'line' | 'segment' | 'ray' | 'lineConstruction' | 'circle'>([
      ['CR', 'circle'], ['L', 'circle'],
    ]);
    const obj = emitPoint(
      { name: 'P', kind: 'intersection', ref1: 'CR', ref2: 'L', branch: 1 },
      ids, kindMap,
    );
    expect(obj.attrs).toMatchObject({ kind: 'circleCircle', ref1: 'c1', ref2: 'l1', branch: 1 });
  });

  it('intersection lineCircle inference + default branch 0', () => {
    const kindMap = new Map<string, 'line' | 'segment' | 'ray' | 'lineConstruction' | 'circle'>([
      ['L', 'line'], ['CR', 'circle'],
    ]);
    const obj = emitPoint(
      { name: 'P', kind: 'intersection', ref1: 'L', ref2: 'CR' },
      ids, kindMap,
    );
    expect(obj.attrs).toMatchObject({ kind: 'lineCircle', branch: 0 });
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement emitPoint.ts**

```ts
// src/stamps/geometry-2d/dsl/transpile/emitPoint.ts
import type { SceneObject } from '../../../../core/scene/types';
import type { DslPointT } from '../schema';

export type EntityKindHint =
  | 'point'
  | 'line'         // DslShape 'line'
  | 'segment'
  | 'ray'
  | 'lineConstruction'  // perpendicular/parallel/perpBisector/angleBisector/tangent
  | 'circle';

function resolveId(ids: Map<string, string>, name: string): string {
  const id = ids.get(name);
  if (!id) throw new Error(`emitPoint: id not assigned for "${name}"`);
  return id;
}

function isLineLikeHint(h: EntityKindHint | undefined): boolean {
  return h === 'line' || h === 'segment' || h === 'ray' || h === 'lineConstruction';
}

export function emitPoint(
  p: DslPointT,
  ids: Map<string, string>,
  kindHints: Map<string, EntityKindHint>,
): SceneObject {
  const baseId = resolveId(ids, p.name);

  const baseFields = {
    label: p.name,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
  };

  if (p.kind === 'intersection') {
    const r1Hint = kindHints.get(p.ref1);
    const r2Hint = kindHints.get(p.ref2);
    const r1IsCircle = r1Hint === 'circle';
    const r2IsCircle = r2Hint === 'circle';
    let intersectKind: 'lineLine' | 'lineCircle' | 'circleCircle';
    if (r1IsCircle && r2IsCircle) intersectKind = 'circleCircle';
    else if (r1IsCircle || r2IsCircle) intersectKind = 'lineCircle';
    else intersectKind = 'lineLine';

    const attrs: Record<string, unknown> = {
      kind: intersectKind,
      ref1: resolveId(ids, p.ref1),
      ref2: resolveId(ids, p.ref2),
    };
    if (intersectKind !== 'lineLine') {
      attrs.branch = p.branch ?? 0;
    }
    return {
      id: baseId,
      kind: 'intersection',
      ...baseFields,
      attrs,
    };
  }

  let constraint: Record<string, unknown>;
  switch (p.kind) {
    case 'free':
      constraint = { kind: 'free', x: p.x, y: p.y };
      break;
    case 'midpoint':
      constraint = { kind: 'midpoint', p1: resolveId(ids, p.p1), p2: resolveId(ids, p.p2) };
      break;
    case 'onSegment':
      constraint = { kind: 'onSegment', segmentId: resolveId(ids, p.segmentId), t: p.t };
      break;
    case 'onLine':
      constraint = { kind: 'onLine', lineId: resolveId(ids, p.lineId), t: p.t };
      break;
    case 'onCircle':
      constraint = { kind: 'onCircle', circleId: resolveId(ids, p.circleId), theta: p.theta };
      break;
    case 'perpFoot':
      constraint = { kind: 'perpFoot', from: resolveId(ids, p.from), onLine: resolveId(ids, p.onLine) };
      break;
    case 'circumcenter':
    case 'incenter':
    case 'centroid':
    case 'orthocenter':
      constraint = {
        kind: p.kind,
        vertices: [resolveId(ids, p.vertices[0]), resolveId(ids, p.vertices[1]), resolveId(ids, p.vertices[2])],
      };
      break;
  }

  return {
    id: baseId,
    kind: 'point',
    ...baseFields,
    attrs: { constraint },
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _typecheck: typeof isLineLikeHint = isLineLikeHint;
```

- [ ] **Step 4: Run — PASS**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts -t emitPoint`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/transpile/emitPoint.ts src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts
git commit -m "feat(dsl): emitPoint + intersection inference — PR 3/4"
```

---

### Task 3.2: emitShape — DSL shapes → State

**Files:**
- Create: `src/stamps/geometry-2d/dsl/transpile/emitShape.ts`
- Modify: `src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts`

- [ ] **Step 1: Append failing tests cho emitShape**

Append vào `transpile.emit.test.ts`:

```ts
import { emitShape } from '../transpile/emitShape';
import type { DslShapeT } from '../schema';

function emitS(s: DslShapeT) {
  return emitShape(s, ids);
}

describe('emitShape', () => {
  it('segment', () => {
    const obj = emitS({ name: 'AB', kind: 'segment', p1: 'A', p2: 'B' });
    expect(obj).toMatchObject({ id: 's1', kind: 'segment', label: 'AB' });
    expect(obj.attrs).toEqual({ p1: 'p1', p2: 'p2' });
  });

  it('line (no construction)', () => {
    const obj = emitS({ name: 'L', kind: 'line', p1: 'A', p2: 'B' });
    expect(obj.kind).toBe('line');
    expect(obj.attrs).toEqual({ p1: 'p1', p2: 'p2' });
  });

  it('ray', () => {
    const obj = emitS({ name: 'L', kind: 'ray', origin: 'A', through: 'B' });
    expect(obj.kind).toBe('ray');
    expect(obj.attrs).toEqual({ origin: 'p1', through: 'p2' });
  });

  it('polygon', () => {
    const obj = emitS({ name: 'T', kind: 'polygon', vertices: ['A','B','C'] });
    expect(obj.kind).toBe('polygon');
    expect(obj.attrs).toEqual({ vertices: ['p1','p2','p3'] });
  });

  it('perpendicular → line.construction', () => {
    const obj = emitS({ name: 'L', kind: 'perpendicular', throughPoint: 'A', toLine: 'BC' });
    expect(obj.kind).toBe('line');
    expect(obj.attrs).toEqual({
      construction: { kind: 'perpendicular', throughPoint: 'p1', toLine: 's2' },
    });
  });

  it('parallel → line.construction', () => {
    const obj = emitS({ name: 'L', kind: 'parallel', throughPoint: 'A', toLine: 'BC' });
    expect((obj.attrs as { construction: { kind: string } }).construction.kind).toBe('parallel');
  });

  it('perpBisector → line.construction', () => {
    const obj = emitS({ name: 'L', kind: 'perpBisector', p1: 'A', p2: 'B' });
    expect(obj.attrs).toEqual({
      construction: { kind: 'perpBisector', p1: 'p1', p2: 'p2' },
    });
  });

  it('angleBisector → line.construction', () => {
    const obj = emitS({ name: 'L', kind: 'angleBisector', p1: 'A', vertex: 'B', p2: 'C' });
    expect(obj.attrs).toEqual({
      construction: { kind: 'angleBisector', p1: 'p1', vertex: 'p2', p2: 'p3' },
    });
  });

  it('tangent with branch', () => {
    const obj = emitS({ name: 'L', kind: 'tangent', throughPoint: 'A', toCircle: 'CR', branch: 1 });
    expect(obj.attrs).toEqual({
      construction: { kind: 'tangent', throughPoint: 'p1', toCircle: 'c1', branch: 1 },
    });
  });

  it('tangent without branch — branch field absent', () => {
    const obj = emitS({ name: 'L', kind: 'tangent', throughPoint: 'A', toCircle: 'CR' });
    const c = (obj.attrs as { construction: Record<string, unknown> }).construction;
    expect('branch' in c).toBe(false);
  });

  it('circleCP → center + surfacePoint', () => {
    const obj = emitS({ name: 'CR', kind: 'circleCP', center: 'A', surfacePoint: 'B' });
    expect(obj.kind).toBe('circle');
    expect(obj.attrs).toEqual({ center: 'p1', surfacePoint: 'p2' });
  });

  it('circle3 → construction circumscribed', () => {
    const obj = emitS({ name: 'CR', kind: 'circle3', p1: 'A', p2: 'B', p3: 'C' });
    expect(obj.kind).toBe('circle');
    expect(obj.attrs).toEqual({
      construction: { kind: 'circumscribed', p1: 'p1', p2: 'p2', p3: 'p3' },
    });
  });

  it('SceneObject base fields set', () => {
    const obj = emitS({ name: 'AB', kind: 'segment', p1: 'A', p2: 'B' });
    expect(obj.visible).toBe(true);
    expect(obj.locked).toBe(false);
    expect(obj.layer).toBe('default');
    expect(obj.schemaVersion).toBe(1);
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts -t emitShape`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/stamps/geometry-2d/dsl/transpile/emitShape.ts
import type { SceneObject } from '../../../../core/scene/types';
import type { DslShapeT } from '../schema';

function r(ids: Map<string, string>, name: string): string {
  const id = ids.get(name);
  if (!id) throw new Error(`emitShape: id not assigned for "${name}"`);
  return id;
}

export function emitShape(s: DslShapeT, ids: Map<string, string>): SceneObject {
  const id = r(ids, s.name);
  const base = {
    label: s.name,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
  };

  switch (s.kind) {
    case 'segment':
      return { id, kind: 'segment', ...base, attrs: { p1: r(ids, s.p1), p2: r(ids, s.p2) } };

    case 'line':
      return { id, kind: 'line', ...base, attrs: { p1: r(ids, s.p1), p2: r(ids, s.p2) } };

    case 'ray':
      return { id, kind: 'ray', ...base, attrs: { origin: r(ids, s.origin), through: r(ids, s.through) } };

    case 'polygon':
      return { id, kind: 'polygon', ...base, attrs: { vertices: s.vertices.map((v) => r(ids, v)) } };

    case 'perpendicular':
    case 'parallel':
      return {
        id, kind: 'line', ...base,
        attrs: { construction: { kind: s.kind, throughPoint: r(ids, s.throughPoint), toLine: r(ids, s.toLine) } },
      };

    case 'perpBisector':
      return {
        id, kind: 'line', ...base,
        attrs: { construction: { kind: 'perpBisector', p1: r(ids, s.p1), p2: r(ids, s.p2) } },
      };

    case 'angleBisector':
      return {
        id, kind: 'line', ...base,
        attrs: { construction: { kind: 'angleBisector', p1: r(ids, s.p1), vertex: r(ids, s.vertex), p2: r(ids, s.p2) } },
      };

    case 'tangent': {
      const construction: Record<string, unknown> = {
        kind: 'tangent',
        throughPoint: r(ids, s.throughPoint),
        toCircle: r(ids, s.toCircle),
      };
      if (s.branch !== undefined) construction.branch = s.branch;
      return { id, kind: 'line', ...base, attrs: { construction } };
    }

    case 'circleCP':
      return {
        id, kind: 'circle', ...base,
        attrs: { center: r(ids, s.center), surfacePoint: r(ids, s.surfacePoint) },
      };

    case 'circle3':
      return {
        id, kind: 'circle', ...base,
        attrs: { construction: { kind: 'circumscribed', p1: r(ids, s.p1), p2: r(ids, s.p2), p3: r(ids, s.p3) } },
      };
  }
}
```

- [ ] **Step 4: Run — PASS**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts`
Expected: PASS — 8 (emitPoint) + 13 (emitShape) = 21 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/transpile/emitShape.ts src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts
git commit -m "feat(dsl): emitShape (11 kinds) — PR 3/4"
```

---

### Task 3.3: Main orchestrator + wire barrel

**Files:**
- Create: `src/stamps/geometry-2d/dsl/transpile.ts`
- Modify: `src/stamps/geometry-2d/dsl/index.ts` (replace stub)
- Modify: `src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts` (append orchestrator smoke tests)

- [ ] **Step 1: Append orchestrator smoke tests**

Append vào `transpile.emit.test.ts`:

```ts
import { transpile } from '../transpile';

describe('transpile orchestrator', () => {
  it('happy path: anchor only triangle', () => {
    const r = transpile({
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 4, y: 0 },
        { name: 'C', kind: 'free', x: 2, y: 3.464 },
      ],
      shapes: [{ name: 'T', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
    });
    if (!r.ok) throw new Error('expected ok ' + JSON.stringify(r.errors));
    expect(r.state.order).toEqual(['p1', 'p2', 'p3', 'poly1']);
    expect(Object.keys(r.state.objects)).toHaveLength(4);
    expect(r.state.counter).toBe(4);
    expect(r.state.meta.domain).toBe('2d');
  });

  it('SCHEMA error: malformed input returns early', () => {
    const r = transpile({ version: 1, points: [{ kind: 'free', x: 0, y: 0 }] });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].code).toBe('SCHEMA');
  });

  it('collects validation errors from stages 2-4', () => {
    const r = transpile({
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'A', kind: 'free', x: 1, y: 1 }, // dup
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'Z' }, // unknown ref
      ],
      shapes: [],
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    const codes = r.errors.map((e) => e.code);
    expect(codes).toContain('DUPLICATE_NAME');
    expect(codes).toContain('UNKNOWN_REF');
  });

  it('emits state.order in DSL order', () => {
    const r = transpile({
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
      ],
      shapes: [{ name: 'AB', kind: 'segment', p1: 'A', p2: 'B' }],
    });
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.order).toEqual(['p1', 'p2', 's1']);
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts -t orchestrator`
Expected: FAIL — Cannot find module '../transpile' (or stub returns error).

- [ ] **Step 3: Implement orchestrator**

Create `src/stamps/geometry-2d/dsl/transpile.ts`:

```ts
// src/stamps/geometry-2d/dsl/transpile.ts
import type { SceneObject, State } from '../../../core/scene/types';
import { createEmptyState } from '../../../core/scene/types';
import { DslInput, type DslPointT, type DslShapeT } from './schema';
import { buildSymbols } from './transpile/symbols';
import { validateRefs } from './transpile/refs';
import { detectCycles } from './transpile/cycles';
import { assignIds } from './transpile/ids';
import { emitPoint, type EntityKindHint } from './transpile/emitPoint';
import { emitShape } from './transpile/emitShape';
import { mkError, type TranspileError, type TranspileResult } from './transpile/errors';

function hintOf(entity: DslPointT | DslShapeT): EntityKindHint {
  // points (including intersection) are point-like at scene level.
  if ('kind' in entity) {
    switch (entity.kind) {
      case 'free': case 'midpoint': case 'onSegment': case 'onLine':
      case 'onCircle': case 'perpFoot': case 'circumcenter':
      case 'incenter': case 'centroid': case 'orthocenter': case 'intersection':
        return 'point';
      case 'segment':  return 'segment';
      case 'line':     return 'line';
      case 'ray':      return 'ray';
      case 'polygon':  return 'point'; // not used as ref target in MVP
      case 'perpendicular': case 'parallel': case 'perpBisector':
      case 'angleBisector': case 'tangent':
        return 'lineConstruction';
      case 'circleCP': case 'circle3':
        return 'circle';
    }
  }
  return 'point';
}

export function transpile(dslRaw: unknown): TranspileResult {
  // Stage 1: schema parse
  const parsed = DslInput.safeParse(dslRaw);
  if (!parsed.success) {
    const errors: TranspileError[] = parsed.error.issues.map((iss) =>
      mkError('SCHEMA', iss.message, { path: iss.path.map(String) }),
    );
    return { ok: false, errors };
  }
  const dsl = parsed.data;

  // Stage 2-4: collect errors
  const { symbols, errors: dupErrors } = buildSymbols(dsl);
  const { errors: refErrors } = validateRefs(dsl, symbols);
  const { errors: cycleErrors } = detectCycles(symbols);

  const allErrors = [...dupErrors, ...refErrors, ...cycleErrors];
  if (allErrors.length > 0) return { ok: false, errors: allErrors };

  // Stage 5: id assignment
  const ids = assignIds(symbols);

  // Build kindHints (DSL name → EntityKindHint) cho intersection inference.
  const kindHints = new Map<string, EntityKindHint>();
  for (const [name, sym] of symbols.entries()) {
    kindHints.set(name, hintOf(sym.entity));
  }

  // Stage 6: emit
  const objects: Record<string, SceneObject> = {};
  const order: string[] = [];

  for (const p of dsl.points) {
    const obj = emitPoint(p, ids, kindHints);
    objects[obj.id] = obj;
    order.push(obj.id);
  }
  for (const s of dsl.shapes) {
    const obj = emitShape(s, ids);
    objects[obj.id] = obj;
    order.push(obj.id);
  }

  const empty = createEmptyState('2d');
  const state: State = {
    objects,
    order,
    counter: order.length,
    meta: empty.meta,
  };
  return { ok: true, state };
}
```

- [ ] **Step 4: Wire barrel — replace stub**

Modify `src/stamps/geometry-2d/dsl/index.ts`, thay block stub `export function transpile` bằng:

```ts
export { transpile } from './transpile';
```

(Bỏ stub `import type { TranspileResult } ...` + body cũ.)

- [ ] **Step 5: Run tests + typecheck**

Run: `npm run typecheck && npx jest src/stamps/geometry-2d/dsl`
Expected: PASS — full dsl/ suite ~62 + 4 orchestrator = ~66+ tests.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/dsl/transpile.ts src/stamps/geometry-2d/dsl/index.ts src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts
git commit -m "feat(dsl): main orchestrator + wire barrel — PR 3/4"
```

---

### Task 3.4: PR 3 final verification

- [ ] **Step 1: Test + typecheck + lint**

Run: `npm run typecheck && npm run lint && npm test -- --silent`
Expected: all pass.

PR 3 done. ✅

---

## PR 4 — Fixture corpus + integration tests

### Task 4.1: Fixture `triangle-equilateral`

**Files:**
- Create: `src/stamps/geometry-2d/dsl/fixtures/triangle-equilateral.ts`

- [ ] **Step 1: Create fixture**

```ts
// src/stamps/geometry-2d/dsl/fixtures/triangle-equilateral.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Cho tam giác đều ABC cạnh 4.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 4, y: 0 },
      { name: 'C', kind: 'free', x: 2, y: 3.464 },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
    ],
  },
};
```

- [ ] **Step 2: Quick sanity — transpile in node REPL or commit if confident**

Run: `npm run typecheck`
Expected: pass.

---

### Task 4.2: Fixture `triangle-median`

- [ ] **Step 1: Create**

```ts
// src/stamps/geometry-2d/dsl/fixtures/triangle-median.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC, M là trung điểm BC. Vẽ AM.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'AM', kind: 'segment', p1: 'A', p2: 'M' },
    ],
  },
};
```

---

### Task 4.3: Fixture `triangle-altitude`

- [ ] **Step 1: Create**

```ts
// src/stamps/geometry-2d/dsl/fixtures/triangle-altitude.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC, AH là đường cao xuống BC.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 1, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'AH', kind: 'segment', p1: 'A', p2: 'H' },
    ],
  },
};
```

---

### Task 4.4: Fixture `triangle-centroid`

- [ ] **Step 1: Create**

```ts
// src/stamps/geometry-2d/dsl/fixtures/triangle-centroid.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC, G là trọng tâm.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'G', kind: 'centroid', vertices: ['A', 'B', 'C'] },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
    ],
  },
};
```

---

### Task 4.5: Fixture `triangle-orthocenter`

- [ ] **Step 1: Create**

```ts
// src/stamps/geometry-2d/dsl/fixtures/triangle-orthocenter.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC, H là trực tâm.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'H', kind: 'orthocenter', vertices: ['A', 'B', 'C'] },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
    ],
  },
};
```

---

### Task 4.6: Fixture `triangle-circumcircle`

- [ ] **Step 1: Create**

```ts
// src/stamps/geometry-2d/dsl/fixtures/triangle-circumcircle.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC nội tiếp đường tròn tâm O.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'O', kind: 'circumcenter', vertices: ['A', 'B', 'C'] },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'k', kind: 'circle3', p1: 'A', p2: 'B', p3: 'C' },
    ],
  },
};
```

---

### Task 4.7: Fixture `triangle-incircle`

- [ ] **Step 1: Create**

```ts
// src/stamps/geometry-2d/dsl/fixtures/triangle-incircle.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Tam giác ABC, I là tâm nội tiếp, đường tròn (I) tiếp xúc BC tại D.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
      { name: 'I', kind: 'incenter', vertices: ['A', 'B', 'C'] },
      { name: 'D', kind: 'perpFoot', from: 'I', onLine: 'BC' },
    ],
    shapes: [
      { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
      { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      { name: 'incircle', kind: 'circleCP', center: 'I', surfacePoint: 'D' },
    ],
  },
};
```

---

### Task 4.8: Fixture `parallelogram`

- [ ] **Step 1: Create**

```ts
// src/stamps/geometry-2d/dsl/fixtures/parallelogram.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Hình bình hành ABCD, hai đường chéo AC, BD cắt nhau tại O.',
  dsl: {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 0 },
      { name: 'B', kind: 'free', x: 4, y: 0 },
      { name: 'C', kind: 'free', x: 5, y: 2 },
      { name: 'D', kind: 'free', x: 1, y: 2 },
      { name: 'O', kind: 'intersection', ref1: 'AC', ref2: 'BD' },
    ],
    shapes: [
      { name: 'ABCD', kind: 'polygon', vertices: ['A', 'B', 'C', 'D'] },
      { name: 'AC', kind: 'segment', p1: 'A', p2: 'C' },
      { name: 'BD', kind: 'segment', p1: 'B', p2: 'D' },
    ],
  },
};
```

---

### Task 4.9: Fixture `two-circles-intersect`

- [ ] **Step 1: Create**

```ts
// src/stamps/geometry-2d/dsl/fixtures/two-circles-intersect.ts
import type { DslInputT } from '../schema';

export const fixture: { problem: string; dsl: DslInputT } = {
  problem: 'Hai đường tròn (O₁), (O₂) cắt nhau tại P, Q.',
  dsl: {
    version: 1,
    points: [
      { name: 'O1', kind: 'free', x: 0, y: 0 },
      { name: 'A1', kind: 'free', x: 2, y: 0 },
      { name: 'O2', kind: 'free', x: 3, y: 0 },
      { name: 'A2', kind: 'free', x: 5, y: 0 },
      { name: 'P', kind: 'intersection', ref1: 'k1', ref2: 'k2', branch: 0 },
      { name: 'Q', kind: 'intersection', ref1: 'k1', ref2: 'k2', branch: 1 },
    ],
    shapes: [
      { name: 'k1', kind: 'circleCP', center: 'O1', surfacePoint: 'A1' },
      { name: 'k2', kind: 'circleCP', center: 'O2', surfacePoint: 'A2' },
    ],
  },
};
```

- [ ] **Step 2: Commit tất cả 9 fixtures**

```bash
git add src/stamps/geometry-2d/dsl/fixtures/
git commit -m "feat(dsl): 9 fixture đề Vietnamese textbook — PR 4/4"
```

---

### Task 4.10: Integration test cho fixtures

**Files:**
- Create: `src/stamps/geometry-2d/dsl/__tests__/transpile.fixtures.test.ts`

- [ ] **Step 1: Write test**

```ts
// src/stamps/geometry-2d/dsl/__tests__/transpile.fixtures.test.ts
import { transpile } from '../transpile';

import { fixture as equilateral } from '../fixtures/triangle-equilateral';
import { fixture as median } from '../fixtures/triangle-median';
import { fixture as altitude } from '../fixtures/triangle-altitude';
import { fixture as centroid } from '../fixtures/triangle-centroid';
import { fixture as orthocenter } from '../fixtures/triangle-orthocenter';
import { fixture as circumcircle } from '../fixtures/triangle-circumcircle';
import { fixture as incircle } from '../fixtures/triangle-incircle';
import { fixture as parallelogram } from '../fixtures/parallelogram';
import { fixture as twoCirclesIntersect } from '../fixtures/two-circles-intersect';

const ALL = [
  ['triangle-equilateral', equilateral, 4],
  ['triangle-median', median, 6],
  ['triangle-altitude', altitude, 7],
  ['triangle-centroid', centroid, 5],
  ['triangle-orthocenter', orthocenter, 5],
  ['triangle-circumcircle', circumcircle, 6],
  ['triangle-incircle', incircle, 8],
  ['parallelogram', parallelogram, 8],
  ['two-circles-intersect', twoCirclesIntersect, 8],
] as const;

describe('fixture transpile happy paths', () => {
  it.each(ALL)('%s transpiles OK (expected %i objects)', (_name, fix, expectedCount) => {
    const r = transpile(fix.dsl);
    if (!r.ok) {
      throw new Error('transpile failed: ' + JSON.stringify(r.errors));
    }
    expect(Object.keys(r.state.objects)).toHaveLength(expectedCount);
    expect(r.state.order).toHaveLength(expectedCount);
    expect(r.state.counter).toBe(expectedCount);
    // All ids are valid prefix-counter strings
    for (const id of r.state.order) {
      expect(id).toMatch(/^(p|i|s|l|r|poly|c)\d+$/);
    }
  });
});

describe('representative snapshot', () => {
  it('triangle-equilateral state matches inline snapshot', () => {
    const r = transpile(equilateral.dsl);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state).toMatchInlineSnapshot();
  });

  it('parallelogram state matches inline snapshot', () => {
    const r = transpile(parallelogram.dsl);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state).toMatchInlineSnapshot();
  });
});
```

- [ ] **Step 2: Run — fixture happy path will PASS; snapshots write themselves on first run**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.fixtures.test.ts -u`
Expected: PASS. Snapshots get inlined into the file.

- [ ] **Step 3: Visually verify snapshots make sense**

Read snapshot output for triangle-equilateral + parallelogram. Make sure:
- Each SceneObject has correct `id`, `kind`, `label`, refs resolved
- Intersection in parallelogram has `kind: 'lineLine'`
- Counters logical

- [ ] **Step 4: Run snapshot tests in non-update mode để verify stability**

Run: `npx jest src/stamps/geometry-2d/dsl/__tests__/transpile.fixtures.test.ts`
Expected: PASS without `-u`.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/__tests__/transpile.fixtures.test.ts
git commit -m "test(dsl): fixture integration tests + 2 snapshots — PR 4/4"
```

---

### Task 4.11: PR 4 final verification + release

- [ ] **Step 1: Full suite green**

Run: `npm run typecheck && npm run lint && npm test -- --silent`
Expected: all pass. Total tests ~967 (pre) + ~84 (Phase 2.0) = ~1051. Verify count.

- [ ] **Step 2: Bump version**

Run: `npm version minor -m "chore: release v%s — Phase 2.0 DSL + transpiler"`
Expected: `package.json` → v0.23.0, tag created, commit added.

- [ ] **Step 3: Push**

Run: `git push --follow-tags origin main`
Expected: push origin/main + tag v0.23.0.

- [ ] **Step 4: Defer npm publish**

Note: npm publish defer cùng Phase 2.1 (per spec). Không chạy `npm publish` ở đây.

PR 4 done. ✅ Phase 2.0 complete.

---

## Summary

- 4 PR, 1 subagent / PR pattern
- ~84 new tests trong `src/stamps/geometry-2d/dsl/`
- 0 LLM dependency
- 9 Vietnamese textbook fixtures
- Tag v0.23.0
- Foundation cho Phase 2.1 (Claude SDK integration) — chuẩn bị `src/stamps/geometry-2d/ai/` import `../dsl/`
