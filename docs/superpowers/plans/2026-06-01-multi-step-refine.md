# Multi-step refine (handleGenerateFigureDelta) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `handleGenerateFigureDelta` façade + 3-decision envelope (add/replace/refuse) + auto-detect 2-mode UI so students can iterate on an existing figure ("thêm trung điểm M của BC") without retyping the full problem.

**Architecture:** Mirror the existing `handleGenerateFigure` flow with a parallel module (`buildFigureDelta` + `refineEnvelope` + `refinePrompt`). The orchestrator transpiles `currentDsl ⧺ delta` together so `add` ref to existing names just works; `replace` transpiles the new figure alone. Name collision + unresolved ref are lifted from transpile error codes (`DUPLICATE_NAME` / `UNKNOWN_REF`) rather than pre-validated to avoid duplicating logic. UI extends `useAiFigure` with `mode` + `currentState` + entity counts; auto-detect refine when `state.order.length > 0`.

**Tech Stack:** TypeScript, Zod (envelope schema), zod-to-json-schema, Jest + jsdom, React, existing `AIProvider` abstraction (Ollama + Anthropic).

**Spec:** `docs/superpowers/specs/2026-06-01-multi-step-refine-design.md`

**Verification before completion:** Each task ends with a `npm test <path>` check. Final task runs full `npm test && npm run typecheck`.

---

## File Structure

**Create (8 source + 4 test):**
- `src/stamps/geometry-2d/ai/refineEnvelope.ts` — `FigureRefineEnvelopeZ` schema + `refineEnvelopeJsonSchema()`
- `src/stamps/geometry-2d/ai/refinePrompt.ts` — `buildRefineSystemPrompt(currentDsl)` + few-shot examples
- `src/stamps/geometry-2d/ai/refineFixtures.ts` — 10 fixtures `{ name, currentDsl, instruction, expectedEnvelope }`
- `src/stamps/geometry-2d/ai/buildFigureDelta.ts` — orchestrator `generateFigureDelta()`
- `src/stamps/geometry-2d/ai/handleGenerateFigureDelta.ts` — façade
- `src/stamps/geometry-2d/ai/__tests__/refineEnvelope.test.ts`
- `src/stamps/geometry-2d/ai/__tests__/refinePrompt.test.ts`
- `src/stamps/geometry-2d/ai/__tests__/buildFigureDelta.test.ts`
- `src/stamps/geometry-2d/ai/__tests__/handleGenerateFigureDelta.test.ts`

**Modify:**
- `src/stamps/geometry-2d/ai/index.ts` — export new façade + types
- `src/stamps/shared/types.ts` — extend `GenerateGeometryFigure` with `currentDsl?`
- `src/stamps/geometry-2d/editor/useAiFigure.ts` — add `mode`, `setMode`, `entityCount`, `hasUnsupported`, `currentState`
- `src/stamps/geometry-2d/editor/AiFigurePrompt.tsx` — mode toggle UI + auto-detect + confirm dialog
- `src/stamps/geometry-2d/editor/EditorPanel.tsx` — pass `currentState` to `<AiFigurePrompt>`
- `src/stamps/geometry-2d/editor/__tests__/useAiFigure.test.tsx` — add mode tests
- `scripts/demo/aiMiddlewarePlugin.ts` — add `/api/whiteboard/generate-figure-refine` + `/stream` route
- `scripts/demo/main.tsx` — adapter detect `currentDsl` → POST refine endpoint
- `src/index.ts` — re-export new façade if needed

---

## Task 1: Refine envelope schema

**Files:**
- Create: `src/stamps/geometry-2d/ai/refineEnvelope.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/refineEnvelope.test.ts`

- [ ] **Step 1.1: Write the failing tests**

Create `src/stamps/geometry-2d/ai/__tests__/refineEnvelope.test.ts`:

```ts
import { FigureRefineEnvelopeZ, refineEnvelopeJsonSchema } from '../refineEnvelope';

describe('FigureRefineEnvelopeZ', () => {
  const minimalFigure = { version: 1 as const, points: [{ name: 'X', kind: 'free' as const, x: 0, y: 0 }], shapes: [] };

  it('accepts decision=add with figure', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'add', figure: minimalFigure });
    expect(r.success).toBe(true);
  });

  it('accepts decision=replace with figure', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'replace', figure: minimalFigure });
    expect(r.success).toBe(true);
  });

  it('accepts decision=refuse with non-empty reason', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'refuse', reason: 'Ngoài phạm vi' });
    expect(r.success).toBe(true);
  });

  it('rejects decision=add without figure', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'add' });
    expect(r.success).toBe(false);
  });

  it('rejects decision=replace without figure', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'replace' });
    expect(r.success).toBe(false);
  });

  it('rejects decision=refuse with empty reason', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'refuse', reason: '' });
    expect(r.success).toBe(false);
  });

  it('rejects decision=refuse without reason', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'refuse' });
    expect(r.success).toBe(false);
  });

  it('rejects unknown decision', () => {
    const r = FigureRefineEnvelopeZ.safeParse({ decision: 'foo', figure: minimalFigure });
    expect(r.success).toBe(false);
  });
});

describe('refineEnvelopeJsonSchema', () => {
  it('returns valid JSON schema object with decision enum', () => {
    const schema = refineEnvelopeJsonSchema();
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
    // Loose check — full schema validation done by Ajv in providers
    const str = JSON.stringify(schema);
    expect(str).toContain('add');
    expect(str).toContain('replace');
    expect(str).toContain('refuse');
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=refineEnvelope.test
```

Expected: FAIL with "Cannot find module '../refineEnvelope'".

- [ ] **Step 1.3: Implement refineEnvelope.ts**

Create `src/stamps/geometry-2d/ai/refineEnvelope.ts`:

```ts
// src/stamps/geometry-2d/ai/refineEnvelope.ts
//
// Envelope schema cho multi-step refine. AI emit 1 trong 3:
//   { decision: 'add',     figure: <DSL delta> }
//   { decision: 'replace', figure: <DSL full> }
//   { decision: 'refuse',  reason: '...' }
//
// Tách hẳn khỏi FigureEnvelopeZ (build) — decision space khác (3 thay vì 2),
// semantics khác (delta vs full), prompt khác.

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DslInput } from '../dsl';

export const FigureRefineEnvelopeZ = z
  .object({
    decision: z.enum(['add', 'replace', 'refuse']),
    figure: DslInput.optional(),
    reason: z.string().optional(),
  })
  .refine(
    (e) =>
      e.decision === 'refuse'
        ? e.reason != null && e.reason.length > 0
        : e.figure != null,
    {
      message:
        'decision=add/replace cần `figure`; decision=refuse cần `reason` không rỗng',
    },
  );

export type FigureRefineEnvelopeT = z.infer<typeof FigureRefineEnvelopeZ>;

export function refineEnvelopeJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(FigureRefineEnvelopeZ, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }) as Record<string, unknown>;
}
```

- [ ] **Step 1.4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=refineEnvelope.test
```

Expected: PASS (9 tests).

- [ ] **Step 1.5: Commit**

```bash
git add src/stamps/geometry-2d/ai/refineEnvelope.ts src/stamps/geometry-2d/ai/__tests__/refineEnvelope.test.ts
git commit -m "feat(ai): schema FigureRefineEnvelopeZ (add/replace/refuse) cho multi-step"
```

---

## Task 2: Refine fixtures (10 fixtures)

**Files:**
- Create: `src/stamps/geometry-2d/ai/refineFixtures.ts`

- [ ] **Step 2.1: Write fixtures**

Create `src/stamps/geometry-2d/ai/refineFixtures.ts`:

```ts
// src/stamps/geometry-2d/ai/refineFixtures.ts
//
// Refine fixtures: { name, currentDsl, instruction, expectedEnvelope }
// Dùng cho:
//   - 6-8 đầu: few-shot trong refinePrompt
//   - Tất cả 10: integration smoke test (gated)
//
// Pattern: currentDsl đại diện state đã có (sau build trước), instruction là
// chỉ thị bổ sung. expectedEnvelope là ground truth AI nên emit.

import type { DslInputT } from '../dsl/schema';
import type { FigureRefineEnvelopeT } from './refineEnvelope';

export interface RefineFixture {
  name: string;
  currentDsl: DslInputT;
  instruction: string;
  expectedEnvelope: FigureRefineEnvelopeT;
}

const triangleABC: DslInputT = {
  version: 1,
  points: [
    { name: 'A', kind: 'free', x: 0, y: 3 },
    { name: 'B', kind: 'free', x: -2, y: 0 },
    { name: 'C', kind: 'free', x: 3, y: 0 },
  ],
  shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
};

const rightTriangleAtA: DslInputT = {
  version: 1,
  points: [
    { name: 'A', kind: 'free', x: 0, y: 0 },
    { name: 'B', kind: 'free', x: 4, y: 0 },
    { name: 'C', kind: 'free', x: 0, y: 3 },
  ],
  shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
};

