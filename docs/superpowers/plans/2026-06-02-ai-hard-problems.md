# AI cho đề Tier 4+5 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mở rộng Intent pipeline cover đề thi vào 10 thường + chuyên (Tier 4+5,
7-12 intent/đề) với thêm 2 intent op + 5 point constraint + 3 circle spec + 6
DSL kind + 4 geometric verify check + 15 fixture mới.

**Architecture:** Additive trên Intent pipeline 4-stage hiện tại (commit `399b45e`).
Không đổi default model (Gemma 4B/12B), focus logic-first. `buildFigure` DSL
free-form path mark `@deprecated`.

**Tech Stack:** TypeScript strict + Zod + Jest 29 + ts-jest. DSL kind = registry
module pattern (Phase 6 refactor). Stage 1 LLM extract → Stage 2 deterministic
builder → Stage 3 JSXGraph render → Stage 4 verify.

**Spec:** [`2026-06-02-ai-hard-problems-design.md`](../specs/2026-06-02-ai-hard-problems-design.md)

**Tinh chỉnh sau khi đọc code:** Spec list 8 DSL kind mới; thực tế chỉ cần **6**
vì `tangentAt` + `tangentFromExt` có thể reuse existing `tangent` shape kind
(với `branch='on'` cho tangentAt, `branch=0|1` cho tangentFromExt — đã có sẵn
trong `kinds/lines/tangent.ts`). Tiết kiệm 2 DSL kind + tests, vẫn đầy đủ
semantics ở Stage 2 + verify.

**File structure:**

NEW files:
- `src/stamps/geometry-2d/dsl/kinds/points/secondIntersection.ts` + test
- `src/stamps/geometry-2d/dsl/kinds/points/circleIntersection.ts` + test
- `src/stamps/geometry-2d/dsl/kinds/points/tangencyPoint.ts` + test
- `src/stamps/geometry-2d/dsl/kinds/points/tangentPointExt.ts` + test
- `src/stamps/geometry-2d/dsl/kinds/circles/circleCR.ts` + test
- `src/stamps/geometry-2d/dsl/kinds/circles/incircle.ts` + test
- `src/stamps/geometry-2d/dsl/kinds/__tests__/` (folder — chứa 6 test mới)
- `src/stamps/geometry-2d/ai/handleGenerateFigureIntent.ts` (Façade mới)
- `src/stamps/geometry-2d/ai/__tests__/handleGenerateFigureIntent.test.ts`

MODIFIED files:
- `src/stamps/geometry-2d/dsl/registry.ts` — import + add vào `ALL_MODULES`
- `src/stamps/geometry-2d/dsl/schema.ts` — extend `DslPointT` + `DslShapeT` unions
- `src/stamps/geometry-2d/ai/intent.ts` — extend `IntentZ` discriminated union
- `src/stamps/geometry-2d/ai/intentEnvelope.ts` — regenerate JSON schema
- `src/stamps/geometry-2d/ai/intentPrompt.ts` — thêm fixture Tier 4+5
- `src/stamps/geometry-2d/ai/intentToDsl.ts` — handler cho ops + constraint mới
- `src/stamps/geometry-2d/ai/verify.ts` — 4 geometric check + recall/precision report
- `src/stamps/geometry-2d/ai/buildFigure.ts` — `@deprecated` JSDoc
- `src/stamps/geometry-2d/ai/handleGenerateFigure.ts` — `@deprecated` JSDoc
- `src/stamps/geometry-2d/ai/index.ts` — export `handleGenerateFigureIntent`
- `src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts` — case mới
- `src/stamps/geometry-2d/ai/__tests__/verify.test.ts` — case mới
- `scripts/eval-intent.ts` — 15 fixture mới + recall/precision/F1
- `CLAUDE.md` — section "Gotchas (AI/DSL pipeline)"
- `package.json` — version bump 0.24.x → 0.25.0

---

## Task 1: New point kind `secondIntersection`

Point là giao điểm thứ 2 của 1 line (hoặc segment) với 1 circle, biết điểm giao
thứ nhất. DSL emit constraint cho JSXGraph render (`intersection` element với
`index=0|1` selector).

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/points/secondIntersection.ts`
- Test: `src/stamps/geometry-2d/dsl/kinds/__tests__/secondIntersection.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/dsl/kinds/__tests__/secondIntersection.test.ts
import { secondIntersectionModule } from '../points/secondIntersection';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (n) => `id_${n}`,
  hintOf: () => 'point',
  mintAuxId: () => 'aux',
};

describe('secondIntersection kind', () => {
  it('parses valid input', () => {
    const r = secondIntersectionModule.schema.safeParse({
      name: 'E', kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A',
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing fields', () => {
    const r = secondIntersectionModule.schema.safeParse({
      name: 'E', kind: 'secondIntersection', line: 'AD',
    });
    expect(r.success).toBe(false);
  });

  it('collects refs', () => {
    const refs = secondIntersectionModule.collectRefs({
      name: 'E', kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A',
    } as never);
    expect(refs).toEqual(['AD', 'O', 'A']);
  });

  it('emits primary point object', () => {
    const out = secondIntersectionModule.emit({
      name: 'E', kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A',
    } as never, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('primary');
    expect(out[0].object.attrs).toMatchObject({
      constraint: {
        kind: 'secondIntersection',
        line: 'id_AD',
        circle: 'id_O',
        other: 'id_A',
      },
    });
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npm test -- src/stamps/geometry-2d/dsl/kinds/__tests__/secondIntersection.test.ts
```
Expected: FAIL with `Cannot find module '../points/secondIntersection'`.

- [ ] **Step 3: Implement kind module**

```ts
// src/stamps/geometry-2d/dsl/kinds/points/secondIntersection.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'secondIntersection' }>;

export const secondIntersectionModule = defineModule<'secondIntersection', Input>({
  kind: 'secondIntersection',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('secondIntersection'),
    line: NameZ,
    circle: NameZ,
    other: NameZ,
  }),
  collectRefs: (e) => [e.line, e.circle, e.other],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      {
        kind: 'secondIntersection',
        line: ctx.resolveId(e.line),
        circle: ctx.resolveId(e.circle),
        other: ctx.resolveId(e.other),
      },
    ),
  }],
});
```

**Lưu ý:** Type `Extract<DslPointT, { kind: 'secondIntersection' }>` sẽ là
`never` cho tới khi Task 7 thêm variant vào `DslPointT` union. Test này chạy
fine vì `as never` cast trong test, nhưng tsc sẽ fail tới Task 7. Plan đi từ
test xanh → integrate → typecheck cuối.

- [ ] **Step 4: Run test, verify PASS**

```bash
npm test -- src/stamps/geometry-2d/dsl/kinds/__tests__/secondIntersection.test.ts
```
Expected: PASS 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/points/secondIntersection.ts \
        src/stamps/geometry-2d/dsl/kinds/__tests__/secondIntersection.test.ts
git commit -m "feat(dsl): point kind secondIntersection (line ∩ circle, biết điểm 1)"
```

---

## Task 2: New point kind `circleIntersection`

Giao 2 đường tròn (first/second). `which: 0|1` chọn nhánh.

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/points/circleIntersection.ts`
- Test: `src/stamps/geometry-2d/dsl/kinds/__tests__/circleIntersection.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/dsl/kinds/__tests__/circleIntersection.test.ts
import { circleIntersectionModule } from '../points/circleIntersection';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (n) => `id_${n}`,
  hintOf: () => 'point',
  mintAuxId: () => 'aux',
};

describe('circleIntersection kind', () => {
  it('parses valid input', () => {
    const r = circleIntersectionModule.schema.safeParse({
      name: 'A', kind: 'circleIntersection', c1: 'O', c2: "Op", which: 0,
    });
    expect(r.success).toBe(true);
  });

  it('rejects out-of-range which', () => {
    const r = circleIntersectionModule.schema.safeParse({
      name: 'A', kind: 'circleIntersection', c1: 'O', c2: "Op", which: 2,
    });
    expect(r.success).toBe(false);
  });

  it('collects refs', () => {
    const refs = circleIntersectionModule.collectRefs({
      name: 'A', kind: 'circleIntersection', c1: 'O', c2: "Op", which: 0,
    } as never);
    expect(refs).toEqual(['O', 'Op']);
  });

  it('emits primary point object', () => {
    const out = circleIntersectionModule.emit({
      name: 'A', kind: 'circleIntersection', c1: 'O', c2: "Op", which: 1,
    } as never, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].object.attrs).toMatchObject({
      constraint: {
        kind: 'circleIntersection',
        c1: 'id_O',
        c2: 'id_Op',
        which: 1,
      },
    });
  });
});
```

- [ ] **Step 2: Run test, verify FAIL** (`Cannot find module`)

```bash
npm test -- src/stamps/geometry-2d/dsl/kinds/__tests__/circleIntersection.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/stamps/geometry-2d/dsl/kinds/points/circleIntersection.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'circleIntersection' }>;

export const circleIntersectionModule = defineModule<'circleIntersection', Input>({
  kind: 'circleIntersection',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circleIntersection'),
    c1: NameZ,
    c2: NameZ,
    which: z.union([z.literal(0), z.literal(1)]),
  }),
  collectRefs: (e) => [e.c1, e.c2],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      {
        kind: 'circleIntersection',
        c1: ctx.resolveId(e.c1),
        c2: ctx.resolveId(e.c2),
        which: e.which,
      },
    ),
  }],
});
```

- [ ] **Step 4: Run test, verify PASS** (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/points/circleIntersection.ts \
        src/stamps/geometry-2d/dsl/kinds/__tests__/circleIntersection.test.ts
git commit -m "feat(dsl): point kind circleIntersection (giao 2 circle, which 0|1)"
```

---

## Task 3: New point kind `tangencyPoint`

Tiếp điểm của đường tròn nội tiếp (hoặc bất kỳ circle nội tiếp shape) với 1
cạnh. Dùng cho "(I) tiếp xúc BC tại D".

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/points/tangencyPoint.ts`
- Test: `src/stamps/geometry-2d/dsl/kinds/__tests__/tangencyPoint.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/dsl/kinds/__tests__/tangencyPoint.test.ts
import { tangencyPointModule } from '../points/tangencyPoint';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (n) => `id_${n}`,
  hintOf: () => 'point',
  mintAuxId: () => 'aux',
};

describe('tangencyPoint kind', () => {
  it('parses valid input', () => {
    const r = tangencyPointModule.schema.safeParse({
      name: 'D', kind: 'tangencyPoint', circle: 'I', onLine: 'BC',
    });
    expect(r.success).toBe(true);
  });

  it('collects refs', () => {
    const refs = tangencyPointModule.collectRefs({
      name: 'D', kind: 'tangencyPoint', circle: 'I', onLine: 'BC',
    } as never);
    expect(refs).toEqual(['I', 'BC']);
  });

  it('emits primary point object', () => {
    const out = tangencyPointModule.emit({
      name: 'D', kind: 'tangencyPoint', circle: 'I', onLine: 'BC',
    } as never, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].object.attrs).toMatchObject({
      constraint: {
        kind: 'tangencyPoint',
        circle: 'id_I',
        onLine: 'id_BC',
      },
    });
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

- [ ] **Step 3: Implement**

```ts
// src/stamps/geometry-2d/dsl/kinds/points/tangencyPoint.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'tangencyPoint' }>;

export const tangencyPointModule = defineModule<'tangencyPoint', Input>({
  kind: 'tangencyPoint',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('tangencyPoint'),
    circle: NameZ,
    onLine: NameZ,
  }),
  collectRefs: (e) => [e.circle, e.onLine],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      {
        kind: 'tangencyPoint',
        circle: ctx.resolveId(e.circle),
        onLine: ctx.resolveId(e.onLine),
      },
    ),
  }],
});
```

- [ ] **Step 4: Run test, verify PASS** (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/points/tangencyPoint.ts \
        src/stamps/geometry-2d/dsl/kinds/__tests__/tangencyPoint.test.ts
git commit -m "feat(dsl): point kind tangencyPoint (tiếp điểm incircle với cạnh)"
```

---

## Task 4: New point kind `tangentPointExt`

Tiếp điểm khi vẽ tiếp tuyến từ điểm ngoài tới circle. `which: 0|1` chọn tiếp
điểm.

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/points/tangentPointExt.ts`
- Test: `src/stamps/geometry-2d/dsl/kinds/__tests__/tangentPointExt.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/dsl/kinds/__tests__/tangentPointExt.test.ts
import { tangentPointExtModule } from '../points/tangentPointExt';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (n) => `id_${n}`,
  hintOf: () => 'point',
  mintAuxId: () => 'aux',
};

describe('tangentPointExt kind', () => {
  it('parses valid input', () => {
    const r = tangentPointExtModule.schema.safeParse({
      name: 'B', kind: 'tangentPointExt', from: 'A', circle: 'O', which: 0,
    });
    expect(r.success).toBe(true);
  });

  it('rejects out-of-range which', () => {
    const r = tangentPointExtModule.schema.safeParse({
      name: 'B', kind: 'tangentPointExt', from: 'A', circle: 'O', which: 2,
    });
    expect(r.success).toBe(false);
  });

  it('collects refs', () => {
    const refs = tangentPointExtModule.collectRefs({
      name: 'B', kind: 'tangentPointExt', from: 'A', circle: 'O', which: 0,
    } as never);
    expect(refs).toEqual(['A', 'O']);
  });

  it('emits primary point object', () => {
    const out = tangentPointExtModule.emit({
      name: 'B', kind: 'tangentPointExt', from: 'A', circle: 'O', which: 1,
    } as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: {
        kind: 'tangentPointExt',
        from: 'id_A',
        circle: 'id_O',
        which: 1,
      },
    });
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

- [ ] **Step 3: Implement**

```ts
// src/stamps/geometry-2d/dsl/kinds/points/tangentPointExt.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'tangentPointExt' }>;

export const tangentPointExtModule = defineModule<'tangentPointExt', Input>({
  kind: 'tangentPointExt',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('tangentPointExt'),
    from: NameZ,
    circle: NameZ,
    which: z.union([z.literal(0), z.literal(1)]),
  }),
  collectRefs: (e) => [e.from, e.circle],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      {
        kind: 'tangentPointExt',
        from: ctx.resolveId(e.from),
        circle: ctx.resolveId(e.circle),
        which: e.which,
      },
    ),
  }],
});
```

- [ ] **Step 4: Run test, verify PASS** (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/points/tangentPointExt.ts \
        src/stamps/geometry-2d/dsl/kinds/__tests__/tangentPointExt.test.ts
git commit -m "feat(dsl): point kind tangentPointExt (tiếp điểm khi tangent từ ngoài)"
```

---

## Task 5: New circle kind `circleCR`

Đường tròn cho bởi center + numeric radius. Cho đề "(O; R=3)" hoặc "(O; 2cm)".

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/circles/circleCR.ts`
- Test: `src/stamps/geometry-2d/dsl/kinds/__tests__/circleCR.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/dsl/kinds/__tests__/circleCR.test.ts
import { circleCRModule } from '../circles/circleCR';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (n) => `id_${n}`,
  hintOf: () => 'point',
  mintAuxId: () => 'aux',
};