const parallelogramABCD: DslInputT = {
  version: 1,
  points: [
    { name: 'A', kind: 'free', x: -2, y: 0 },
    { name: 'B', kind: 'free', x: 3, y: 0 },
    { name: 'C', kind: 'free', x: 4, y: 2 },
    { name: 'D', kind: 'free', x: -1, y: 2 },
  ],
  shapes: [{ name: 'ABCD', kind: 'polygon', vertices: ['A', 'B', 'C', 'D'] }],
};

const circleOnA: DslInputT = {
  version: 1,
  points: [
    { name: 'O', kind: 'free', x: 0, y: 0 },
    { name: 'A', kind: 'free', x: 3, y: 0 },
  ],
  shapes: [{ name: 'omega', kind: 'circleCP', center: 'O', surfacePoint: 'A' }],
};

export const REFINE_FIXTURES: RefineFixture[] = [
  {
    name: 'triangle-add-midpoint',
    currentDsl: triangleABC,
    instruction: 'Thêm trung điểm M của BC',
    expectedEnvelope: {
      decision: 'add',
      figure: {
        version: 1,
        points: [{ name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' }],
        shapes: [{ name: 'AM', kind: 'segment', p1: 'A', p2: 'M' }],
      },
    },
  },
  {
    name: 'triangle-add-altitude',
    currentDsl: triangleABC,
    instruction: 'Dựng đường cao AH xuống BC',
    expectedEnvelope: {
      decision: 'add',
      figure: {
        version: 1,
        points: [{ name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC_line' }],
        shapes: [
          { name: 'BC_line', kind: 'line', p1: 'B', p2: 'C' },
          { name: 'AH', kind: 'segment', p1: 'A', p2: 'H' },
        ],
      },
    },
  },
  {
    name: 'triangle-add-circumcircle',
    currentDsl: triangleABC,
    instruction: 'Vẽ đường tròn ngoại tiếp tam giác ABC',
    expectedEnvelope: {
      decision: 'add',
      figure: {
        version: 1,
        points: [{ name: 'O', kind: 'circumcenter', vertices: ['A', 'B', 'C'] }],
        shapes: [{ name: 'omega', kind: 'circle3', p1: 'A', p2: 'B', p3: 'C' }],
      },
    },
  },
  {
    name: 'right-triangle-add-centroid',
    currentDsl: rightTriangleAtA,
    instruction: 'Thêm trọng tâm G của tam giác',
    expectedEnvelope: {
      decision: 'add',
      figure: {
        version: 1,
        points: [{ name: 'G', kind: 'centroid', vertices: ['A', 'B', 'C'] }],
        shapes: [],
      },
    },
  },
  {
    name: 'parallelogram-add-diagonals',
    currentDsl: parallelogramABCD,
    instruction: 'Vẽ hai đường chéo AC, BD và giao điểm O',
    expectedEnvelope: {
      decision: 'add',
      figure: {
        version: 1,
        points: [{ name: 'O', kind: 'intersection', ref1: 'AC', ref2: 'BD' }],
        shapes: [
          { name: 'AC', kind: 'segment', p1: 'A', p2: 'C' },
          { name: 'BD', kind: 'segment', p1: 'B', p2: 'D' },
        ],
      },
    },
  },
  {
    name: 'circle-add-tangent',
    currentDsl: circleOnA,
    instruction: 'Kẻ tiếp tuyến tại A của đường tròn',
    expectedEnvelope: {
      decision: 'add',
      figure: {
        version: 1,
        points: [],
        shapes: [{ name: 't', kind: 'tangent', throughPoint: 'A', toCircle: 'omega' }],
      },
    },
  },
  {
    name: 'triangle-replace-equilateral',
    currentDsl: triangleABC,
    instruction: 'Bỏ tam giác này, vẽ tam giác đều ABC thay vào',
    expectedEnvelope: {
      decision: 'replace',
      figure: {
        version: 1,
        points: [
          { name: 'A', kind: 'free', x: 0, y: 2 },
          { name: 'B', kind: 'free', x: -1.732, y: -1 },
          { name: 'C', kind: 'free', x: 1.732, y: -1 },
        ],
        shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
      },
    },
  },
  {
    name: 'triangle-replace-rhombus',
    currentDsl: triangleABC,
    instruction: 'Đổi sang hình thoi ABCD',
    expectedEnvelope: {
      decision: 'replace',
      figure: {
        version: 1,
        points: [
          { name: 'A', kind: 'free', x: -2, y: 0 },
          { name: 'B', kind: 'free', x: 0, y: 1.5 },
          { name: 'C', kind: 'free', x: 2, y: 0 },
          { name: 'D', kind: 'free', x: 0, y: -1.5 },
        ],
        shapes: [{ name: 'ABCD', kind: 'polygon', vertices: ['A', 'B', 'C', 'D'] }],
      },
    },
  },
  {
    name: 'refuse-calculation',
    currentDsl: triangleABC,
    instruction: 'Tính diện tích tam giác ABC',
    expectedEnvelope: {
      decision: 'refuse',
      reason: 'Yêu cầu tính toán, không phải vẽ hình.',
    },
  },
  {
    name: 'refuse-3d',
    currentDsl: triangleABC,
    instruction: 'Vẽ hình chóp SABC với S nằm trên tam giác',
    expectedEnvelope: {
      decision: 'refuse',
      reason: 'Hình 3D ngoài phạm vi geometry-2d.',
    },
  },
];

/** 8 fixture đầu dùng cho few-shot prompt (bỏ 2 refuse cuối để prompt không bias refuse). */
export const REFINE_PROMPT_FIXTURES = REFINE_FIXTURES.slice(0, 8);
```

- [ ] **Step 2.2: Verify fixtures are valid DSL (no test file needed — caught at compile + transpile time)**

```bash
npm run typecheck 2>&1 | head -20
```

Expected: PASS (no errors).

- [ ] **Step 2.3: Commit**

```bash
git add src/stamps/geometry-2d/ai/refineFixtures.ts
git commit -m "feat(ai): 10 refine fixture (add/replace/refuse) cho prompt few-shot + smoke test"
```

---

## Task 3: Refine prompt builder

**Files:**
- Create: `src/stamps/geometry-2d/ai/refinePrompt.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/refinePrompt.test.ts`

- [ ] **Step 3.1: Write the failing tests**

Create `src/stamps/geometry-2d/ai/__tests__/refinePrompt.test.ts`:

```ts
import { buildRefineSystemPrompt } from '../refinePrompt';
import type { DslInputT } from '../../dsl/schema';

describe('buildRefineSystemPrompt', () => {
  const triangleDsl: DslInputT = {
    version: 1,
    points: [
      { name: 'A', kind: 'free', x: 0, y: 3 },
      { name: 'B', kind: 'free', x: -2, y: 0 },
      { name: 'C', kind: 'free', x: 3, y: 0 },
    ],
    shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
  };

  it('embeds currentDsl JSON in the prompt', () => {
    const prompt = buildRefineSystemPrompt(triangleDsl);
    expect(prompt).toContain('"name": "A"');
    expect(prompt).toContain('"kind": "polygon"');
    expect(prompt).toContain('"vertices": [');
  });

  it('lists existing names (points + shapes) explicitly', () => {
    const prompt = buildRefineSystemPrompt(triangleDsl);
    // Some form of name listing for AI to avoid collisions
    expect(prompt).toMatch(/points:.*A.*B.*C/s);
    expect(prompt).toMatch(/shapes:.*ABC/s);
  });

  it('mentions all three decisions explicitly', () => {
    const prompt = buildRefineSystemPrompt(triangleDsl);
    expect(prompt).toContain('"add"');
    expect(prompt).toContain('"replace"');
    expect(prompt).toContain('"refuse"');
  });

  it('includes anti-pattern guidance (no redefine, no unresolved ref)', () => {
    const prompt = buildRefineSystemPrompt(triangleDsl);
    expect(prompt.toLowerCase()).toMatch(/không.*redefine|không.*trùng|không.*tham chiếu/i);
  });

  it('handles empty currentDsl gracefully', () => {
    const empty: DslInputT = { version: 1, points: [], shapes: [] };
    const prompt = buildRefineSystemPrompt(empty);
    expect(prompt).toBeTruthy();
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('includes at least 6 few-shot refine examples', () => {
    const prompt = buildRefineSystemPrompt(triangleDsl);
    // Each fixture wrapped by "### Ví dụ N" marker
    const matches = prompt.match(/### Ví dụ \d+/g);
    expect(matches).toBeTruthy();
    expect((matches ?? []).length).toBeGreaterThanOrEqual(6);
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=refinePrompt.test
```

Expected: FAIL with "Cannot find module '../refinePrompt'".

- [ ] **Step 3.3: Implement refinePrompt.ts**

Create `src/stamps/geometry-2d/ai/refinePrompt.ts`:

```ts
// src/stamps/geometry-2d/ai/refinePrompt.ts
//
// System prompt cho refine mode. Inject currentDsl JSON + list tên đã dùng
// để AI emit delta hợp lệ. Few-shot examples từ REFINE_PROMPT_FIXTURES.

import type { DslInputT } from '../dsl/schema';
import { REFINE_PROMPT_FIXTURES } from './refineFixtures';

function namesOf(dsl: DslInputT): { points: string[]; shapes: string[] } {
  return {
    points: dsl.points.map((p) => p.name),
    shapes: dsl.shapes.map((s) => s.name),
  };
}

export function buildRefineSystemPrompt(currentDsl: DslInputT): string {
  const names = namesOf(currentDsl);
  const examples = REFINE_PROMPT_FIXTURES.map((f, i) => {
    const env = f.expectedEnvelope;
    return `### Ví dụ ${i + 1}
**Hình hiện tại:**
${JSON.stringify(f.currentDsl, null, 2)}
**Yêu cầu chỉnh sửa:** ${f.instruction}
**Output:**
${JSON.stringify(env, null, 2)}`;
  }).join('\n\n');

  return `Bạn là trợ lý vẽ hình học 2D. Học sinh đã có HÌNH HIỆN TẠI và muốn THÊM/SỬA.

## Hình hiện tại (DSL JSON)
${JSON.stringify(currentDsl, null, 2)}

## Tên đã dùng (KHÔNG được redefine)
points: ${names.points.join(', ') || '(chưa có)'}
shapes: ${names.shapes.join(', ') || '(chưa có)'}

## Nhiệm vụ
Đọc YÊU CẦU CHỈNH SỬA → emit JSON envelope đúng 1 trong 3 dạng:

  { "decision": "add",     "figure": <DSL chỉ chứa entity MỚI> }
  { "decision": "replace", "figure": <DSL hoàn chỉnh thay thế hình cũ> }
  { "decision": "refuse",  "reason": "lý do tiếng Việt" }

## Khi nào dùng decision nào?
- **"add"**: user muốn THÊM primitive vào hình hiện tại (vd: "thêm trung điểm M của BC", "dựng đường cao AH").
  → figure chỉ chứa point/shape MỚI. Ref tên cũ (A, B, C, …) là OK. KHÔNG redefine tên cũ.
- **"replace"**: user muốn vẽ LẠI hoặc đổi sang hình khác hẳn (vd: "vẽ tam giác đều thay vào", "bỏ tam giác, dựng hình thoi").
  → figure đầy đủ như prompt mới (giống mode build).
- **"refuse"**: yêu cầu ngoài phạm vi (3D, lượng giác, biến hình lớp 11+, tính toán đại số).

## Quy tắc decision=add
1. Mọi name MỚI KHÔNG được trùng với tên đã dùng ở trên. Trùng → đặt khác (M', M1, …).
2. ƯU TIÊN derived points: midpoint, perpFoot, intersection, circumcenter, incenter, centroid, orthocenter.
3. Ref tới tên cũ (A, B, C) là OK — AI biết các tên đó tồn tại.
4. KHÔNG copy lại entity cũ vào figure delta (delta chỉ chứa cái MỚI).

## Anti-pattern (BẮT BUỘC tránh)
- KHÔNG redefine tên đã dùng (A, B, C đã có → KHÔNG đặt lại).
- KHÔNG ref tới tên chưa có ngoài "Tên đã dùng" + tên vừa định nghĩa trong delta.
- KHÔNG emit add với figure chứa cả entity cũ (đó là replace).

## Primitives sẵn có
**Points:** free, midpoint, onSegment, onLine, onCircle, perpFoot, circumcenter, incenter, centroid, orthocenter, intersection
**Shapes:** segment, line, ray, polygon, perpendicular, parallel, perpBisector, angleBisector, tangent, circleCP, circle3

## ${REFINE_PROMPT_FIXTURES.length} ví dụ

${examples}

Trả về CHỈ 1 JSON object đúng schema. Không có lời dẫn, không markdown fence.`;
}
```

- [ ] **Step 3.4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=refinePrompt.test
```

Expected: PASS (6 tests).

- [ ] **Step 3.5: Commit**

```bash
git add src/stamps/geometry-2d/ai/refinePrompt.ts src/stamps/geometry-2d/ai/__tests__/refinePrompt.test.ts
git commit -m "feat(ai): buildRefineSystemPrompt với currentDsl + 8 few-shot example"
```

---

## Task 4: buildFigureDelta orchestrator

**Files:**
- Create: `src/stamps/geometry-2d/ai/buildFigureDelta.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/buildFigureDelta.test.ts`

- [ ] **Step 4.1: Write the failing tests**

Create `src/stamps/geometry-2d/ai/__tests__/buildFigureDelta.test.ts`:

```ts
import { generateFigureDelta } from '../buildFigureDelta';
import type { AIProvider, ProviderOutput, ProviderRequest } from '../providers';
import type { DslInputT } from '../../dsl/schema';

function mockProvider(outputs: ProviderOutput[]): AIProvider & { calls: ProviderRequest[] } {
  const calls: ProviderRequest[] = [];
  let i = 0;
  return {
    name: 'mock',
    defaultModel: 'mock-default',
    async call(req) {
      calls.push(req);
      const out = outputs[i] ?? outputs[outputs.length - 1];
      i++;
      return out;
    },
    calls,
  };
}

const triangleABC: DslInputT = {
  version: 1,
  points: [
    { name: 'A', kind: 'free', x: 0, y: 3 },
    { name: 'B', kind: 'free', x: -2, y: 0 },
    { name: 'C', kind: 'free', x: 3, y: 0 },
  ],
  shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
};

describe('generateFigureDelta — refine orchestrator', () => {
  it('decision=add: merges delta with currentDsl and transpiles', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: {
          decision: 'add',
          figure: {
            version: 1,
            points: [{ name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' }],
            shapes: [{ name: 'AM', kind: 'segment', p1: 'A', p2: 'M' }],
          },
        },
        usage: { inputTokens: 800, outputTokens: 60 },
      },
    ]);
    const r = await generateFigureDelta(
      { problem: 'thêm trung điểm M của BC', currentDsl: triangleABC },
      { provider },
    );
    if (!r.ok) throw new Error('expected ok: ' + JSON.stringify(r));
    expect(r.mode).toBe('add');
    expect(r.mergedDsl.points).toHaveLength(4); // A, B, C, M
    expect(r.mergedDsl.shapes).toHaveLength(2); // ABC, AM
    expect(r.state.order.length).toBe(6); // 4 points + 2 shapes
  });

  it('decision=replace: transpiles new figure alone (currentDsl ignored)', async () => {
    const newFigure: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 2 },
        { name: 'B', kind: 'free', x: -1.732, y: -1 },
        { name: 'C', kind: 'free', x: 1.732, y: -1 },
      ],
      shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
    };
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'replace', figure: newFigure }, usage: { inputTokens: 800, outputTokens: 120 } },
    ]);
    const r = await generateFigureDelta(
      { problem: 'vẽ tam giác đều', currentDsl: triangleABC },
      { provider },
    );
    if (!r.ok) throw new Error('expected ok: ' + JSON.stringify(r));
    expect(r.mode).toBe('replace');
    expect(r.mergedDsl).toEqual(newFigure);
  });

  it('decision=refuse: returns ok:false reason=refused', async () => {
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'refuse', reason: 'Yêu cầu tính toán' }, usage: { inputTokens: 100, outputTokens: 20 } },
    ]);
    const r = await generateFigureDelta(
      { problem: 'tính diện tích', currentDsl: triangleABC },
      { provider },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('refused');
    expect(r.message).toBe('Yêu cầu tính toán');
  });

  it('add with name collision: returns name_collision reason', async () => {
    // AI tries to redefine "A" — collision with currentDsl
    const provider = mockProvider([
      {
        kind: 'json',
        data: {
          decision: 'add',
          figure: {
            version: 1,
            points: [{ name: 'A', kind: 'free', x: 99, y: 99 }],
            shapes: [],
          },
        },
        usage: { inputTokens: 200, outputTokens: 30 },
      },
    ]);
    const r = await generateFigureDelta(
      { problem: 'thêm điểm A khác', currentDsl: triangleABC },
      { provider, maxAttempts: 1 },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('name_collision');
    expect(r.collisions).toContain('A');
  });

  it('add with unresolved ref: returns unresolved_ref reason', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: {
          decision: 'add',
          figure: {
            version: 1,
            points: [{ name: 'M', kind: 'midpoint', p1: 'X', p2: 'Y' }], // X, Y don't exist
            shapes: [],
          },
        },
        usage: { inputTokens: 200, outputTokens: 30 },
      },
    ]);
    const r = await generateFigureDelta(
      { problem: 'thêm trung điểm', currentDsl: triangleABC },
      { provider, maxAttempts: 1 },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('unresolved_ref');
    expect(r.refs.length).toBeGreaterThan(0);
  });

  it('empty problem → api_error', async () => {
    const r = await generateFigureDelta(
      { problem: '', currentDsl: triangleABC },
      { provider: mockProvider([{ kind: 'error', message: 'should not call' }]) },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('api_error');
  });

  it('provider error → api_error preserves status', async () => {
    const provider = mockProvider([{ kind: 'error', message: 'Unauthorized', status: 401 }]);
    const r = await generateFigureDelta({ problem: 'test', currentDsl: triangleABC }, { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('api_error');
    expect(r.status).toBe(401);
  });

  it('invalid envelope shape → parse_error', async () => {
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'add' /* missing figure */ }, usage: { inputTokens: 50, outputTokens: 10 } },
    ]);
    const r = await generateFigureDelta({ problem: 'test', currentDsl: triangleABC }, { provider });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.reason).toBe('parse_error');
  });

  it('add with empty delta arrays → ok with no new entities', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: { decision: 'add', figure: { version: 1, points: [], shapes: [] } },
        usage: { inputTokens: 200, outputTokens: 20 },
      },
    ]);
    const r = await generateFigureDelta(
      { problem: 'không làm gì', currentDsl: triangleABC },
      { provider },
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.mode).toBe('add');
    expect(r.mergedDsl.points).toHaveLength(3); // unchanged
  });

  it('passes refine system prompt to provider (contains currentDsl JSON)', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: {
          decision: 'add',
          figure: { version: 1, points: [], shapes: [] },
        },
        usage: { inputTokens: 100, outputTokens: 10 },
      },
    ]);
    await generateFigureDelta({ problem: 'test', currentDsl: triangleABC }, { provider });
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].systemPrompt).toContain('"name": "A"');
    expect(provider.calls[0].userPrompt).toBe('test');
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=buildFigureDelta.test
```

Expected: FAIL with "Cannot find module '../buildFigureDelta'".

- [ ] **Step 4.3: Implement buildFigureDelta.ts**

Create `src/stamps/geometry-2d/ai/buildFigureDelta.ts`:

```ts
// src/stamps/geometry-2d/ai/buildFigureDelta.ts
//
// Orchestrator cho multi-step refine. Mirror buildFigure.ts với differences:
//   - Schema: FigureRefineEnvelopeZ (3 decision: add/replace/refuse)
//   - Prompt: buildRefineSystemPrompt(currentDsl)
//   - Merge: decision=add concat currentDsl + delta → transpile()
//             decision=replace transpile envelope.figure alone
//   - Errors: lift DUPLICATE_NAME → name_collision, UNKNOWN_REF → unresolved_ref

import type { State as SceneState } from '../../../core/scene/types';
import type { DslInputT, TranspileError } from '../dsl';
import { transpile } from '../dsl';
import {
  FigureRefineEnvelopeZ,
  refineEnvelopeJsonSchema,
} from './refineEnvelope';
import { buildRefineSystemPrompt } from './refinePrompt';
import {
  selectProvider,
  type AIProvider,
  type ProviderTokenUsage,
  type SelectProviderOptions,
} from './providers';

const DEFAULT_MAX_TOKENS = 8192;

export interface GenerateDeltaOptions extends SelectProviderOptions {
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Internal — exposed cho tests, không phải public API. */
  maxAttempts?: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export type GenerateDeltaResult =
  | {
      ok: true;
      state: SceneState;
      mergedDsl: DslInputT;
      mode: 'add' | 'replace';
      usage: TokenUsage;
      provider: string;
    }
  | { ok: false; reason: 'refused'; message: string; usage?: TokenUsage; provider?: string }
  | { ok: false; reason: 'parse_error'; message: string; raw?: unknown; usage?: TokenUsage; provider?: string }
  | {
      ok: false;
      reason: 'transpile_error';
      message: string;
      errors: TranspileError[];
      dsl: unknown;
      usage?: TokenUsage;
      provider?: string;
    }
  | {
      ok: false;
      reason: 'name_collision';
      message: string;
      collisions: string[];
      errors: TranspileError[];
      dsl: unknown;
      usage?: TokenUsage;
      provider?: string;
    }
  | {
      ok: false;
      reason: 'unresolved_ref';
      message: string;
      refs: string[];
      errors: TranspileError[];
      dsl: unknown;
      usage?: TokenUsage;
      provider?: string;
    }
  | { ok: false; reason: 'api_error'; message: string; status?: number; provider?: string };

export interface GenerateFigureDeltaInput {
  problem: string;
  currentDsl: DslInputT;
}

export async function generateFigureDelta(
  input: GenerateFigureDeltaInput,
  opts: GenerateDeltaOptions = {},
): Promise<GenerateDeltaResult> {
  const { problem, currentDsl } = input;

  if (!problem || !problem.trim()) {
    return { ok: false, reason: 'api_error', message: 'Đề bài rỗng' };
  }

  let provider: AIProvider;
  try {
    provider = selectProvider(opts);
  } catch (e) {
    const err = e as { message?: string };
    return { ok: false, reason: 'api_error', message: err.message ?? 'Không chọn được provider' };
  }

  const systemPrompt = buildRefineSystemPrompt(currentDsl);
  const schema = refineEnvelopeJsonSchema();

  const out = await provider.call({
    systemPrompt,
    userPrompt: problem,
    schema,
    model: opts.model ?? provider.defaultModel,
    maxTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    signal: opts.signal,
  });

  if (out.kind === 'error') {
    return {
      ok: false,
      reason: 'api_error',
      message: out.message,
      ...(out.status !== undefined ? { status: out.status } : {}),
      provider: provider.name,
    };
  }

  const usage = toUsage(out.usage);

  const parsed = FigureRefineEnvelopeZ.safeParse(out.data);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'parse_error',
      message: 'Envelope không khớp schema: ' + parsed.error.issues.map((i) => i.message).join('; '),
      raw: out.data,
      usage,
      provider: provider.name,
    };
  }

  const env = parsed.data;

  if (env.decision === 'refuse') {
    return {
      ok: false,
      reason: 'refused',
      message: env.reason ?? 'AI từ chối không nêu lý do',
      usage,
      provider: provider.name,
    };
  }

  if (env.decision === 'replace') {
    const figure = env.figure!;
    const tResult = transpile(figure);
    if (!tResult.ok) {
      return liftTranspileError(tResult.errors, figure, usage, provider.name);
    }
    return {
      ok: true,
      state: tResult.state,
      mergedDsl: figure,
      mode: 'replace',
      usage,
      provider: provider.name,
    };
  }

  // decision === 'add'
  const delta = env.figure!;
  const merged: DslInputT = {
    version: 1,
    points: [...currentDsl.points, ...delta.points],
    shapes: [...currentDsl.shapes, ...delta.shapes],
  };

  const tResult = transpile(merged);
  if (!tResult.ok) {
    return liftTranspileError(tResult.errors, merged, usage, provider.name);
  }

  return {
    ok: true,
    state: tResult.state,
    mergedDsl: merged,
    mode: 'add',
    usage,
    provider: provider.name,
  };
}

/**
 * Lift transpile errors → specific reasons khi pattern match:
 *   - DUPLICATE_NAME → name_collision
 *   - UNKNOWN_REF → unresolved_ref
 *   - Otherwise → transpile_error (retry-able)
 *
 * Reason: cho UI hiển thị message cụ thể hơn ("AI tạo điểm trùng tên A")
 * thay vì generic "DSL không hợp lệ".
 */
function liftTranspileError(
  errors: TranspileError[],
  dsl: DslInputT,
  usage: TokenUsage,
  providerName: string,
): GenerateDeltaResult {
  const dupes = errors.filter((e) => e.code === 'DUPLICATE_NAME');
  if (dupes.length > 0) {
    const collisions = Array.from(new Set(dupes.flatMap((e) => e.path ?? []).filter(Boolean)));
    return {
      ok: false,
      reason: 'name_collision',
      message:
        'AI tạo entity trùng tên với hình hiện tại: ' +
        (collisions.length > 0 ? collisions.join(', ') : 'không xác định'),
      collisions,
      errors,
      dsl,
      usage,
      provider: providerName,
    };
  }

  const unresolved = errors.filter((e) => e.code === 'UNKNOWN_REF');
  if (unresolved.length > 0) {
    const refs = Array.from(new Set(unresolved.flatMap((e) => e.path ?? []).filter(Boolean)));
    return {
      ok: false,
      reason: 'unresolved_ref',
      message:
        'AI tham chiếu tên không có: ' +
        (refs.length > 0 ? refs.join(', ') : 'không xác định'),
      refs,
      errors,
      dsl,
      usage,
      provider: providerName,
    };
  }

  return {
    ok: false,
    reason: 'transpile_error',
    message: 'DSL từ AI không hợp lệ',
    errors,
    dsl,
    usage,
    provider: providerName,
  };
}

function toUsage(u: ProviderTokenUsage | undefined): TokenUsage {
  return {
    inputTokens: u?.inputTokens ?? 0,
    outputTokens: u?.outputTokens ?? 0,
    cacheReadTokens: u?.cacheReadTokens ?? 0,
    cacheCreationTokens: u?.cacheCreationTokens ?? 0,
  };
}
```

- [ ] **Step 4.4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=buildFigureDelta.test
```

Expected: PASS (10 tests).

- [ ] **Step 4.5: Commit**

```bash
git add src/stamps/geometry-2d/ai/buildFigureDelta.ts src/stamps/geometry-2d/ai/__tests__/buildFigureDelta.test.ts
git commit -m "feat(ai): generateFigureDelta orchestrator (add/replace + lift collision/ref errors)"
```

---

## Task 5: handleGenerateFigureDelta façade

**Files:**
- Create: `src/stamps/geometry-2d/ai/handleGenerateFigureDelta.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/handleGenerateFigureDelta.test.ts`

- [ ] **Step 5.1: Write the failing tests**

Create `src/stamps/geometry-2d/ai/__tests__/handleGenerateFigureDelta.test.ts`:

```ts
import { handleGenerateFigureDelta } from '../handleGenerateFigureDelta';
import type { AIProvider, ProviderOutput, ProviderRequest } from '../providers';
import type { DslInputT } from '../../dsl/schema';

function mockProvider(outputs: ProviderOutput[]): AIProvider & { calls: ProviderRequest[] } {
  const calls: ProviderRequest[] = [];
  let i = 0;
  return {
    name: 'mock',
    defaultModel: 'mock-default',
    async call(req) {
      calls.push(req);
      const out = outputs[i] ?? outputs[outputs.length - 1];
      i++;
      return out;
    },
    calls,
  };
}

const triangleABC: DslInputT = {
  version: 1,
  points: [
    { name: 'A', kind: 'free', x: 0, y: 3 },
    { name: 'B', kind: 'free', x: -2, y: 0 },
    { name: 'C', kind: 'free', x: 3, y: 0 },
  ],
  shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
};

describe('handleGenerateFigureDelta', () => {
  it('happy path add → { ok:true, state }', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: {
          decision: 'add',
          figure: {
            version: 1,
            points: [{ name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' }],
            shapes: [],
          },
        },
        usage: { inputTokens: 800, outputTokens: 30 },
      },
    ]);
    const r = await handleGenerateFigureDelta(
      { problem: 'thêm M là trung điểm BC', currentDsl: triangleABC },
      { provider },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.state.order.length).toBeGreaterThan(3);
  });

  it('refused → { ok:false, message }', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: { decision: 'refuse', reason: 'Ngoài phạm vi' },
        usage: { inputTokens: 100, outputTokens: 10 },
      },
    ]);
    const r = await handleGenerateFigureDelta(
      { problem: 'tính diện tích', currentDsl: triangleABC },
      { provider },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.message).toBe('Ngoài phạm vi');
  });

  it('name_collision → friendly message', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: {
          decision: 'add',
          figure: {
            version: 1,
            points: [{ name: 'A', kind: 'free', x: 9, y: 9 }],
            shapes: [],
          },
        },
        usage: { inputTokens: 200, outputTokens: 30 },
      },
    ]);
    const r = await handleGenerateFigureDelta(
      { problem: 'thêm A khác', currentDsl: triangleABC },
      { provider, maxAttempts: 1 },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.message).toContain('trùng tên');
    expect(r.message).toContain('A');
  });

  it('unresolved_ref → friendly message', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: {
          decision: 'add',
          figure: {
            version: 1,
            points: [{ name: 'M', kind: 'midpoint', p1: 'X', p2: 'Y' }],
            shapes: [],
          },
        },
        usage: { inputTokens: 200, outputTokens: 30 },
      },
    ]);
    const r = await handleGenerateFigureDelta(
      { problem: 'thêm', currentDsl: triangleABC },
      { provider, maxAttempts: 1 },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.message).toContain('tham chiếu sai');
  });

  it('transpile_error retries up to maxAttempts then fails with friendly message', async () => {
    // Both attempts emit invalid DSL (cycle)
    const cycleDelta = {
      decision: 'add' as const,
      figure: {
        version: 1 as const,
        points: [],
        shapes: [
          { name: 'L1', kind: 'segment' as const, p1: 'P1', p2: 'P2' },
        ],
      },
    };
    const provider = mockProvider([
      { kind: 'json', data: cycleDelta, usage: { inputTokens: 100, outputTokens: 10 } },
      { kind: 'json', data: cycleDelta, usage: { inputTokens: 100, outputTokens: 10 } },
    ]);
    const r = await handleGenerateFigureDelta(
      { problem: 'test', currentDsl: triangleABC },
      { provider, maxAttempts: 2 },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    // 2 attempts both transpile_error → friendly mapped (unresolved_ref because P1/P2 missing — but for collision-pattern messaging, message contains "tham chiếu")
    expect(r.message).toBeTruthy();
    expect(provider.calls).toHaveLength(2);
  });

  it('onResult fired per attempt', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: {
          decision: 'add',
          figure: { version: 1, points: [{ name: 'M', kind: 'midpoint', p1: 'B', p2: 'C' }], shapes: [] },
        },
        usage: { inputTokens: 800, outputTokens: 30 },
      },
    ]);
    const onResult = jest.fn();
    await handleGenerateFigureDelta(
      { problem: 'thêm M', currentDsl: triangleABC },
      { provider, onResult },
    );
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][1]).toBe(1); // attempt 1
  });

  it('onResult swallow errors (does not break response)', async () => {
    const provider = mockProvider([
      {
        kind: 'json',
        data: { decision: 'refuse', reason: 'no' },
        usage: { inputTokens: 100, outputTokens: 10 },
      },
    ]);
    const onResult = jest.fn(() => {
      throw new Error('telemetry blew up');
    });
    const r = await handleGenerateFigureDelta(
      { problem: 'test', currentDsl: triangleABC },
      { provider, onResult },
    );
    expect(r.ok).toBe(false);
  });

  it('maxAttempts clamping: <1 → 1, >5 → 5', async () => {
    const provider = mockProvider([
      { kind: 'json', data: { decision: 'refuse', reason: 'no' }, usage: { inputTokens: 50, outputTokens: 10 } },
    ]);
    await handleGenerateFigureDelta({ problem: 't', currentDsl: triangleABC }, { provider, maxAttempts: 0 });
    expect(provider.calls).toHaveLength(1); // clamped to 1
  });

  it('api_error not retried', async () => {
    const provider = mockProvider([
      { kind: 'error', message: 'Unauthorized', status: 401 },
    ]);
    const r = await handleGenerateFigureDelta(
      { problem: 't', currentDsl: triangleABC },
      { provider, maxAttempts: 3 },
    );
    expect(provider.calls).toHaveLength(1); // not retried
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.message).toBe('Unauthorized');
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=handleGenerateFigureDelta.test
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 5.3: Implement handleGenerateFigureDelta.ts**

Create `src/stamps/geometry-2d/ai/handleGenerateFigureDelta.ts`:

```ts
// src/stamps/geometry-2d/ai/handleGenerateFigureDelta.ts
//
// Façade cho generateFigureDelta. Mirror handleGenerateFigure.ts với:
//   - Input thêm currentDsl
//   - Map name_collision + unresolved_ref → friendly Vietnamese message
//   - Retry chỉ với transpile_error (như handleGenerateFigure)

import type { AiFigureUiResult } from '../../shared/types';
import type { DslInputT } from '../dsl';
import {
  generateFigureDelta,
  type GenerateDeltaOptions,
  type GenerateDeltaResult,
} from './buildFigureDelta';

export interface HandleGenerateFigureDeltaInput {
  problem: string;
  currentDsl: DslInputT;
}

export interface HandleGenerateFigureDeltaOptions extends GenerateDeltaOptions {
  /**
   * Optional telemetry hook gọi cho MỖI attempt. Lỗi từ logger sẽ swallow.
   */
  onResult?: (result: GenerateDeltaResult, attempt: number) => void;
  /**
   * Số attempt tối đa khi nhận `transpile_error`. Default 2 (1 retry).
   * Min 1, max 5.
   */
  maxAttempts?: number;
}

const DEFAULT_MAX_ATTEMPTS = 2;

/**
 * Façade cho refine. Auto-retry chỉ với `transpile_error` (không retry
 * `refused`, `name_collision`, `unresolved_ref`, `parse_error`, `api_error`).
 */
export async function handleGenerateFigureDelta(
  input: HandleGenerateFigureDeltaInput,
  opts: HandleGenerateFigureDeltaOptions = {},
): Promise<AiFigureUiResult> {
  const { onResult, maxAttempts: rawMax, ...generateOpts } = opts;
  const maxAttempts = clampAttempts(rawMax ?? DEFAULT_MAX_ATTEMPTS);

  let lastResult: GenerateDeltaResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await generateFigureDelta(input, generateOpts);
    lastResult = result;

    if (onResult) {
      try {
        onResult(result, attempt);
      } catch {
        // Không cho lỗi telemetry vỡ HTTP response.
      }
    }

    if (result.ok) {
      return { ok: true, state: result.state };
    }

    if (result.reason === 'transpile_error' && attempt < maxAttempts) {
      continue;
    }

    break;
  }

  return mapErrorToUi(lastResult!);
}

function clampAttempts(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MAX_ATTEMPTS;
  return Math.max(1, Math.min(5, Math.floor(n)));
}

function mapErrorToUi(result: GenerateDeltaResult): AiFigureUiResult {
  if (result.ok) return { ok: true, state: result.state };

  switch (result.reason) {
    case 'refused':
      return { ok: false, message: result.message };
    case 'parse_error':
      return {
        ok: false,
        message: 'AI trả về dữ liệu không hợp lệ. Vui lòng thử lại hoặc diễn đạt lại.',
      };
    case 'transpile_error':
      return {
        ok: false,
        message:
          'AI tạo hình không hợp lệ (đã thử lại). Vui lòng tách thành 1 yêu cầu/lần hoặc diễn đạt khác.',
      };
    case 'name_collision':
      return {
        ok: false,
        message: `AI tạo điểm trùng tên với hình hiện tại (${result.collisions.join(', ')}). Vui lòng diễn đạt lại.`,
      };
    case 'unresolved_ref':
      return {
        ok: false,
        message: `AI tham chiếu sai tên đối tượng (${result.refs.join(', ')}). Vui lòng diễn đạt lại.`,
      };
    case 'api_error':
    default:
      return { ok: false, message: result.message };
  }
}
```

- [ ] **Step 5.4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=handleGenerateFigureDelta.test
```

Expected: PASS (9 tests).

- [ ] **Step 5.5: Commit**

```bash
git add src/stamps/geometry-2d/ai/handleGenerateFigureDelta.ts src/stamps/geometry-2d/ai/__tests__/handleGenerateFigureDelta.test.ts
git commit -m "feat(ai): handleGenerateFigureDelta façade + friendly error mapping"
```

---

## Task 6: Export public API

**Files:**
- Modify: `src/stamps/geometry-2d/ai/index.ts`

- [ ] **Step 6.1: Read current `src/stamps/geometry-2d/ai/index.ts`**

```bash
cat src/stamps/geometry-2d/ai/index.ts
```

- [ ] **Step 6.2: Add exports for new façade and types**

Append to `src/stamps/geometry-2d/ai/index.ts` (after existing exports):

```ts
// Refine (multi-step) API
export {
  handleGenerateFigureDelta,
  type HandleGenerateFigureDeltaInput,
  type HandleGenerateFigureDeltaOptions,
} from './handleGenerateFigureDelta';
export {
  generateFigureDelta,
  type GenerateDeltaOptions,
  type GenerateDeltaResult,
  type GenerateFigureDeltaInput,
} from './buildFigureDelta';
export {
  FigureRefineEnvelopeZ,
  refineEnvelopeJsonSchema,
  type FigureRefineEnvelopeT,
} from './refineEnvelope';
```

- [ ] **Step 6.3: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS (0 errors).

- [ ] **Step 6.4: Commit**

```bash
git add src/stamps/geometry-2d/ai/index.ts
git commit -m "feat(ai): export handleGenerateFigureDelta + refine types từ package"
```

---

## Task 7: Bridge type extension (`GenerateGeometryFigure` accept `currentDsl?`)

**Files:**
- Modify: `src/stamps/shared/types.ts:20-32`

- [ ] **Step 7.1: Read current bridge type definition**

```bash
sed -n '20,32p' src/stamps/shared/types.ts
```

- [ ] **Step 7.2: Add `currentDsl?` field**

Edit `src/stamps/shared/types.ts` — replace the existing `GenerateGeometryFigure` type with:

```ts
/**
 * Consumer-provided bridge to a server-side `generateFigure()` call.
 * Implementations must keep API credentials outside the browser bundle.
 *
 * `onProgress` là optional: nếu consumer dùng streaming endpoint (SSE),
 * forward chunk events vào đây. Non-streaming impl bỏ qua.
 *
 * `currentDsl` (MỚI cho multi-step refine): khi caller có hình hiện tại
 * (state.order.length > 0) và muốn AI sửa/thêm → pass currentDsl. Consumer
 * branch sang refine endpoint. Không pass → build endpoint cũ.
 */
export type GenerateGeometryFigure = (
  problem: string,
  options: {
    signal: AbortSignal;
    onProgress?: (info: AiFigureProgress) => void;
    currentDsl?: import('../geometry-2d/dsl').DslInputT;
  },
) => Promise<AiFigureUiResult>;
```

- [ ] **Step 7.3: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7.4: Commit**

```bash
git add src/stamps/shared/types.ts
git commit -m "feat(ai): bridge GenerateGeometryFigure nhận currentDsl optional"
```

---

## Task 8: `useAiFigure` hook — add mode + currentState + entity counts

**Files:**
- Modify: `src/stamps/geometry-2d/editor/useAiFigure.ts`

- [ ] **Step 8.1: Replace `useAiFigure.ts` with extended implementation**

Replace entire file contents of `src/stamps/geometry-2d/editor/useAiFigure.ts`:

```ts
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { State } from '../../../core/scene';
import type { GenerateGeometryFigure } from '../../shared/types';
import { serializeState } from '../dsl/serialize';

export type AiFigureMode = 'build' | 'refine';

export interface UseAiFigureResult {
  prompt: string;
  setPrompt: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  submit: () => Promise<State | null>;
  cancel: () => void;
  tokens: number;
  mode: AiFigureMode;
  setMode: (mode: AiFigureMode) => void;
  /** Số entity hiện có (cho chip "Thêm vào · 3đ, 1đoạn"). */
  entityCount: { points: number; shapes: number };
  /** True khi state có entity ngoài DSL (vector/arc/transform). Refine phải fallback build. */
  hasUnsupported: boolean;
}

export interface UseAiFigureOptions {
  /** State hiện tại của editor. Khi non-empty → auto mode='refine'. */
  currentState?: State | null;
}

export function useAiFigure(
  generator?: GenerateGeometryFigure,
  options: UseAiFigureOptions = {},
): UseAiFigureResult {
  const { currentState } = options;
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  // Compute serialize once per state change.
  const { dsl: currentDsl, unsupported, entityCount, hasContent } = useMemo(() => {
    if (!currentState || currentState.order.length === 0) {
      return {
        dsl: null,
        unsupported: [],
        entityCount: { points: 0, shapes: 0 },
        hasContent: false,
      };
    }
    const { dsl, unsupported } = serializeState(currentState);
    return {
      dsl,
      unsupported,
      entityCount: { points: dsl.points.length, shapes: dsl.shapes.length },
      hasContent: true,
    };
  }, [currentState]);

  const hasUnsupported = unsupported.length > 0;

  // Auto-detect initial mode: state có content & no unsupported → refine, else build.
  const initialMode: AiFigureMode = hasContent && !hasUnsupported ? 'refine' : 'build';
  const [mode, setModeInternal] = useState<AiFigureMode>(initialMode);

  // If state changes externally (e.g. user undo to empty) and we're in refine mode,
  // force back to build.
  useEffect(() => {
    if (!hasContent && mode === 'refine') setModeInternal('build');
    if (hasUnsupported && mode === 'refine') setModeInternal('build');
  }, [hasContent, hasUnsupported, mode]);

  const setMode = useCallback((next: AiFigureMode) => {
    setModeInternal(next);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const submit = useCallback(async (): Promise<State | null> => {
    const problem = prompt.trim();
    if (!problem) {
      setError('Nhập đề bài cần dựng hình.');
      return null;
    }
    if (!generator) {
      setError('Tính năng dựng hình AI chưa được cấu hình.');
      return null;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);
    setTokens(0);

    try {
      const generated = await generator(problem, {
        signal: controller.signal,
        onProgress: (info) => {
          if (requestId === requestIdRef.current) setTokens(info.tokens);
        },
        ...(mode === 'refine' && currentDsl ? { currentDsl } : {}),
      });
      if (controller.signal.aborted || requestId !== requestIdRef.current) return null;
      if (!generated.ok) {
        setError(generated.message);
        return null;
      }
      return generated.state;
    } catch (caught) {
      if (
        controller.signal.aborted ||
        (caught instanceof DOMException && caught.name === 'AbortError')
      ) {
        return null;
      }
      if (requestId === requestIdRef.current) {
        setError(
          caught instanceof Error && caught.message
            ? caught.message
            : 'Không thể dựng hình bằng AI.',
        );
      }
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
  }, [generator, prompt, mode, currentDsl]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    prompt,
    setPrompt,
    isLoading,
    error,
    submit,
    cancel,
    tokens,
    mode,
    setMode,
    entityCount,
    hasUnsupported,
  };
}
```

- [ ] **Step 8.2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8.3: Update existing useAiFigure tests**

Read `src/stamps/geometry-2d/editor/__tests__/useAiFigure.test.tsx` first:

```bash
cat src/stamps/geometry-2d/editor/__tests__/useAiFigure.test.tsx | head -40
```

Add new tests at the end of the test file (before final `});` if wrapping in describe, or as new describe block). Insert:

```ts
import { renderHook, act } from '@testing-library/react';
import { useAiFigure } from '../useAiFigure';
import type { State } from '../../../../core/scene';

const emptyState: State = { objects: {}, order: [], nextSerial: {} };

const triangleState: State = (() => {
  // Minimal state with 3 free points + 1 polygon — adjust to match actual State shape.
  // Verify the State type fields in core/scene/types before using this fixture.
  return {
    objects: {
      A: { id: 'A', kind: 'point', label: 'A', attrs: { constraint: { kind: 'free', x: 0, y: 3 } } } as any,
      B: { id: 'B', kind: 'point', label: 'B', attrs: { constraint: { kind: 'free', x: -2, y: 0 } } } as any,
      C: { id: 'C', kind: 'point', label: 'C', attrs: { constraint: { kind: 'free', x: 3, y: 0 } } } as any,
      ABC: { id: 'ABC', kind: 'polygon', label: 'ABC', attrs: { vertices: ['A', 'B', 'C'] } } as any,
    },
    order: ['A', 'B', 'C', 'ABC'],
    nextSerial: {},
  } as State;
})();

describe('useAiFigure — mode auto-detect', () => {
  it('empty state → mode=build', () => {
    const { result } = renderHook(() => useAiFigure(undefined, { currentState: emptyState }));
    expect(result.current.mode).toBe('build');
    expect(result.current.entityCount).toEqual({ points: 0, shapes: 0 });
  });

  it('state with triangle → mode=refine + correct counts', () => {
    const { result } = renderHook(() => useAiFigure(undefined, { currentState: triangleState }));
    expect(result.current.mode).toBe('refine');
    expect(result.current.entityCount.points).toBe(3);
    expect(result.current.entityCount.shapes).toBe(1);
    expect(result.current.hasUnsupported).toBe(false);
  });

  it('setMode toggles between build and refine', () => {
    const { result } = renderHook(() => useAiFigure(undefined, { currentState: triangleState }));
    act(() => result.current.setMode('build'));
    expect(result.current.mode).toBe('build');
    act(() => result.current.setMode('refine'));
    expect(result.current.mode).toBe('refine');
  });

  it('submit in mode=refine passes currentDsl to generator', async () => {
    const generator = jest.fn(async () => ({ ok: true as const, state: emptyState }));
    const { result } = renderHook(() =>
      useAiFigure(generator, { currentState: triangleState }),
    );
    act(() => result.current.setPrompt('thêm M là trung điểm BC'));
    await act(async () => {
      await result.current.submit();
    });
    expect(generator).toHaveBeenCalled();
    const opts = generator.mock.calls[0][1];
    expect(opts.currentDsl).toBeDefined();
    expect(opts.currentDsl.points).toHaveLength(3);
  });

  it('submit in mode=build does NOT pass currentDsl', async () => {
    const generator = jest.fn(async () => ({ ok: true as const, state: emptyState }));
    const { result } = renderHook(() =>
      useAiFigure(generator, { currentState: triangleState }),
    );
    act(() => result.current.setMode('build'));
    act(() => result.current.setPrompt('vẽ tam giác đều'));
    await act(async () => {
      await result.current.submit();
    });
    const opts = generator.mock.calls[0][1];
    expect(opts.currentDsl).toBeUndefined();
  });
});
```

> **Note:** If the existing test file already has fixture objects, reuse them and adapt the new tests to match the actual `State` shape. The shape above is a placeholder pattern — verify against `src/core/scene/types.ts` before writing.

- [ ] **Step 8.4: Run tests**

```bash
npm test -- --testPathPattern=useAiFigure.test
```

Expected: PASS (existing + 5 new tests).

If the `triangleState` fixture shape mismatches actual `State` shape, fix the fixture by reading `core/scene/types.ts` first and matching field names exactly. The test should serialize to a DSL with 3 points + 1 polygon.

- [ ] **Step 8.5: Commit**

```bash
git add src/stamps/geometry-2d/editor/useAiFigure.ts src/stamps/geometry-2d/editor/__tests__/useAiFigure.test.tsx
git commit -m "feat(ai): useAiFigure hook hỗ trợ mode build/refine + currentDsl auto-pass"
```

---

## Task 9: `AiFigurePrompt` UI — mode toggle + confirm dialog

**Files:**
- Modify: `src/stamps/geometry-2d/editor/AiFigurePrompt.tsx`

- [ ] **Step 9.1: Replace entire `AiFigurePrompt.tsx`**

Replace contents of `src/stamps/geometry-2d/editor/AiFigurePrompt.tsx`:

```tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { State } from '../../../core/scene';
import type { GenerateGeometryFigure } from '../../shared/types';
import { useAiFigure, type AiFigureMode } from './useAiFigure';

interface Props {
  generator: GenerateGeometryFigure;
  onGenerated: (state: State) => void;
  /**
   * Current editor state. Khi non-empty + no unsupported entity → mode='refine'
   * mặc định. User toggle "Dựng mới" sẽ confirm trước khi thay state.
   */
  currentState?: State | null;
}

const BUILD_EXAMPLES = [
  'Tam giác ABC, dựng trung điểm M của BC',
  'Tam giác ABC vuông tại A, AH là đường cao xuống BC',
  'Hình thoi ABCD, hai đường chéo cắt nhau tại O',
  'Từ điểm M ngoài đường tròn (O), kẻ hai tiếp tuyến',
];

const REFINE_EXAMPLES = [
  'Thêm trung điểm M của BC',
  'Dựng đường cao AH xuống BC',
  'Vẽ đường tròn ngoại tiếp',
  'Thêm tiếp tuyến tại A',
];

export function AiFigurePrompt({ generator, onGenerated, currentState }: Props) {
  const {
    prompt,
    setPrompt,
    isLoading,
    error,
    submit,
    cancel,
    tokens,
    mode,
    setMode,
    entityCount,
    hasUnsupported,
  } = useAiFigure(generator, { currentState });

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isLoading) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isLoading]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const generated = await submit();
      if (generated) onGenerated(generated);
    },
    [onGenerated, submit],
  );

  const handleSwitchToBuild = useCallback(() => {
    if (currentState && currentState.order.length > 0) {
      const ok = window.confirm(
        'Dựng mới sẽ thay toàn bộ hình hiện tại bằng hình mới từ AI. Tiếp tục?',
      );
      if (!ok) return;
    }
    setMode('build');
  }, [currentState, setMode]);

  const primaryLabel = isLoading
    ? tokens > 0
      ? `Đang dựng ${tokens}tok / ${elapsed}s — Huỷ`
      : `Đang dựng... ${elapsed}s — Huỷ`
    : 'Dựng bằng AI';

  const hasContent = currentState != null && currentState.order.length > 0;
  const examples = mode === 'refine' ? REFINE_EXAMPLES : BUILD_EXAMPLES;
  const refineChipLabel =
    entityCount.points + entityCount.shapes > 0
      ? `Thêm vào · ${entityCount.points}đ, ${entityCount.shapes}đoạn`
      : 'Thêm vào';

  return (
    <form
      data-testid="geometry-ai-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="border-b border-slate-200 bg-slate-50 px-3 py-2"
    >
      <label
        htmlFor="geometry-ai-prompt"
        className="mb-1 block text-xs font-medium text-slate-600"
      >
        Dựng hình bằng AI
      </label>

      {/* Mode toggle — chỉ render khi có currentState content (hoặc unsupported warning) */}
      {hasContent && (
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            data-testid="geometry-ai-mode-refine"
            onClick={() => setMode('refine')}
            disabled={isLoading || hasUnsupported}
            className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
              mode === 'refine'
                ? 'border-emerald-600 bg-emerald-100 text-emerald-800'
                : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400'
            } ${hasUnsupported ? 'cursor-not-allowed opacity-50' : ''}`}
            title={
              hasUnsupported
                ? 'Hình hiện tại có đối tượng ngoài DSL — chỉ dựng mới được'
                : refineChipLabel
            }
          >
            {refineChipLabel}
          </button>
          <button
            type="button"
            data-testid="geometry-ai-mode-build"
            onClick={handleSwitchToBuild}
            disabled={isLoading}
            className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
              mode === 'build'
                ? 'border-emerald-600 bg-emerald-100 text-emerald-800'
                : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400'
            }`}
          >
            Dựng mới
          </button>
          {hasUnsupported && (
            <span
              className="text-[10px] text-amber-700"
              data-testid="geometry-ai-unsupported-warning"
            >
              Hình có đối tượng ngoài DSL
            </span>
          )}
        </div>
      )}

      <div className="flex items-start gap-2">
        <textarea
          id="geometry-ai-prompt"
          aria-label="Đề bài cho AI"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={isLoading}
          rows={2}
          placeholder={
            mode === 'refine'
              ? 'Ví dụ: thêm trung điểm M của BC'
              : 'Ví dụ: Cho tam giác ABC, dựng đường cao AH.'
          }
          className="min-h-12 flex-1 resize-none rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 disabled:opacity-60"
        />
        {isLoading ? (
          <button
            type="button"
            onClick={cancel}
            className="rounded bg-amber-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-amber-700"
          >
            {primaryLabel}
          </button>
        ) : (
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="rounded bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {primaryLabel}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}

      {!isLoading && !prompt.trim() && !error && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-slate-500">Gợi ý:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 9.2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9.3: Verify existing AiFigurePrompt smoke tests still pass**

```bash
npm test -- --testPathPattern=AiFigurePrompt
```

Expected: existing tests PASS. (If no AiFigurePrompt tests exist, skip — covered by useAiFigure tests.)

- [ ] **Step 9.4: Commit**

```bash
git add src/stamps/geometry-2d/editor/AiFigurePrompt.tsx
git commit -m "feat(ai): AiFigurePrompt UI 2-mode toggle + auto-detect refine + confirm dialog"
```

---

## Task 10: Wire `currentState` từ `EditorPanel` vào `AiFigurePrompt`

**Files:**
- Modify: `src/stamps/geometry-2d/editor/EditorPanel.tsx`

- [ ] **Step 10.1: Find `<AiFigurePrompt` usage in EditorPanel.tsx**

```bash
grep -n "AiFigurePrompt" src/stamps/geometry-2d/editor/EditorPanel.tsx
```

- [ ] **Step 10.2: Read 10 lines around usage**

```bash
grep -n "AiFigurePrompt" src/stamps/geometry-2d/editor/EditorPanel.tsx | head -1 | cut -d: -f1 | xargs -I {} sh -c 'sed -n "$(({} - 5)),$(({} + 5))p" src/stamps/geometry-2d/editor/EditorPanel.tsx'
```

- [ ] **Step 10.3: Add `currentState={state}` prop**

Edit the `<AiFigurePrompt ... />` line in `EditorPanel.tsx` to pass the current state. The exact name of the state variable depends on context — find where the editor's State is held (likely `state`, `sceneState`, or via a ref). If unsure, search:

```bash
grep -n "useState\|state\s*=" src/stamps/geometry-2d/editor/EditorPanel.tsx | head -10
```

Use the actual state variable name. Example edit pattern:

```tsx
<AiFigurePrompt
  generator={generateGeometryFigure}
  onGenerated={handleAiGenerated}
  currentState={state}      // ← ADD THIS LINE
/>
```

- [ ] **Step 10.4: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 10.5: Verify EditorPanel tests still pass**

```bash
npm test -- --testPathPattern=EditorPanel
```

Expected: PASS.

- [ ] **Step 10.6: Commit**

```bash
git add src/stamps/geometry-2d/editor/EditorPanel.tsx
git commit -m "feat(ai): EditorPanel pass currentState xuống AiFigurePrompt"
```

---

## Task 11: Demo Vite middleware — refine route

**Files:**
- Modify: `scripts/demo/aiMiddlewarePlugin.ts`

- [ ] **Step 11.1: Read existing middleware**

```bash
cat scripts/demo/aiMiddlewarePlugin.ts
```

- [ ] **Step 11.2: Add refine route handlers**

The existing middleware has a `/api/whiteboard/generate-figure` route + `/stream` variant. Mirror them for refine. Locate the existing handler (likely a `req.url === '/api/whiteboard/generate-figure'` branch) and add adjacent branches for `/api/whiteboard/generate-figure-refine` (JSON) and `/api/whiteboard/generate-figure-refine/stream` (SSE).

For each new route:
1. Parse request body: `{ problem: string, currentDsl: DslInputT }` (instead of just `{ problem }`).
2. Call `handleGenerateFigureDelta({ problem, currentDsl }, getOptions())` (instead of `handleGenerateFigure`).
3. Reuse the same SSE encoding logic if the existing stream handler abstracts it (likely yes); otherwise mirror inline.

The exact diff depends on current file structure. Pseudocode pattern:

```ts
// JSON route
if (req.url === '/api/whiteboard/generate-figure-refine' && req.method === 'POST') {
  const body = await readJsonBody(req);
  const { problem, currentDsl } = body;
  if (!problem || !currentDsl) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, message: 'Thiếu problem hoặc currentDsl' }));
    return;
  }
  const result = await handleGenerateFigureDelta({ problem, currentDsl }, getOptions());
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(result));
  return;
}

// SSE route
if (req.url === '/api/whiteboard/generate-figure-refine/stream' && req.method === 'POST') {
  // ... mirror existing /stream handler, swap handleGenerateFigure → handleGenerateFigureDelta
}
```

Imports at top of file:
```ts
import { handleGenerateFigureDelta } from '../../src/stamps/geometry-2d/ai';
```

- [ ] **Step 11.3: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 11.4: Start demo and smoke test manually**

```bash
npm run dev:demo   # or whichever script runs the Vite demo — check package.json
```

If the demo doesn't have a script entry yet, the dev verification happens in Task 12.

- [ ] **Step 11.5: Commit**

```bash
git add scripts/demo/aiMiddlewarePlugin.ts
git commit -m "feat(ai): demo Vite middleware route /generate-figure-refine + /stream"
```

---

## Task 12: Demo client adapter detects `currentDsl` → POST refine endpoint

**Files:**
- Modify: `scripts/demo/main.tsx`

- [ ] **Step 12.1: Find the `generateGeometryFigure` adapter in `main.tsx`**

```bash
grep -n "generateGeometryFigure\|fetch.*generate-figure" scripts/demo/main.tsx
```

- [ ] **Step 12.2: Branch by `currentDsl` presence**

Inside the adapter function `(problem, options) => Promise<AiFigureUiResult>`, add a branch:

```tsx
const url = options.currentDsl
  ? '/api/whiteboard/generate-figure-refine/stream'
  : '/api/whiteboard/generate-figure/stream';

const body = options.currentDsl
  ? JSON.stringify({ problem, currentDsl: options.currentDsl })
  : JSON.stringify({ problem });

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body,
  signal: options.signal,
});
```

Verify SSE parsing logic (existing) still works — the response format is the same (SSE chunks → progress + final result), only the upstream endpoint differs.

- [ ] **Step 12.3: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 12.4: Smoke test (manual)**

Run the demo and verify:
1. Load demo — state empty → AI prompt shows no mode toggle, default examples are "build" style.
2. Submit "Tam giác ABC" → figure rendered. UI now shows mode toggle, "Thêm vào · 3đ, 1đoạn" active.
3. Submit "thêm M là trung điểm BC" → M appears, AM segment drawn.
4. Click "Dựng mới" → confirm dialog appears, accept → mode='build'.
5. Submit "Vẽ tam giác đều" → triangle replaced.

```bash
npm run dev:demo
```

Open browser to dev URL printed (e.g. `http://localhost:5173/`).

- [ ] **Step 12.5: Commit**

```bash
git add scripts/demo/main.tsx
git commit -m "feat(ai): demo client adapter detect currentDsl + POST refine endpoint"
```

---

## Task 13: Final verification — full test + typecheck + build

**Files:** None (verification only)

- [ ] **Step 13.1: Run full test suite**

```bash
npm test
```

Expected: PASS for ALL tests (existing 1199+ + ~38 new = ~1237).

- [ ] **Step 13.2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS (no errors).

- [ ] **Step 13.3: Build package**

```bash
npm run build
```

Expected: PASS, `dist/` regenerated.

- [ ] **Step 13.4: Verify new exports present in `dist/`**

```bash
grep -l "handleGenerateFigureDelta" dist/*.js dist/*.mjs 2>/dev/null
```

Expected: at least 1 file matches.

- [ ] **Step 13.5: Final commit (if any uncommitted)**

```bash
git status
git log --oneline -10
```

Expected: 11 new commits on branch (one per task that committed).

---

## Out of scope (defer)

- Integration smoke test gated `OLLAMA_SMOKE=1` running real Gemma 4B on 10 refine fixtures → defer to P1.4 (eval suite work).
- Anthropic Claude smoke test → defer to P1.4.
- Diff visualization (highlight entity vừa thêm) → defer to UX polish phase.
- Multi-turn conversation history → defer to phase 3 nếu user feedback cần.
- Eval CI gate cho refine fixtures → defer to P1.4.

## Notes for the implementing engineer

- **State shape in tests**: When writing the `triangleState` test fixture in Task 8, read `src/core/scene/types.ts` first to match the real `State`, `SceneObject`, `Constraint2D` shapes. The shape sketched in the plan is illustrative.
- **TranspileErrorCode**: `DUPLICATE_NAME` and `UNKNOWN_REF` already exist in `src/stamps/geometry-2d/dsl/transpile/errors.ts`. The lift logic in `buildFigureDelta.ts` keys off these codes.
- **DSL barrel export**: `src/stamps/geometry-2d/dsl/index.ts` already exports `DslInputT`, `DslInput`, `transpile`. Re-use existing imports.
- **Existing `useAiFigure` tests**: When extending the test file, do NOT delete existing tests — add new `describe` blocks. The hook signature is backward-compatible (new `options` parameter is optional).
- **Demo Vite middleware**: If `scripts/demo/aiMiddlewarePlugin.ts` already has a `getOptions: () => GenerateOptions` callback pattern (per [[feedback-ai-swap-design]]), reuse it for the refine route. Do not hardcode provider/model.