describe('circleCR kind', () => {
  it('parses valid input', () => {
    const r = circleCRModule.schema.safeParse({
      name: 'O', kind: 'circleCR', center: 'O', radius: 3,
    });
    expect(r.success).toBe(true);
  });

  it('rejects negative radius', () => {
    const r = circleCRModule.schema.safeParse({
      name: 'O', kind: 'circleCR', center: 'O', radius: -1,
    });
    expect(r.success).toBe(false);
  });

  it('rejects zero radius', () => {
    const r = circleCRModule.schema.safeParse({
      name: 'O', kind: 'circleCR', center: 'O', radius: 0,
    });
    expect(r.success).toBe(false);
  });

  it('collects refs', () => {
    const refs = circleCRModule.collectRefs({
      name: 'O', kind: 'circleCR', center: 'O', radius: 3,
    } as never);
    expect(refs).toEqual(['O']);
  });

  it('emits primary circle object', () => {
    const out = circleCRModule.emit({
      name: 'C1', kind: 'circleCR', center: 'O', radius: 2.5,
    } as never, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('primary');
    expect(out[0].object).toMatchObject({
      id: 'id_C1',
      kind: 'circle',
      attrs: { center: 'id_O', radius: 2.5 },
    });
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

- [ ] **Step 3: Implement**

```ts
// src/stamps/geometry-2d/dsl/kinds/circles/circleCR.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'circleCR' }>;

export const circleCRModule = defineModule<'circleCR', Input>({
  kind: 'circleCR',
  role: 'circle',
  category: 'circles',
  prefix: 'c',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circleCR'),
    center: NameZ,
    radius: z.number().positive(),
  }),
  collectRefs: (e) => [e.center],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'circle',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: { center: ctx.resolveId(e.center), radius: e.radius },
    },
  }],
});
```

- [ ] **Step 4: Run test, verify PASS** (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/circles/circleCR.ts \
        src/stamps/geometry-2d/dsl/kinds/__tests__/circleCR.test.ts
git commit -m "feat(dsl): circle kind circleCR (center + numeric radius)"
```

---

## Task 6: New circle kind `incircle`

Đường tròn nội tiếp tam giác. Stage 3 (JSXGraph) compute incenter + inradius
từ 3 đỉnh; DSL chỉ emit reference tới 3 vertex.

**Files:**
- Create: `src/stamps/geometry-2d/dsl/kinds/circles/incircle.ts`
- Test: `src/stamps/geometry-2d/dsl/kinds/__tests__/incircle.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/dsl/kinds/__tests__/incircle.test.ts
import { incircleModule } from '../circles/incircle';
import type { EmitContext } from '../_types';

const ctx: EmitContext = {
  resolveId: (n) => `id_${n}`,
  hintOf: () => 'point',
  mintAuxId: () => 'aux',
};

describe('incircle kind', () => {
  it('parses valid input', () => {
    const r = incircleModule.schema.safeParse({
      name: 'I', kind: 'incircle', vertices: ['A', 'B', 'C'],
    });
    expect(r.success).toBe(true);
  });

  it('rejects non-tuple-3 vertices', () => {
    const r = incircleModule.schema.safeParse({
      name: 'I', kind: 'incircle', vertices: ['A', 'B'],
    });
    expect(r.success).toBe(false);
  });

  it('collects refs', () => {
    const refs = incircleModule.collectRefs({
      name: 'I', kind: 'incircle', vertices: ['A', 'B', 'C'],
    } as never);
    expect(refs).toEqual(['A', 'B', 'C']);
  });

  it('emits primary circle object referencing 3 vertices', () => {
    const out = incircleModule.emit({
      name: 'I', kind: 'incircle', vertices: ['A', 'B', 'C'],
    } as never, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].object).toMatchObject({
      id: 'id_I',
      kind: 'circle',
      attrs: { vertices: ['id_A', 'id_B', 'id_C'] },
    });
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

- [ ] **Step 3: Implement**

```ts
// src/stamps/geometry-2d/dsl/kinds/circles/incircle.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'incircle' }>;

export const incircleModule = defineModule<'incircle', Input>({
  kind: 'incircle',
  role: 'circle',
  category: 'circles',
  prefix: 'c',
  schema: z.object({
    name: NameZ,
    kind: z.literal('incircle'),
    vertices: z.tuple([NameZ, NameZ, NameZ]),
  }),
  collectRefs: (e) => [...e.vertices],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'circle',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: {
        kind: 'incircle',
        vertices: [
          ctx.resolveId(e.vertices[0]),
          ctx.resolveId(e.vertices[1]),
          ctx.resolveId(e.vertices[2]),
        ],
      },
    },
  }],
});
```

- [ ] **Step 4: Run test, verify PASS** (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/dsl/kinds/circles/incircle.ts \
        src/stamps/geometry-2d/dsl/kinds/__tests__/incircle.test.ts
git commit -m "feat(dsl): circle kind incircle (đường tròn nội tiếp tam giác)"
```

---

## Task 7: Wire 6 kinds vào registry + extend schema unions

**Files:**
- Modify: `src/stamps/geometry-2d/dsl/registry.ts`
- Modify: `src/stamps/geometry-2d/dsl/schema.ts` (extend DslPointT + DslShapeT)

- [ ] **Step 1: Write failing test (registry contains new kinds)**

```ts
// src/stamps/geometry-2d/dsl/__tests__/registry-new-kinds.test.ts
import { KIND_REGISTRY, POINT_KINDS, CIRCLE_KINDS } from '../registry';

describe('registry — Tier 4+5 kinds', () => {
  const POINT_NEW = ['secondIntersection', 'circleIntersection', 'tangencyPoint', 'tangentPointExt'];
  const CIRCLE_NEW = ['circleCR', 'incircle'];

  it.each(POINT_NEW)('registers point kind %s', (k) => {
    expect(KIND_REGISTRY.has(k)).toBe(true);
    expect(POINT_KINDS.has(k)).toBe(true);
  });

  it.each(CIRCLE_NEW)('registers circle kind %s', (k) => {
    expect(KIND_REGISTRY.has(k)).toBe(true);
    expect(CIRCLE_KINDS.has(k)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify FAIL** (`expect(...).toBe(true) received false`)

- [ ] **Step 3: Modify `registry.ts` — add 6 imports + entries**

Append imports trước `const ALL_MODULES`:
```ts
import { secondIntersectionModule } from './kinds/points/secondIntersection';
import { circleIntersectionModule } from './kinds/points/circleIntersection';
import { tangencyPointModule } from './kinds/points/tangencyPoint';
import { tangentPointExtModule } from './kinds/points/tangentPointExt';
import { circleCRModule } from './kinds/circles/circleCR';
import { incircleModule } from './kinds/circles/incircle';
```

Trong `ALL_MODULES`:
```ts
const ALL_MODULES: ReadonlyArray<DslKindModule> = [
  freeModule, midpointModule, onSegmentModule, onLineModule, onCircleModule,
  perpFootModule, circumcenterModule, incenterModule, centroidModule,
  orthocenterModule, intersectionModule,
  // NEW Tier 4+5 points
  secondIntersectionModule, circleIntersectionModule, tangencyPointModule, tangentPointExtModule,
  segmentModule, lineModule, rayModule,
  perpendicularModule, parallelModule, perpBisectorModule,
  angleBisectorModule, tangentModule,
  polygonModule,
  circleCPModule, circle3Module,
  // NEW Tier 4+5 circles
  circleCRModule, incircleModule,
];
```

- [ ] **Step 4: Modify `schema.ts` — extend `DslPointT` + `DslShapeT` unions**

Replace 2 type aliases:
```ts
export type DslPointT =
  | { name: Name; kind: 'free'; x: number; y: number }
  | { name: Name; kind: 'midpoint'; p1: Name; p2: Name }
  | { name: Name; kind: 'onSegment'; segmentId: Name; t: number }
  | { name: Name; kind: 'onLine'; lineId: Name; t: number }
  | { name: Name; kind: 'onCircle'; circleId: Name; theta: number }
  | { name: Name; kind: 'perpFoot'; from: Name; onLine: Name }
  | { name: Name; kind: 'circumcenter'; vertices: [Name, Name, Name] }
  | { name: Name; kind: 'incenter'; vertices: [Name, Name, Name] }
  | { name: Name; kind: 'centroid'; vertices: [Name, Name, Name] }
  | { name: Name; kind: 'orthocenter'; vertices: [Name, Name, Name] }
  | { name: Name; kind: 'intersection'; ref1: Name; ref2: Name; branch?: 0 | 1 }
  // NEW Tier 4+5
  | { name: Name; kind: 'secondIntersection'; line: Name; circle: Name; other: Name }
  | { name: Name; kind: 'circleIntersection'; c1: Name; c2: Name; which: 0 | 1 }
  | { name: Name; kind: 'tangencyPoint'; circle: Name; onLine: Name }
  | { name: Name; kind: 'tangentPointExt'; from: Name; circle: Name; which: 0 | 1 };
```

Tìm `export type DslShapeT =` rồi append 2 variants (đầu cuối tuỳ vị trí trong file):
```ts
  // NEW Tier 4+5
  | { name: Name; kind: 'circleCR'; center: Name; radius: number }
  | { name: Name; kind: 'incircle'; vertices: [Name, Name, Name] };
```

- [ ] **Step 5: Run all DSL tests + typecheck**

```bash
npm test -- src/stamps/geometry-2d/dsl/
npm run typecheck
```

Expected: all 6 new kind tests PASS, registry test PASS, typecheck PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/dsl/registry.ts \
        src/stamps/geometry-2d/dsl/schema.ts \
        src/stamps/geometry-2d/dsl/__tests__/registry-new-kinds.test.ts
git commit -m "feat(dsl): register 6 Tier 4+5 kinds + extend DslPointT/DslShapeT"
```

---

## Task 8: Intent schema — `draw-line`, `mark-shape`, mở rộng circle spec + constraints

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intent.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/intent.test.ts` (mới)

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/ai/__tests__/intent.test.ts
import { IntentZ } from '../intent';

describe('Intent schema — Tier 4+5 additions', () => {
  describe('draw-line op', () => {
    it('parses perpThrough', () => {
      const r = IntentZ.safeParse({
        op: 'draw-line', name: 'd', kind: 'perpThrough', through: 'M', to: 'AB',
      });
      expect(r.success).toBe(true);
    });
    it('parses parallelThrough', () => {
      const r = IntentZ.safeParse({
        op: 'draw-line', name: 'd', kind: 'parallelThrough', through: 'M', to: 'AB',
      });
      expect(r.success).toBe(true);
    });
    it('parses tangentAt', () => {
      const r = IntentZ.safeParse({
        op: 'draw-line', name: 't', kind: 'tangentAt', through: 'A', circle: 'O',
      });
      expect(r.success).toBe(true);
    });
    it('parses tangentFromExt which=both', () => {
      const r = IntentZ.safeParse({
        op: 'draw-line', name: 'AB', kind: 'tangentFromExt', from: 'A', circle: 'O', which: 'both',
      });
      expect(r.success).toBe(true);
    });
  });

  describe('mark-shape op', () => {
    it('parses triangle from existing labels', () => {
      const r = IntentZ.safeParse({
        op: 'mark-shape', shape: 'triangle', labels: ['A', 'B', 'H'],
      });
      expect(r.success).toBe(true);
    });
    it('parses quadrilateral', () => {
      const r = IntentZ.safeParse({
        op: 'mark-shape', shape: 'quadrilateral', labels: ['A', 'B', 'C', 'D'],
      });
      expect(r.success).toBe(true);
    });
  });

  describe('draw-circle new specs', () => {
    it('parses centerRadius', () => {
      const r = IntentZ.safeParse({
        op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 3,
      });
      expect(r.success).toBe(true);
    });
    it('parses inscribedIn', () => {
      const r = IntentZ.safeParse({
        op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A', 'B', 'C'],
      });
      expect(r.success).toBe(true);
    });
  });

  describe('add-point new constraints', () => {
    it('parses secondIntersection', () => {
      const r = IntentZ.safeParse({
        op: 'add-point', name: 'E', constraint: {
          kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A',
        },
      });
      expect(r.success).toBe(true);
    });
    it('parses circleIntersection', () => {
      const r = IntentZ.safeParse({
        op: 'add-point', name: 'A', constraint: {
          kind: 'circleIntersection', c1: 'O', c2: "Op", which: 0,
        },
      });
      expect(r.success).toBe(true);
    });
    it('parses tangencyPoint', () => {
      const r = IntentZ.safeParse({
        op: 'add-point', name: 'D', constraint: {
          kind: 'tangencyPoint', circle: 'I', onLine: 'BC',
        },
      });
      expect(r.success).toBe(true);
    });
    it('parses tangentPoint', () => {
      const r = IntentZ.safeParse({
        op: 'add-point', name: 'B', constraint: {
          kind: 'tangentPoint', from: 'A', circle: 'O', which: 0,
        },
      });
      expect(r.success).toBe(true);
    });
    it('parses angleBisectorFoot', () => {
      const r = IntentZ.safeParse({
        op: 'add-point', name: 'D', constraint: {
          kind: 'angleBisectorFoot', from: 'A', onLine: 'BC',
        },
      });
      expect(r.success).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npm test -- src/stamps/geometry-2d/ai/__tests__/intent.test.ts
```
Expected: 12 FAIL (schema chưa biết các op/constraint mới).

- [ ] **Step 3: Modify `intent.ts`**

Trong file, sau `DrawCircleIntentZ`, thêm 2 op mới + mở rộng `DrawCircleIntentZ`
spec enum:

```ts
// DrawCircleIntentZ — replace existing definition
export const DrawCircleIntentZ = z.object({
  op: z.literal('draw-circle'),
  name: LabelZ,
  spec: z.enum(['centerThrough', 'through3', 'centerRadius', 'inscribedIn']),
  center: LabelZ.optional(),
  through: LabelZ.optional(),
  points: z.tuple([LabelZ, LabelZ, LabelZ]).optional(),
  // NEW Tier 4+5
  radius: z.number().positive().optional(),       // for centerRadius
  triangle: z.tuple([LabelZ, LabelZ, LabelZ]).optional(), // for inscribedIn
});

// NEW op — draw-line
export const DrawLineIntentZ = z.object({
  op: z.literal('draw-line'),
  name: LabelZ,
  kind: z.enum(['perpThrough', 'parallelThrough', 'tangentAt', 'tangentFromExt']),
  through: LabelZ.optional(),
  to: LabelZ.optional(),
  from: LabelZ.optional(),
  circle: LabelZ.optional(),
  which: z.enum(['first', 'second', 'both']).optional(),
});

// NEW op — mark-shape (sub-shape từ điểm đã có, không tạo coord mới)
export const MarkShapeIntentZ = z.object({
  op: z.literal('mark-shape'),
  shape: z.enum(['triangle', 'quadrilateral']),
  labels: z.array(LabelZ).min(3).max(4),
});
```

Replace `AddPointIntentZ` constraint discriminated union (extend):
```ts
export const AddPointIntentZ = z.object({
  op: z.literal('add-point'),
  name: LabelZ,
  constraint: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('midpoint'), of: z.string() }),
    z.object({ kind: z.literal('perpFoot'), from: LabelZ, onLine: z.string() }),
    z.object({ kind: z.literal('centroid'), of: z.tuple([LabelZ, LabelZ, LabelZ]) }),
    z.object({ kind: z.literal('circumcenter'), of: z.tuple([LabelZ, LabelZ, LabelZ]) }),
    z.object({ kind: z.literal('incenter'), of: z.tuple([LabelZ, LabelZ, LabelZ]) }),
    z.object({ kind: z.literal('orthocenter'), of: z.tuple([LabelZ, LabelZ, LabelZ]) }),
    z.object({ kind: z.literal('intersection'), of: z.tuple([z.string(), z.string()]) }),
    z.object({ kind: z.literal('onSegment'), of: z.string(), t: z.number().min(0).max(1).optional() }),
    z.object({ kind: z.literal('free'), at: z.tuple([z.number(), z.number()]).optional() }),
    // NEW Tier 4+5
    z.object({ kind: z.literal('secondIntersection'), line: z.string(), circle: LabelZ, other: LabelZ }),
    z.object({ kind: z.literal('circleIntersection'), c1: LabelZ, c2: LabelZ, which: z.union([z.literal(0), z.literal(1)]) }),
    z.object({ kind: z.literal('tangencyPoint'), circle: LabelZ, onLine: z.string() }),
    z.object({ kind: z.literal('tangentPoint'), from: LabelZ, circle: LabelZ, which: z.union([z.literal(0), z.literal(1)]) }),
    z.object({ kind: z.literal('angleBisectorFoot'), from: LabelZ, onLine: z.string() }),
  ]),
});
```

Replace master `IntentZ` (thêm 2 variants):
```ts
export const IntentZ = z.discriminatedUnion('op', [
  DrawShapeIntentZ,
  AddPointIntentZ,
  ConnectIntentZ,
  DrawCircleIntentZ,
  DrawLineIntentZ,   // NEW
  MarkShapeIntentZ,  // NEW
]);
```

Thêm type exports:
```ts
export type DrawLineIntentT = z.infer<typeof DrawLineIntentZ>;
export type MarkShapeIntentT = z.infer<typeof MarkShapeIntentZ>;
```

- [ ] **Step 4: Run test, verify PASS** (12 tests)

```bash
npm test -- src/stamps/geometry-2d/ai/__tests__/intent.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/intent.ts \
        src/stamps/geometry-2d/ai/__tests__/intent.test.ts
git commit -m "feat(ai): intent schema +2 op (draw-line/mark-shape) +5 constraint +2 circle spec"
```

---

## Task 9: Regenerate envelope JSON schema (`intentEnvelope.ts`)

Ollama dùng JSON schema mode để force structured output. Sau khi mở rộng zod
schema cần regenerate.

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intentEnvelope.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/intentEnvelope.test.ts` (mới)

- [ ] **Step 1: Đọc file hiện tại**

```bash
cat src/stamps/geometry-2d/ai/intentEnvelope.ts
```

(File ~30 dòng, dùng `zodToJsonSchema` hoặc tay-built JSON.)

- [ ] **Step 2: Write failing test**

```ts
// src/stamps/geometry-2d/ai/__tests__/intentEnvelope.test.ts
import { intentEnvelopeJsonSchema } from '../intentEnvelope';

describe('intentEnvelopeJsonSchema — Tier 4+5 coverage', () => {
  it('exposes draw-line op in intents enum/union', () => {
    const json = JSON.stringify(intentEnvelopeJsonSchema);
    expect(json).toContain('draw-line');
    expect(json).toContain('perpThrough');
    expect(json).toContain('tangentFromExt');
  });

  it('exposes mark-shape op', () => {
    expect(JSON.stringify(intentEnvelopeJsonSchema)).toContain('mark-shape');
  });

  it('exposes new circle specs', () => {
    const json = JSON.stringify(intentEnvelopeJsonSchema);
    expect(json).toContain('centerRadius');
    expect(json).toContain('inscribedIn');
  });

  it('exposes new add-point constraint kinds', () => {
    const json = JSON.stringify(intentEnvelopeJsonSchema);
    expect(json).toContain('secondIntersection');
    expect(json).toContain('circleIntersection');
    expect(json).toContain('tangencyPoint');
    expect(json).toContain('tangentPoint');
    expect(json).toContain('angleBisectorFoot');
  });
});
```

- [ ] **Step 3: Run test, verify FAIL** (chưa regen JSON)

- [ ] **Step 4: Inspect current source + regen**

Mở file. Nếu dùng `zod-to-json-schema` lib: chỉ cần re-export, schema tự cập nhật
khi zod schema thay đổi. Verify bằng test pass mà không sửa.

Nếu hard-coded JSON: rewrite bằng `zod-to-json-schema`:
```ts
// src/stamps/geometry-2d/ai/intentEnvelope.ts
import { zodToJsonSchema } from 'zod-to-json-schema';
import { IntentEnvelopeZ } from './intent';

export const intentEnvelopeJsonSchema = zodToJsonSchema(IntentEnvelopeZ, {
  name: 'IntentEnvelope',
  target: 'openApi3',
});
```

Nếu `zod-to-json-schema` chưa có trong deps:
```bash
npm install zod-to-json-schema
```

- [ ] **Step 5: Run test, verify PASS** (4 tests)

```bash
npm test -- src/stamps/geometry-2d/ai/__tests__/intentEnvelope.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/ai/intentEnvelope.ts \
        src/stamps/geometry-2d/ai/__tests__/intentEnvelope.test.ts \
        package.json package-lock.json
git commit -m "feat(ai): regen envelope JSON schema cover Tier 4+5 intent ops"
```

---

## Task 10: Stage 2 builder — handlers cho draw-line/mark-shape/circleCR/inscribedIn/constraints mới

Mở rộng `intentToDsl.ts` để map intent mới → DSL. Logic deterministic.

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intentToDsl.ts`
- Modify: `src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts`

- [ ] **Step 1: Write failing tests**

Append vào file test:
```ts
// src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts (append)
import { intentsToDsl } from '../intentToDsl';

describe('intentsToDsl — Tier 4+5', () => {
  it('handles draw-circle centerRadius (numeric R)', () => {
    const dsl = intentsToDsl([
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 3 },
    ] as never);
    // 1 free point O at canonical + 1 circleCR
    expect(dsl.points.find((p) => p.name === 'O' && p.kind === 'free')).toBeDefined();
    const c = dsl.shapes.find((s) => s.kind === 'circleCR');
    expect(c).toMatchObject({ name: 'O', kind: 'circleCR', center: 'O', radius: 3 });
  });

  it('handles draw-circle inscribedIn', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A','B','C'] },
    ] as never);
    const c = dsl.shapes.find((s) => s.kind === 'incircle');
    expect(c).toMatchObject({ name: 'I', kind: 'incircle', vertices: ['A','B','C'] });
  });

  it('handles add-point secondIntersection', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A','B','C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A' } },
    ] as never);
    expect(dsl.points.find((p) => p.kind === 'secondIntersection' && p.name === 'E'))
      .toMatchObject({ line: 'AD', circle: 'O', other: 'A' });
  });

  it('handles add-point circleIntersection', () => {
    const dsl = intentsToDsl([
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 2 },
      { op: 'draw-circle', name: 'Op', spec: 'centerRadius', center: 'Op', radius: 2 },
      { op: 'add-point', name: 'A', constraint: { kind: 'circleIntersection', c1: 'O', c2: 'Op', which: 0 } },
      { op: 'add-point', name: 'B', constraint: { kind: 'circleIntersection', c1: 'O', c2: 'Op', which: 1 } },
    ] as never);
    expect(dsl.points.filter((p) => p.kind === 'circleIntersection')).toHaveLength(2);
  });

  it('handles add-point tangencyPoint', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A','B','C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'BC' } },
    ] as never);
    expect(dsl.points.find((p) => p.kind === 'tangencyPoint' && p.name === 'D'))
      .toMatchObject({ circle: 'I', onLine: 'BC' });
  });

  it('handles add-point tangentPoint (which=0 + which=1)', () => {
    const dsl = intentsToDsl([
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 2 },
      { op: 'add-point', name: 'A', constraint: { kind: 'free', at: [5, 0] } },
      { op: 'add-point', name: 'B', constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 0 } },
      { op: 'add-point', name: 'C', constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 1 } },
    ] as never);
    const tangentPts = dsl.points.filter((p) => p.kind === 'tangentPointExt');
    expect(tangentPts).toHaveLength(2);
  });

  it('handles add-point angleBisectorFoot', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'add-point', name: 'D', constraint: { kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' } },
    ] as never);
    // Emit: angleBisector A→BC line + intersection D với BC
    expect(dsl.shapes.find((s) => s.kind === 'angleBisector')).toBeDefined();
    expect(dsl.points.find((p) => p.name === 'D' && p.kind === 'intersection')).toBeDefined();
  });

  it('handles draw-line perpThrough', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'draw-line', name: 'd', kind: 'perpThrough', through: 'M', to: 'BC' },
    ] as never);
    expect(dsl.shapes.find((s) => s.kind === 'perpendicular' && s.name === 'd'))
      .toMatchObject({ throughPoint: 'M', toLine: 'BC' });
  });

  it('handles draw-line tangentAt', () => {
    const dsl = intentsToDsl([
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 2 },
      { op: 'add-point', name: 'A', constraint: { kind: 'free', at: [2, 0] } },
      { op: 'draw-line', name: 't', kind: 'tangentAt', through: 'A', circle: 'O' },
    ] as never);
    expect(dsl.shapes.find((s) => s.kind === 'tangent' && s.name === 't'))
      .toMatchObject({ throughPoint: 'A', toCircle: 'O', branch: 'on' });
  });

  it('handles draw-line tangentFromExt which=both', () => {
    const dsl = intentsToDsl([
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 2 },
      { op: 'add-point', name: 'P', constraint: { kind: 'free', at: [5, 0] } },
      { op: 'draw-line', name: 't', kind: 'tangentFromExt', from: 'P', circle: 'O', which: 'both' },
    ] as never);
    const tangents = dsl.shapes.filter((s) => s.kind === 'tangent');
    expect(tangents).toHaveLength(2);
    expect(tangents.map((t) => (t as any).branch).sort()).toEqual([0, 1]);
  });

  it('handles mark-shape on existing labels', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'right-at-A' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'mark-shape', shape: 'triangle', labels: ['A','B','H'] },
    ] as never);
    // polygon shape ABH với 3 vertex đã có
    const poly = dsl.shapes.find((s) => s.kind === 'polygon' && (s as any).vertices?.join('') === 'ABH');
    expect(poly).toBeDefined();
  });

  it('throws on mark-shape referencing unknown label', () => {
    expect(() => intentsToDsl([
      { op: 'mark-shape', shape: 'triangle', labels: ['X','Y','Z'] },
    ] as never)).toThrow(/mark-shape/);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL** (11 new tests fail)

```bash
npm test -- src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts
```

- [ ] **Step 3: Implement handlers**

Edit `intentToDsl.ts`. Trong `handleDrawCircle`, thêm 2 spec branches:

```ts
function handleDrawCircle(s: BuildState, intent: DrawCircleIntentT) {
  if (intent.spec === 'centerThrough') {
    if (!intent.center || !intent.through) {
      throw new IntentBuilderError('centerThrough cần center + through', intent);
    }
    addShape(s, { name: intent.name, kind: 'circleCP', center: intent.center, surfacePoint: intent.through });
  } else if (intent.spec === 'through3') {
    if (!intent.points) throw new IntentBuilderError('through3 cần points', intent);
    addShape(s, { name: intent.name, kind: 'circle3', p1: intent.points[0], p2: intent.points[1], p3: intent.points[2] });
  } else if (intent.spec === 'centerRadius') {
    if (!intent.center || intent.radius === undefined) {
      throw new IntentBuilderError('centerRadius cần center + radius', intent);
    }
    // Ensure center point exists. Canonical position: (4, 2) nếu lần đầu xuất hiện.
    if (!s.points.find((p) => p.name === intent.center)) {
      addPoint(s, { name: intent.center, kind: 'free', x: 4, y: 2 });
    }
    addShape(s, { name: intent.name, kind: 'circleCR', center: intent.center, radius: intent.radius });
  } else if (intent.spec === 'inscribedIn') {
    if (!intent.triangle) throw new IntentBuilderError('inscribedIn cần triangle', intent);
    // Triangle 3 vertices phải đã tồn tại (emit từ draw-shape trước đó)
    for (const v of intent.triangle) {
      if (!s.points.find((p) => p.name === v)) {
        throw new IntentBuilderError(`inscribedIn: vertex ${v} chưa định nghĩa`, intent);
      }
    }
    addShape(s, { name: intent.name, kind: 'incircle', vertices: intent.triangle });
  }
}
```

Trong `handleAddPoint`, append 5 case mới (sau case `'free'`):

```ts
    case 'secondIntersection':
      addPoint(s, {
        name, kind: 'secondIntersection',
        line: c.line, circle: c.circle, other: c.other,
      });
      break;
    case 'circleIntersection':
      addPoint(s, {
        name, kind: 'circleIntersection',
        c1: c.c1, c2: c.c2, which: c.which,
      });
      break;
    case 'tangencyPoint':
      addPoint(s, {
        name, kind: 'tangencyPoint',
        circle: c.circle, onLine: c.onLine,
      });
      break;
    case 'tangentPoint':
      addPoint(s, {
        name, kind: 'tangentPointExt',
        from: c.from, circle: c.circle, which: c.which,
      });
      break;
    case 'angleBisectorFoot': {
      // Emit: angleBisector từ vertex + intersection với cạnh đối diện
      const ends = parseEnds(c.onLine);
      if (!ends) throw new IntentBuilderError(`angleBisectorFoot.onLine không parse: ${c.onLine}`, intent);
      const bisName = uniqueShapeName(s, `ab_${c.from}${c.onLine}`);
      addShape(s, { name: bisName, kind: 'angleBisector', vertex: c.from, p1: ends[0], p2: ends[1] });
      ensureSegment(s, ends[0], ends[1]);
      addPoint(s, { name, kind: 'intersection', ref1: bisName, ref2: c.onLine });
      break;
    }
```

**Note:** `angleBisector` DSL kind hiện có schema `{vertex, p1, p2}` hay `{p1,
p2, p3}`? Đọc `kinds/lines/angleBisector.ts` để verify trước khi đặt field names.
Nếu khác, điều chỉnh.

Thêm 2 handler mới ở cuối, trước `intentsToDsl`:

```ts
function handleDrawLine(s: BuildState, intent: DrawLineIntentT) {
  switch (intent.kind) {
    case 'perpThrough': {
      if (!intent.through || !intent.to) throw new IntentBuilderError('perpThrough cần through + to', intent);
      addShape(s, { name: intent.name, kind: 'perpendicular', throughPoint: intent.through, toLine: intent.to });
      break;
    }
    case 'parallelThrough': {
      if (!intent.through || !intent.to) throw new IntentBuilderError('parallelThrough cần through + to', intent);
      addShape(s, { name: intent.name, kind: 'parallel', throughPoint: intent.through, toLine: intent.to });
      break;
    }
    case 'tangentAt': {
      if (!intent.through || !intent.circle) throw new IntentBuilderError('tangentAt cần through + circle', intent);
      addShape(s, { name: intent.name, kind: 'tangent', throughPoint: intent.through, toCircle: intent.circle, branch: 'on' });
      break;
    }
    case 'tangentFromExt': {
      if (!intent.from || !intent.circle) throw new IntentBuilderError('tangentFromExt cần from + circle', intent);
      if (intent.which === 'both') {
        addShape(s, { name: `${intent.name}_0`, kind: 'tangent', throughPoint: intent.from, toCircle: intent.circle, branch: 0 });
        addShape(s, { name: `${intent.name}_1`, kind: 'tangent', throughPoint: intent.from, toCircle: intent.circle, branch: 1 });
      } else {
        const branch = intent.which === 'second' ? 1 : 0;
        addShape(s, { name: intent.name, kind: 'tangent', throughPoint: intent.from, toCircle: intent.circle, branch });
      }
      break;
    }
  }
}

function handleMarkShape(s: BuildState, intent: MarkShapeIntentT) {
  // Tất cả labels phải đã tồn tại trong state
  for (const label of intent.labels) {
    if (!s.points.find((p) => p.name === label)) {
      throw new IntentBuilderError(`mark-shape: label ${label} chưa định nghĩa`, intent);
    }
  }
  const polyName = uniqueShapeName(s, intent.labels.join(''));
  addShape(s, { name: polyName, kind: 'polygon', vertices: [...intent.labels] });
}
```

Update `intentsToDsl` switch:
```ts
export function intentsToDsl(intents: readonly IntentT[]): DslInputT {
  const s = newState();
  for (const intent of intents) {
    switch (intent.op) {
      case 'draw-shape': handleDrawShape(s, intent); break;
      case 'add-point': handleAddPoint(s, intent); break;
      case 'connect': handleConnect(s, intent); break;
      case 'draw-circle': handleDrawCircle(s, intent); break;
      case 'draw-line': handleDrawLine(s, intent); break;
      case 'mark-shape': handleMarkShape(s, intent); break;
    }
  }
  return { version: 1, points: s.points, shapes: s.shapes };
}
```

Thêm imports nếu missing:
```ts
import type { DrawLineIntentT, MarkShapeIntentT } from './intent';
```

- [ ] **Step 4: Run tests, verify PASS** (all old + 11 new tests)

```bash
npm test -- src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/intentToDsl.ts \
        src/stamps/geometry-2d/ai/__tests__/intentToDsl.test.ts
git commit -m "feat(ai): Stage 2 builder cho draw-line/mark-shape + 5 constraint + 2 circle spec"
```

---

## Task 11: Stage 4 verify — 4 geometric check + recall/precision report

Verify nhận DSL transpiled + computed coords (từ JSXGraph runtime, mock trong
test). Detect mismatch geometric.

**Files:**
- Modify: `src/stamps/geometry-2d/ai/verify.ts`
- Modify: `src/stamps/geometry-2d/ai/__tests__/verify.test.ts`

- [ ] **Step 1: Write failing tests**

Append vào `verify.test.ts`:
```ts
// src/stamps/geometry-2d/ai/__tests__/verify.test.ts (append)
import { verifyGeometric, computeIntentMetrics, type VerifyReport } from '../verify';

describe('verifyGeometric — tangent-touch', () => {
  it('passes when distance(center, line) ≈ radius', () => {
    const dsl = {
      version: 1 as const,
      points: [
        { name: 'O', kind: 'free' as const, x: 0, y: 0 },
        { name: 'A', kind: 'free' as const, x: 2, y: 0 },
      ],
      shapes: [
        { name: 'c', kind: 'circleCR' as const, center: 'O', radius: 2 },
        { name: 't', kind: 'tangent' as const, throughPoint: 'A', toCircle: 'c', branch: 'on' as const },
      ],
    };
    // Tangent at A on circle (O, r=2) — A trên đường tròn → tangent đúng touch
    const r = verifyGeometric(dsl as never);
    expect(r.geometric.find((i) => i.detail.includes('tangent-touch'))).toBeUndefined();
  });

  it('fails when tangent line không touch circle', () => {
    const dsl = {
      version: 1 as const,
      points: [
        { name: 'O', kind: 'free' as const, x: 0, y: 0 },
        { name: 'A', kind: 'free' as const, x: 5, y: 0 },
        { name: 'B', kind: 'free' as const, x: 0, y: 5 },
      ],
      shapes: [
        { name: 'c', kind: 'circleCR' as const, center: 'O', radius: 1 },
        // line AB qua (5,0)→(0,5), distance từ O = 5/√2 ≈ 3.54 ≠ 1
        { name: 'l', kind: 'segment' as const, p1: 'A', p2: 'B' },
        { name: 't', kind: 'tangent' as const, throughPoint: 'A', toCircle: 'c', branch: 'on' as const },
      ],
    };
    // Force-check on segment 'l' if it claims to be tangent (synthetic — verify uses metadata)
    // For this test: replace with simulating a tangent claim that fails
    // Adjust per actual verify API
  });
});

describe('verifyGeometric — on-circle', () => {
  it('passes when distance(point, center) ≈ radius', () => {
    const dsl = {
      version: 1 as const,
      points: [
        { name: 'O', kind: 'free' as const, x: 0, y: 0 },
        { name: 'P', kind: 'onCircle' as const, circleId: 'c', theta: 0 },
      ],
      shapes: [
        { name: 'c', kind: 'circleCR' as const, center: 'O', radius: 3 },
      ],
    };
    const r = verifyGeometric(dsl as never);
    expect(r.ok).toBe(true);
  });
});

describe('computeIntentMetrics — recall/precision/F1', () => {
  it('exact match → P=R=F=1', () => {
    const expected = [
      { op: 'draw-shape' as const, shape: 'triangle' as const, labels: ['A','B','C'], variant: 'any' as const },
      { op: 'add-point' as const, name: 'M', constraint: { kind: 'midpoint' as const, of: 'BC' } },
    ];
    const actual = [...expected];
    const m = computeIntentMetrics(expected as never, actual as never);
    expect(m.recall).toBe(1);
    expect(m.precision).toBe(1);
    expect(m.f1).toBe(1);
  });

  it('missing 1/4 → recall=0.75 precision=1', () => {
    const expected = [
      { op: 'draw-shape' as const, shape: 'triangle' as const, labels: ['A','B','C'], variant: 'any' as const },
      { op: 'add-point' as const, name: 'M', constraint: { kind: 'midpoint' as const, of: 'BC' } },
      { op: 'add-point' as const, name: 'N', constraint: { kind: 'midpoint' as const, of: 'AC' } },
      { op: 'connect' as const, from: 'M', to: 'N', style: 'segment' as const },
    ];
    const actual = expected.slice(0, 3);  // missing connect
    const m = computeIntentMetrics(expected as never, actual as never);
    expect(m.recall).toBeCloseTo(0.75);
    expect(m.precision).toBe(1);
  });

  it('extra 1 → recall=1 precision=0.5', () => {
    const expected = [
      { op: 'draw-shape' as const, shape: 'triangle' as const, labels: ['A','B','C'], variant: 'any' as const },
    ];
    const actual = [
      ...expected,
      { op: 'add-point' as const, name: 'M', constraint: { kind: 'midpoint' as const, of: 'BC' } },
    ];
    const m = computeIntentMetrics(expected as never, actual as never);
    expect(m.recall).toBe(1);
    expect(m.precision).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL**

```bash
npm test -- src/stamps/geometry-2d/ai/__tests__/verify.test.ts
```

- [ ] **Step 3: Implement extensions in `verify.ts`**

Append:
```ts
// src/stamps/geometry-2d/ai/verify.ts (append)

// ---------------------------------------------------------------------------
// Geometric verification on DSL with resolved coords
// ---------------------------------------------------------------------------

export interface IntentMetrics {
  recall: number;
  precision: number;
  f1: number;
  matched: number;
  expected: number;
  actual: number;
}

export function computeIntentMetrics(
  expected: readonly IntentT[],
  actual: readonly IntentT[],
): IntentMetrics {
  const expectedKeys = expected.map(intentKey);
  const actualKeys = actual.map(intentKey);
  const matched = new Set<number>();
  let hit = 0;
  for (const ek of expectedKeys) {
    const idx = actualKeys.findIndex((ak, i) => !matched.has(i) && ak === ek);
    if (idx >= 0) { matched.add(idx); hit++; }
  }
  const recall = expectedKeys.length === 0 ? 1 : hit / expectedKeys.length;
  const precision = actualKeys.length === 0 ? 1 : hit / actualKeys.length;
  const f1 = (recall + precision) === 0 ? 0 : (2 * recall * precision) / (recall + precision);
  return { recall, precision, f1, matched: hit, expected: expectedKeys.length, actual: actualKeys.length };
}

// Resolve canonical (x,y) for a point name from DSL.
function resolveCoord(dsl: DslInputT, name: string): [number, number] | null {
  const p = dsl.points.find((x) => x.name === name);
  if (!p) return null;
  if (p.kind === 'free') return [p.x, p.y];
  if (p.kind === 'midpoint') {
    const a = resolveCoord(dsl, p.p1);
    const b = resolveCoord(dsl, p.p2);
    if (!a || !b) return null;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }
  // Other kinds: compute via JSXGraph at runtime; for static verify only support
  // free/midpoint. Geometric check skipped for derived points (already guaranteed
  // by construction).
  return null;
}

const TOL = 1e-3;

export function verifyGeometric(dsl: DslInputT): VerifyReport {
  const geometric: VerifyIssue[] = [];

  for (const shape of dsl.shapes) {
    if (shape.kind === 'circleCR') {
      // on-circle check: any point with onCircle ref this circle
      for (const p of dsl.points) {
        if (p.kind !== 'onCircle' || p.circleId !== shape.name) continue;
        const c = resolveCoord(dsl, shape.center);
        const pp = resolveCoord(dsl, p.name);
        if (!c || !pp) continue;
        const d = Math.hypot(pp[0] - c[0], pp[1] - c[1]);
        if (Math.abs(d - shape.radius) > TOL) {
          geometric.push({ axis: 'wrong', detail: `on-circle: |${p.name}-${shape.name}|=${d.toFixed(3)} ≠ R=${shape.radius}` });
        }
      }
    }
  }

  return { ok: geometric.length === 0, missing: [], wrong: [], extra: [], geometric } as VerifyReport;
}
```

Update `VerifyReport` interface (add `geometric` field, optional cho backward compat):
```ts
export interface VerifyReport {
  readonly ok: boolean;
  readonly missing: readonly VerifyIssue[];
  readonly wrong: readonly VerifyIssue[];
  readonly extra: readonly VerifyIssue[];
  readonly geometric?: readonly VerifyIssue[];  // NEW (optional)
}
```

**Lưu ý scope giảm:** Spec list 4 check (tangent-touch / concyclic / on-circle /
collinear). Static verify chỉ làm được khi tất cả point reduce được về `free`
coord — tức là phần lớn check geometric thật phải chạy runtime trên JSXGraph
board. Plan này implement **on-circle** (case dễ nhất) như proof-of-concept; 3
check khác cần JSXGraph board hook (out of scope cho task này, defer sang task
follow-up sau khi đo eval kết quả).

- [ ] **Step 4: Run tests, verify PASS**

```bash
npm test -- src/stamps/geometry-2d/ai/__tests__/verify.test.ts
```

(Note: 2 test cho tangent-touch fail-case có thể skip với `it.todo()` — sẽ
implement khi hook JSXGraph runtime trong task riêng.)

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/verify.ts \
        src/stamps/geometry-2d/ai/__tests__/verify.test.ts
git commit -m "feat(ai): verify computeIntentMetrics (recall/precision/F1) + on-circle check"
```

---

## Task 12: Extend intentPrompt với fixture Tier 4+5

LLM cần in-prompt ví dụ để học pattern mới. Thêm 5-7 fixture đại diện (không
hết 15 — token budget).

**Files:**
- Modify: `src/stamps/geometry-2d/ai/intentPrompt.ts`
- Modify: `src/stamps/geometry-2d/ai/__tests__/prompt.test.ts` (nếu có; nếu không
  bỏ qua test, prompt review thủ công)

- [ ] **Step 1: Write smoke test**

```ts
// src/stamps/geometry-2d/ai/__tests__/intentPrompt-tier45.test.ts
import { buildIntentSystemPrompt } from '../intentPrompt';

describe('intentPrompt — Tier 4+5 coverage', () => {
  const prompt = buildIntentSystemPrompt();

  it('contains draw-line op example', () => {
    expect(prompt).toContain('draw-line');
  });
  it('contains mark-shape op example', () => {
    expect(prompt).toContain('mark-shape');
  });
  it('contains tangent example', () => {
    expect(prompt).toContain('tangentFromExt');
  });
  it('contains second-intersection example', () => {
    expect(prompt).toContain('secondIntersection');
  });
  it('contains incircle example', () => {
    expect(prompt).toContain('inscribedIn');
  });

  it('explains mark-shape vs draw-shape rule', () => {
    expect(prompt.toLowerCase()).toContain('label đã tồn tại');
  });

  it('keeps prompt under reasonable budget (< 12 KB)', () => {
    expect(prompt.length).toBeLessThan(12_000);
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

- [ ] **Step 3: Extend `intentPrompt.ts`**

Append vào `FIXTURES` array (sau Tier 1 examples cũ):
```ts
  // === Tier 4+5 examples ===
  // Tiếp tuyến từ điểm ngoài
  {
    problem: 'Cho (O; R=3) và điểm A ngoài (O). Vẽ 2 tiếp tuyến AB, AC tới (O) (B, C là tiếp điểm).',
    intents: [
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 3 },
      { op: 'add-point', name: 'A', constraint: { kind: 'free', at: [5, 0] } },
      { op: 'draw-line', name: 'tBC', kind: 'tangentFromExt', from: 'A', circle: 'O', which: 'both' },
      { op: 'add-point', name: 'B', constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 0 } },
      { op: 'add-point', name: 'C', constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 1 } },
      { op: 'connect', from: 'B', to: 'C', style: 'segment' },
    ],
  },
  // 2 đường tròn cắt nhau + cát tuyến
  {
    problem: 'Cho (O) và (O\') cắt nhau tại A, B. Qua A vẽ cát tuyến cắt (O) tại C, cắt (O\') tại D.',
    intents: [
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 2 },
      { op: 'draw-circle', name: "Op", spec: 'centerRadius', center: "Op", radius: 2 },
      { op: 'add-point', name: 'A', constraint: { kind: 'circleIntersection', c1: 'O', c2: "Op", which: 0 } },
      { op: 'add-point', name: 'B', constraint: { kind: 'circleIntersection', c1: 'O', c2: "Op", which: 1 } },
      { op: 'add-point', name: 'C', constraint: { kind: 'secondIntersection', line: 'AC', circle: 'O', other: 'A' } },
      { op: 'add-point', name: 'D', constraint: { kind: 'secondIntersection', line: 'AC', circle: "Op", other: 'A' } },
    ],
  },
  // Đường tròn nội tiếp + tiếp điểm 3 cạnh
  {
    problem: 'Cho ΔABC. (I) là đường tròn nội tiếp tiếp xúc BC, CA, AB tại D, E, F.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A','B','C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'CA' } },
      { op: 'add-point', name: 'F', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'AB' } },
    ],
  },
  // mark-shape (sub-triangle ABH từ điểm có sẵn)
  {
    problem: 'Cho ΔABC vuông tại A, AH là đường cao (H∈BC). Xét ΔABH.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'right-at-A' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'connect', from: 'A', to: 'H', style: 'segment' },
      { op: 'mark-shape', shape: 'triangle', labels: ['A','B','H'] },
    ],
  },
  // Phân giác cắt đường tròn ngoại tiếp
  {
    problem: 'Cho ΔABC nội tiếp (O). Phân giác AD của góc A cắt (O) tại E (E≠A).',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A','B','C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A' } },
    ],
  },
```

Trong section "Quy tắc tuyệt đối" của prompt, append rule:
```
- Nếu label đã tồn tại từ intent trước (vd A, B, H đã có) → dùng **mark-shape**
  để đặt tên sub-shape, KHÔNG dùng draw-shape (sẽ tạo coord mới sai).
- Khi đề có "(O; R=3)" hoặc "(O; bán kính 3)" → dùng draw-circle spec=centerRadius.
- Khi đề có "đường tròn nội tiếp ΔABC" → spec=inscribedIn.
- "Tiếp tuyến từ A ngoài (O)" → draw-line kind=tangentFromExt + 2 add-point
  tangentPoint với which=0/1.
- "Phân giác AD của góc A" → add-point D constraint=angleBisectorFoot.
- "Giao điểm thứ 2" của line với circle → constraint=secondIntersection,
  pass `other` là điểm giao thứ nhất đã biết.
```

- [ ] **Step 4: Run test, verify PASS** (7 tests)

```bash
npm test -- src/stamps/geometry-2d/ai/__tests__/intentPrompt-tier45.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/intentPrompt.ts \
        src/stamps/geometry-2d/ai/__tests__/intentPrompt-tier45.test.ts
git commit -m "feat(ai): prompt thêm 5 fixture Tier 4+5 + rule mark-shape/tangent/incircle"
```

---

## Task 13: Eval script — thêm 15 fixture + recall/precision/F1 metric

**Files:**
- Modify: `scripts/eval-intent.ts`

- [ ] **Step 1: Đọc cuối file để biết Summary section**

```bash
tail -60 scripts/eval-intent.ts
```

- [ ] **Step 2: Append 15 fixture mới vào array `PROBLEMS`**

Sau `Tier 3` block, trước `Refuse`:

```ts
  // ===== Tier 4 — vào 10 thường (10) =====
  {
    id: 't4-ortho-mark', tier: 4, text: 'Cho tam giác ABC nhọn. Đường cao AD, BE, CF cắt tại H. Vẽ tam giác DEF.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'add-point', name: 'D', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'perpFoot', from: 'B', onLine: 'AC' } },
      { op: 'add-point', name: 'F', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
      { op: 'add-point', name: 'H', constraint: { kind: 'intersection', of: ['AD','BE'] } },
      { op: 'mark-shape', shape: 'triangle', labels: ['D','E','F'] },
    ],
  },
  {
    id: 't4-tangent-ext', tier: 4, text: 'Cho (O; R=3) và điểm A ngoài (O), OA=5. Từ A vẽ 2 tiếp tuyến AB, AC tới (O) (B, C là tiếp điểm). Vẽ BC. Gọi H là giao của OA và BC.',
    expectedIntents: [
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 3 },
      { op: 'add-point', name: 'A', constraint: { kind: 'free', at: [5, 0] } },
      { op: 'draw-line', name: 'tBC', kind: 'tangentFromExt', from: 'A', circle: 'O', which: 'both' },
      { op: 'add-point', name: 'B', constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 0 } },
      { op: 'add-point', name: 'C', constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 1 } },
      { op: 'connect', from: 'B', to: 'C', style: 'segment' },
      { op: 'add-point', name: 'H', constraint: { kind: 'intersection', of: ['OA','BC'] } },
    ],
  },
  {
    id: 't4-2circles-secant', tier: 4, text: 'Cho (O) và (O\') cắt nhau tại A, B. Qua A vẽ cát tuyến cắt (O) tại C, cắt (O\') tại D (C, D ≠ A). Vẽ BC, BD.',
    expectedIntents: [
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 2 },
      { op: 'draw-circle', name: "Op", spec: 'centerRadius', center: "Op", radius: 2 },
      { op: 'add-point', name: 'A', constraint: { kind: 'circleIntersection', c1: 'O', c2: "Op", which: 0 } },
      { op: 'add-point', name: 'B', constraint: { kind: 'circleIntersection', c1: 'O', c2: "Op", which: 1 } },
      { op: 'add-point', name: 'C', constraint: { kind: 'secondIntersection', line: 'AC', circle: 'O', other: 'A' } },
      { op: 'add-point', name: 'D', constraint: { kind: 'secondIntersection', line: 'AC', circle: "Op", other: 'A' } },
      { op: 'connect', from: 'B', to: 'C', style: 'segment' },
      { op: 'connect', from: 'B', to: 'D', style: 'segment' },
    ],
  },
  {
    id: 't4-incircle-gergonne', tier: 4, text: 'Cho tam giác ABC. (I) nội tiếp tiếp xúc BC, CA, AB tại D, E, F. Vẽ AD, BE, CF.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A','B','C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'CA' } },
      { op: 'add-point', name: 'F', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'AB' } },
      { op: 'connect', from: 'A', to: 'D', style: 'segment' },
      { op: 'connect', from: 'B', to: 'E', style: 'segment' },
      { op: 'connect', from: 'C', to: 'F', style: 'segment' },
    ],
  },
  {
    id: 't4-cyclic-bcef', tier: 4, text: 'Cho tam giác ABC, đường cao BE (E∈AC) và CF (F∈AB). Đường tròn ngoại tiếp tứ giác BCEF có tâm M.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'add-point', name: 'E', constraint: { kind: 'perpFoot', from: 'B', onLine: 'AC' } },
      { op: 'add-point', name: 'F', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'draw-circle', name: 'k', spec: 'through3', points: ['B','C','E'] },
    ],
  },
  {
    id: 't4-median-extend', tier: 4, text: 'Cho tam giác ABC, AM là trung tuyến (M∈BC). Trọng tâm G. N là trung điểm AM. Vẽ BN kéo dài cắt AC tại P.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'add-point', name: 'G', constraint: { kind: 'centroid', of: ['A','B','C'] } },
      { op: 'add-point', name: 'N', constraint: { kind: 'midpoint', of: 'AM' } },
      { op: 'connect', from: 'A', to: 'M', style: 'segment' },
      { op: 'connect', from: 'B', to: 'N', style: 'line' },
      { op: 'add-point', name: 'P', constraint: { kind: 'intersection', of: ['BN','AC'] } },
    ],
  },
  {
    id: 't4-bisector-circumcircle', tier: 4, text: 'Cho tam giác ABC nội tiếp (O). Phân giác AD của góc A (D∈BC) cắt (O) tại E (E≠A). Phân giác BF (F∈AC) cắt (O) tại K (K≠B).',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A','B','C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' } },
      { op: 'add-point', name: 'F', constraint: { kind: 'angleBisectorFoot', from: 'B', onLine: 'AC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A' } },
      { op: 'add-point', name: 'K', constraint: { kind: 'secondIntersection', line: 'BF', circle: 'O', other: 'B' } },
    ],
  },
  {
    id: 't4-medial-feet', tier: 4, text: 'Cho tam giác ABC nhọn, trực tâm H. M, N, P là trung điểm BC, CA, AB. D, E, F là chân đường cao từ A, B, C. Vẽ đường tròn đi qua M, N, P.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A','B','C'] } },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'add-point', name: 'N', constraint: { kind: 'midpoint', of: 'CA' } },
      { op: 'add-point', name: 'P', constraint: { kind: 'midpoint', of: 'AB' } },
      { op: 'add-point', name: 'D', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'perpFoot', from: 'B', onLine: 'CA' } },
      { op: 'add-point', name: 'F', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
      { op: 'draw-circle', name: 'nine', spec: 'through3', points: ['M','N','P'] },
    ],
  },
  {
    id: 't4-tangent-at-chain', tier: 4, text: 'Cho (O) và A trên (O). Vẽ tiếp tuyến At tại A. Lấy B trên At (B ≠ A). Vẽ tiếp tuyến từ B tới (O) tiếp xúc tại C ≠ A.',
    expectedIntents: [
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 2 },
      { op: 'add-point', name: 'A', constraint: { kind: 'free', at: [2, 0] } },
      { op: 'draw-line', name: 'tA', kind: 'tangentAt', through: 'A', circle: 'O' },
      { op: 'add-point', name: 'B', constraint: { kind: 'onSegment', of: 'tA', t: 0.7 } },
      { op: 'draw-line', name: 'tB', kind: 'tangentFromExt', from: 'B', circle: 'O', which: 'both' },
      { op: 'add-point', name: 'C', constraint: { kind: 'tangentPoint', from: 'B', circle: 'O', which: 1 } },
    ],
  },
  {
    id: 't4-perpbis-circumcenter', tier: 4, text: 'Cho tam giác ABC. Đường trung trực AB và AC cắt nhau tại O.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'connect', from: 'A', to: 'B', style: 'perpBisector' },
      { op: 'connect', from: 'A', to: 'C', style: 'perpBisector' },
      { op: 'add-point', name: 'O', constraint: { kind: 'circumcenter', of: ['A','B','C'] } },
    ],
  },

  // ===== Tier 5 — vào 10 chuyên (5) =====
  {
    id: 't5-altitude-circle', tier: 5, text: 'Cho tam giác ABC vuông tại A, đường cao AH (H∈BC). Đường tròn tâm A bán kính AH cắt AB tại P, cắt AC tại Q. M là trung điểm PQ. AM kéo dài cắt BC tại N.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'right-at-A' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'connect', from: 'A', to: 'H', style: 'segment' },
      { op: 'draw-circle', name: 'cA', spec: 'centerThrough', center: 'A', through: 'H' },
      { op: 'add-point', name: 'P', constraint: { kind: 'secondIntersection', line: 'AB', circle: 'cA', other: 'A' } },
      { op: 'add-point', name: 'Q', constraint: { kind: 'secondIntersection', line: 'AC', circle: 'cA', other: 'A' } },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'PQ' } },
      { op: 'connect', from: 'A', to: 'M', style: 'line' },
      { op: 'add-point', name: 'N', constraint: { kind: 'intersection', of: ['AM','BC'] } },
    ],
  },
  {
    id: 't5-incircle-circumcircle-arc', tier: 5, text: 'Cho tam giác ABC nội tiếp (O), (I) là đường tròn nội tiếp tiếp xúc BC tại D. Đường thẳng AI cắt (O) tại M ≠ A. Vẽ MD, MO.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A','B','C'] },
      { op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A','B','C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'BC' } },
      { op: 'add-point', name: 'M', constraint: { kind: 'secondIntersection', line: 'AI', circle: 'O', other: 'A' } },
      { op: 'connect', from: 'M', to: 'D', style: 'segment' },
      { op: 'connect', from: 'M', to: 'O', style: 'segment' },
    ],
  },
  {
    id: 't5-cyclic-quad-mids', tier: 5, text: 'Cho tứ giác ABCD nội tiếp (O). AC và BD cắt tại P. M, N là trung điểm AB, CD. MN cắt AC tại E, cắt BD tại F.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'quadrilateral', labels: ['A','B','C','D'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A','B','C'] },
      { op: 'connect', from: 'A', to: 'C', style: 'segment' },
      { op: 'connect', from: 'B', to: 'D', style: 'segment' },
      { op: 'add-point', name: 'P', constraint: { kind: 'intersection', of: ['AC','BD'] } },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'AB' } },
      { op: 'add-point', name: 'N', constraint: { kind: 'midpoint', of: 'CD' } },
      { op: 'connect', from: 'M', to: 'N', style: 'line' },
      { op: 'add-point', name: 'E', constraint: { kind: 'intersection', of: ['MN','AC'] } },
      { op: 'add-point', name: 'F', constraint: { kind: 'intersection', of: ['MN','BD'] } },
    ],
  },
  {
    id: 't5-nine-point-full', tier: 5, text: 'Cho tam giác ABC nhọn, trực tâm H. M, N, P là trung điểm BC, CA, AB. D, E, F là chân đường cao từ A, B, C. X, Y, Z là trung điểm AH, BH, CH. Vẽ đường tròn 9 điểm.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A','B','C'] } },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'add-point', name: 'N', constraint: { kind: 'midpoint', of: 'CA' } },
      { op: 'add-point', name: 'P', constraint: { kind: 'midpoint', of: 'AB' } },
      { op: 'add-point', name: 'D', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'perpFoot', from: 'B', onLine: 'CA' } },
      { op: 'add-point', name: 'F', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
      { op: 'add-point', name: 'X', constraint: { kind: 'midpoint', of: 'AH' } },
      { op: 'add-point', name: 'Y', constraint: { kind: 'midpoint', of: 'BH' } },
      { op: 'add-point', name: 'Z', constraint: { kind: 'midpoint', of: 'CH' } },
      { op: 'draw-circle', name: 'nine', spec: 'through3', points: ['M','N','P'] },
    ],
  },
  {
    id: 't5-2-incircles-tangent', tier: 5, text: 'Cho tam giác ABC vuông tại A, đường cao AH. Gọi (I1) và (I2) là đường tròn nội tiếp tam giác ABH và ACH. Tiếp điểm của (I1) với BH là D, của (I2) với CH là E. Vẽ DE.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'right-at-A' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'connect', from: 'A', to: 'H', style: 'segment' },
      { op: 'mark-shape', shape: 'triangle', labels: ['A','B','H'] },
      { op: 'mark-shape', shape: 'triangle', labels: ['A','C','H'] },
      { op: 'draw-circle', name: 'I1', spec: 'inscribedIn', triangle: ['A','B','H'] },
      { op: 'draw-circle', name: 'I2', spec: 'inscribedIn', triangle: ['A','C','H'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I1', onLine: 'BH' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'tangencyPoint', circle: 'I2', onLine: 'CH' } },
      { op: 'connect', from: 'D', to: 'E', style: 'segment' },
    ],
  },
```

- [ ] **Step 3: Cập nhật `Problem` type để chấp nhận tier 4 | 5**

Tìm:
```ts
interface Problem {
  id: string;
  tier: 0 | 1 | 2 | 3 | 'R';
  ...
}
```

Sửa:
```ts
  tier: 0 | 1 | 2 | 3 | 4 | 5 | 'R';
```

Tương tự `RunResult.tier`, `tiers` array trong Summary.

- [ ] **Step 4: Thêm recall/precision/F1 vào Summary**

Trong hàm `run()`, sau aggregate "3-axis", thêm:
```ts
  // F1 metric
  const f1Buildable = buildableResults.filter((r) => r.intents);
  let sumRecall = 0, sumPrec = 0;
  let n = 0;
  for (const r of f1Buildable) {
    const p = PROBLEMS.find((x) => x.id === r.id)!;
    const m = computeIntentMetrics(p.expectedIntents as never, r.intents! as never);
    sumRecall += m.recall;
    sumPrec += m.precision;
    n++;
  }
  const avgRecall = n === 0 ? 0 : sumRecall / n;
  const avgPrec = n === 0 ? 0 : sumPrec / n;
  const avgF1 = (avgRecall + avgPrec) === 0 ? 0 : (2 * avgRecall * avgPrec) / (avgRecall + avgPrec);
  console.log(
    `Avg Recall=${(avgRecall * 100).toFixed(1)}% Precision=${(avgPrec * 100).toFixed(1)}% F1=${(avgF1 * 100).toFixed(1)}%`,
  );
```

Thêm import:
```ts
import { computeIntentMetrics } from '../src/stamps/geometry-2d/ai/verify';
```

- [ ] **Step 5: Smoke-run script (offline; no Ollama needed cho parse check)**

```bash
npx tsc --noEmit scripts/eval-intent.ts || true   # check syntax
npm run typecheck
```

Expected: typecheck PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/eval-intent.ts
git commit -m "feat(eval): +15 fixture Tier 4+5 (7-12 intent/đề) + recall/precision/F1"
```

---

## Task 14: Run eval gemma3:4b + 12b, capture metrics, iterate prompt nếu fail

Manual task — không phải code. Yêu cầu Ollama local + 2 model đã pull.

- [ ] **Step 1: Verify Ollama up + model available**

```bash
ollama list | grep -E 'gemma3:(4b|12b)'
```

Nếu thiếu: `ollama pull gemma3:12b` (~7GB, mất 5-15 phút).

- [ ] **Step 2: Run eval gemma3:4b**

```bash
npx tsx scripts/eval-intent.ts gemma3:4b 2>&1 | tee /tmp/eval-4b.txt
```

Capture metrics: Recall, Precision, F1 trên Tier 4 + Tier 5 separately.

- [ ] **Step 3: Run eval gemma3:12b**

```bash
npx tsx scripts/eval-intent.ts gemma3:12b 2>&1 | tee /tmp/eval-12b.txt
```

- [ ] **Step 4: Compare vs success criteria từ spec**

| Metric | Target 4b | Target 12b | Actual 4b | Actual 12b |
|---|---|---|---|---|
| Recall | ≥0.75 | ≥0.90 | ? | ? |
| Precision | ≥0.80 | ≥0.92 | ? | ? |
| F1 | ≥0.77 | ≥0.91 | ? | ? |
| 0 false-positive refuse | required | required | ? | ? |

- [ ] **Step 5: Nếu pass → commit results file**

```bash
mkdir -p docs/superpowers/results
cp /tmp/eval-4b.txt docs/superpowers/results/2026-06-02-eval-4b-tier45.txt
cp /tmp/eval-12b.txt docs/superpowers/results/2026-06-02-eval-12b-tier45.txt
git add docs/superpowers/results/
git commit -m "test(ai): eval Tier 4+5 — gemma3:4b + 12b baseline"
```

- [ ] **Step 6: Nếu FAIL bất kỳ metric → iterate prompt**

Analyze failures:
- `missing > 2` per đề → prompt thiếu pattern keyword nào? Thêm fixture hoặc rule.
- `extra > 1` per đề → LLM tự thêm intent? Strengthen "BẮT BUỘC không tự thêm".
- `wrong > 1` → variant/labels mismatch. Thêm explicit rule.

Edit `intentPrompt.ts`, re-run, capture lại. Lặp tối đa 3 lần. Nếu vẫn fail
thresholds: mở GitHub issue note "12b không đạt 0.90 recall trên Tier 5; cần
model lớn hơn (gemma3:27b) hoặc Claude" → spec sẽ bàn lại.

Commit prompt changes:
```bash
git add src/stamps/geometry-2d/ai/intentPrompt.ts
git commit -m "fix(ai): prompt iteration sau eval — [specific change]"
```

---

## Task 15: Façade `handleGenerateFigureIntent` + deprecate buildFigure + bump version

**Files:**
- Create: `src/stamps/geometry-2d/ai/handleGenerateFigureIntent.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/handleGenerateFigureIntent.test.ts`
- Modify: `src/stamps/geometry-2d/ai/buildFigure.ts`
- Modify: `src/stamps/geometry-2d/ai/handleGenerateFigure.ts`
- Modify: `src/stamps/geometry-2d/ai/index.ts`
- Modify: `package.json`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write failing test cho Façade mới**

```ts
// src/stamps/geometry-2d/ai/__tests__/handleGenerateFigureIntent.test.ts
import { handleGenerateFigureIntent } from '../handleGenerateFigureIntent';
import type { AIProvider, ProviderOutput } from '../providers';

describe('handleGenerateFigureIntent', () => {
  const mockProvider: AIProvider = {
    name: 'mock',
    async call(): Promise<ProviderOutput> {
      return {
        text: JSON.stringify({
          decision: 'build',
          intents: [
            { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      };
    },
  };

  it('returns AiFigureUiResult on success', async () => {
    const r = await handleGenerateFigureIntent('Tam giác ABC.', { provider: mockProvider });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.dsl).toBeDefined();
      expect(r.intents).toHaveLength(1);
    }
  });

  it('returns error UI result on parse failure', async () => {
    const badProvider: AIProvider = {
      name: 'mock',
      async call() { return { text: '{ broken json', usage: { inputTokens: 1, outputTokens: 1 } }; },
    };
    const r = await handleGenerateFigureIntent('test', { provider: badProvider });
    expect(r.kind).toBe('error');
  });
});
```

- [ ] **Step 2: Run test, verify FAIL** (`Cannot find module`)

- [ ] **Step 3: Implement Façade**

Đọc `handleGenerateFigure.ts` để biết AiFigureUiResult shape:
```bash
cat src/stamps/geometry-2d/ai/handleGenerateFigure.ts
```

Tạo Façade mới:
```ts
// src/stamps/geometry-2d/ai/handleGenerateFigureIntent.ts
//
// Façade cho HTTP transport — wrap generateFigureIntent với error mapping
// tới AiFigureUiResult (giống pattern handleGenerateFigure cũ).

import { generateFigureIntent, type GenerateIntentOptions } from './buildFigureIntent';
import type { IntentT } from './intent';
import type { DslInputT } from '../dsl/schema';

export interface HandleGenerateFigureIntentOptions extends GenerateIntentOptions {}

export interface HandleGenerateFigureIntentInput {
  problem: string;
}

export type AiFigureIntentUiResult =
  | {
      kind: 'success';
      dsl: DslInputT;
      intents: readonly IntentT[];
      svg?: string;
      usage: { inputTokens: number; outputTokens: number };
    }
  | {
      kind: 'refused';
      message: string;
    }
  | {
      kind: 'error';
      code: string;
      message: string;
    };

export async function handleGenerateFigureIntent(
  problem: string,
  opts: HandleGenerateFigureIntentOptions = {},
): Promise<AiFigureIntentUiResult> {
  try {
    const r = await generateFigureIntent(problem, opts);
    if (r.ok) {
      return {
        kind: 'success',
        dsl: r.dsl,
        intents: r.intents,
        usage: {
          inputTokens: r.usage.inputTokens,
          outputTokens: r.usage.outputTokens,
        },
      };
    }
    if (r.reason === 'refused') {
      return { kind: 'refused', message: r.message };
    }
    return { kind: 'error', code: r.reason, message: r.message };
  } catch (e) {
    return {
      kind: 'error',
      code: 'unexpected',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
```

- [ ] **Step 4: Run test, verify PASS** (2 tests)

- [ ] **Step 5: Add `@deprecated` JSDoc to `buildFigure.ts` và `handleGenerateFigure.ts`**

Trong `buildFigure.ts`, thêm trước `export async function generateFigure`:
```ts
/**
 * @deprecated DSL free-form pipeline. Use `generateFigureIntent` instead.
 * Reason: Intent pipeline (4-stage) tốt hơn cho mọi metric — đủ ý / không thừa
 * / không vẽ sai. Path này sẽ remove ở 0.26.0.
 */
```

Và 1 `console.warn` ở đầu hàm:
```ts
console.warn(
  '[whiteboard/ai] generateFigure (DSL free-form) is deprecated. ' +
  'Migrate to generateFigureIntent. Path will be removed in 0.26.0.',
);
```

Same cho `handleGenerateFigure.ts`:
```ts
/**
 * @deprecated Use `handleGenerateFigureIntent` instead.
 */
```
+ console.warn ở đầu function.

- [ ] **Step 6: Export Façade mới trong `index.ts`**

```ts
export {
  handleGenerateFigureIntent,
  type HandleGenerateFigureIntentInput,
  type HandleGenerateFigureIntentOptions,
  type AiFigureIntentUiResult,
} from './handleGenerateFigureIntent';
```

- [ ] **Step 7: Bump version + update CLAUDE.md**

```bash
npm version minor   # 0.24.x → 0.25.0
```

(Tự commit + tag v0.25.0.)

Edit `CLAUDE.md` section "Gotchas (AI/DSL pipeline)" — append:
```markdown
- **Tier 4+5 (đề thi vào 10 thường + chuyên)** — Intent pipeline mở rộng 2026-06-02 (v0.25.0):
  - +2 op intent: `draw-line` (perpThrough/parallelThrough/tangentAt/tangentFromExt), `mark-shape` (sub-shape từ điểm có sẵn).
  - +3 circle spec: centerRadius, inscribedIn (+ centerThrough, through3 cũ).
  - +5 add-point constraint: secondIntersection, circleIntersection, tangencyPoint, tangentPoint, angleBisectorFoot.
  - +6 DSL kind: secondIntersection/circleIntersection/tangencyPoint/tangentPointExt (points) + circleCR/incircle (circles).
  - Stage 4 verify thêm `computeIntentMetrics(expected, actual)` → recall/precision/F1 + `verifyGeometric(dsl)` cho on-circle check (3 check khác defer).
  - Eval: `npx tsx scripts/eval-intent.ts gemma3:12b` — 30 cũ + 15 Tier 4/5 mới, target F1 ≥0.91 trên 12b.
  - `buildFigure` (DSL free-form) **@deprecated** — sẽ remove ở 0.26.0. UI nên switch sang `handleGenerateFigureIntent`.
```

- [ ] **Step 8: Final typecheck + full test suite**

```bash
npm run typecheck
npm test
```

Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/stamps/geometry-2d/ai/handleGenerateFigureIntent.ts \
        src/stamps/geometry-2d/ai/__tests__/handleGenerateFigureIntent.test.ts \
        src/stamps/geometry-2d/ai/buildFigure.ts \
        src/stamps/geometry-2d/ai/handleGenerateFigure.ts \
        src/stamps/geometry-2d/ai/index.ts \
        CLAUDE.md
git commit -m "feat(ai): handleGenerateFigureIntent Façade + deprecate buildFigure (0.25.0)"
```

Note: `npm version minor` đã tạo commit + tag riêng cho `package.json` —
không bao gồm trong commit này.

---

## Done

Sau Task 15 hoàn thành:
1. Intent pipeline cover đề Tier 4+5 với 7-12 intent/đề
2. 6 DSL kind mới + 2 intent op mới + 5 constraint + 3 circle spec
3. Stage 4 verify trả recall/precision/F1 + on-circle check
4. 15 eval fixture mới + eval-intent script hỗ trợ Tier 4/5
5. `buildFigure` deprecated, `handleGenerateFigureIntent` Façade mới
6. Version 0.25.0 tagged

Next phase (out of plan, để decision point sau khi đo eval):
- 3 geometric check còn lại (tangent-touch, concyclic, collinear) cần JSXGraph
  runtime hook.
- Retry budget Stage 4 (inject hint when verify fail) — chỉ cần khi eval cho
  thấy 12b ≥0.85 F1 nhưng geometric < 0.95.
- Remove `buildFigure` path ở 0.26.0.
