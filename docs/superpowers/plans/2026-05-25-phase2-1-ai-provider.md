# Phase 2.1 — Claude SDK + Prompt + Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`. Steps dùng checkbox (`- [ ]`).

**Goal:** Thêm `generateFigure(problem, opts)` chạy server-side gọi Claude API, parse tool_use, chạy transpile từ Phase 2.0 → return `GenerateResult`.

**Architecture:** Module `src/stamps/geometry-2d/ai/` với 5 file (tools, prompt, provider, buildFigure, errors) + barrel. Mock SDK cho test. zod-to-json-schema sinh DSL tool input_schema. 2 tools (`build_figure` + `refuse`) với `tool_choice: any`. Prompt caching 1 ephemeral breakpoint.

**Tech Stack:** TypeScript strict, `@anthropic-ai/sdk` ^0.98, `zod-to-json-schema` ^3.25, Zod ^3.23, Jest 29 + jsdom + ts-jest. Build trên Phase 2.0 DSL (`src/stamps/geometry-2d/dsl/`).

**Spec:** `docs/superpowers/specs/2026-05-25-phase2-1-ai-provider-design.md`

---

## File map

PR 1 (deps + tools + prompt + snapshot tests):
- Modify: `package.json` (add `@anthropic-ai/sdk` + `zod-to-json-schema`)
- Create: `src/stamps/geometry-2d/ai/tools.ts`
- Create: `src/stamps/geometry-2d/ai/prompt.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/tools.test.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/prompt.test.ts`

PR 2 (provider + buildFigure + barrel + wire root):
- Create: `src/stamps/geometry-2d/ai/provider.ts`
- Create: `src/stamps/geometry-2d/ai/buildFigure.ts`
- Create: `src/stamps/geometry-2d/ai/index.ts`
- Modify: `src/index.ts` (re-export public API)
- Create: `src/stamps/geometry-2d/ai/__tests__/provider.test.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts`

PR 3 (release):
- Modify: `package.json` (version bump → 0.24.0)
- Tag: `v0.24.0`

---

## PR 1 — Dependencies + tools + prompt + snapshot tests

### Task 1.1: Add `@anthropic-ai/sdk` + `zod-to-json-schema`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add 2 deps**

Edit `package.json`. Trong `"dependencies"`, add 2 entries (giữ alphabetical):

```json
  "dependencies": {
    "@anthropic-ai/sdk": "^0.98.0",
    "immer": "^10.2.0",
    "pdfjs-dist": "^5.7.284",
    "zod": "^3.23.8",
    "zod-to-json-schema": "^3.25.2"
  }
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: no errors, `package-lock.json` updated.

- [ ] **Step 3: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: typecheck PASS. Lint chỉ pre-existing `tools.tsx` max-lines error (not introduced).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add @anthropic-ai/sdk + zod-to-json-schema cho Phase 2.1"
```

---

### Task 1.2: Tools definition + snapshot test

**Files:**
- Create: `src/stamps/geometry-2d/ai/tools.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/tools.test.ts`

- [ ] **Step 1: Write failing test**

Path: `src/stamps/geometry-2d/ai/__tests__/tools.test.ts`

```ts
// src/stamps/geometry-2d/ai/__tests__/tools.test.ts
import { BUILD_FIGURE_TOOL, REFUSE_TOOL, TOOLS } from '../tools';

describe('BUILD_FIGURE_TOOL', () => {
  it('has name and description', () => {
    expect(BUILD_FIGURE_TOOL.name).toBe('build_figure');
    expect(typeof BUILD_FIGURE_TOOL.description).toBe('string');
    expect(BUILD_FIGURE_TOOL.description.length).toBeGreaterThan(0);
  });

  it('input_schema is object with required fields', () => {
    const s = BUILD_FIGURE_TOOL.input_schema as Record<string, unknown>;
    expect(s.type).toBe('object');
    const required = s.required as string[];
    expect(required).toContain('version');
    expect(required).toContain('points');
  });

  it('input_schema contains no $ref (Anthropic prefers inline)', () => {
    const json = JSON.stringify(BUILD_FIGURE_TOOL.input_schema);
    expect(json).not.toMatch(/\$ref/);
  });

  it('input_schema snapshot stable', () => {
    expect(BUILD_FIGURE_TOOL.input_schema).toMatchSnapshot();
  });
});

describe('REFUSE_TOOL', () => {
  it('name = refuse, requires reason', () => {
    expect(REFUSE_TOOL.name).toBe('refuse');
    const s = REFUSE_TOOL.input_schema as Record<string, unknown>;
    expect((s.required as string[])).toContain('reason');
  });

  it('reason property is string', () => {
    const s = REFUSE_TOOL.input_schema as { properties: { reason: { type: string } } };
    expect(s.properties.reason.type).toBe('string');
  });
});

describe('TOOLS export', () => {
  it('is array of 2 tools', () => {
    expect(TOOLS).toHaveLength(2);
    expect(TOOLS.map((t) => t.name)).toEqual(['build_figure', 'refuse']);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/tools.test.ts`
Expected: FAIL — Cannot find module '../tools'.

- [ ] **Step 3: Implement `tools.ts`**

Path: `src/stamps/geometry-2d/ai/tools.ts`

```ts
// src/stamps/geometry-2d/ai/tools.ts
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DslInput } from '../dsl';

export const BUILD_FIGURE_TOOL = {
  name: 'build_figure',
  description: 'Vẽ hình học 2D theo đề bài. Emit DSL JSON mô tả các điểm và hình.',
  input_schema: zodToJsonSchema(DslInput, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }),
} as const;

const RefuseInputZ = z.object({
  reason: z.string().min(1).describe('Lý do không vẽ được (tiếng Việt)'),
});

export const REFUSE_TOOL = {
  name: 'refuse',
  description: 'Từ chối khi không vẽ được hoặc đề ngoài phạm vi (3D, lượng giác, lớp 11+).',
  input_schema: zodToJsonSchema(RefuseInputZ, { target: 'jsonSchema7' }),
} as const;

export const TOOLS = [BUILD_FIGURE_TOOL, REFUSE_TOOL];
```

- [ ] **Step 4: Run test — verify PASS (snapshot tạo lần đầu)**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/tools.test.ts -u`
Expected: PASS. Snapshot file tạo tại `__tests__/__snapshots__/tools.test.ts.snap`.

- [ ] **Step 5: Sanity-check snapshot**

Read `src/stamps/geometry-2d/ai/__tests__/__snapshots__/tools.test.ts.snap`. Confirm:
- Snapshot có `type: 'object'`
- `properties.version` có `const: 1` (Zod literal)
- `properties.points` là array
- `properties.shapes` là array
- Không `$ref`

Nếu lạ → BLOCKED.

- [ ] **Step 6: Run lại không -u → stable**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/tools.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/stamps/geometry-2d/ai/tools.ts src/stamps/geometry-2d/ai/__tests__/tools.test.ts src/stamps/geometry-2d/ai/__tests__/__snapshots__/
git commit -m "feat(ai): build_figure + refuse tools (zod-to-json-schema) — PR 1/3"
```

---

### Task 1.3: System prompt builder + snapshot test

**Files:**
- Create: `src/stamps/geometry-2d/ai/prompt.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/prompt.test.ts`

- [ ] **Step 1: Write failing test**

Path: `src/stamps/geometry-2d/ai/__tests__/prompt.test.ts`

```ts
// src/stamps/geometry-2d/ai/__tests__/prompt.test.ts
import { buildSystemPrompt } from '../prompt';

describe('buildSystemPrompt', () => {
  it('returns non-empty string', () => {
    const p = buildSystemPrompt();
    expect(typeof p).toBe('string');
    expect(p.length).toBeGreaterThan(1000);
  });

  it('contains 9 fixture problem statements', () => {
    const p = buildSystemPrompt();
    const problems = [
      'Cho tam giác đều ABC cạnh 4',
      'trung điểm BC',
      'đường cao xuống BC',
      'trọng tâm',
      'trực tâm',
      'nội tiếp đường tròn tâm O',
      'tâm nội tiếp',
      'Hình bình hành ABCD',
      'Hai đường tròn',
    ];
    for (const needle of problems) {
      expect(p).toContain(needle);
    }
  });

  it('lists all primitive kinds', () => {
    const p = buildSystemPrompt();
    const kinds = [
      'free', 'midpoint', 'onSegment', 'onLine', 'onCircle',
      'perpFoot', 'circumcenter', 'incenter', 'centroid', 'orthocenter',
      'intersection',
      'segment', 'line', 'ray', 'polygon',
      'perpendicular', 'parallel', 'perpBisector', 'angleBisector', 'tangent',
      'circleCP', 'circle3',
    ];
    for (const k of kinds) {
      expect(p).toContain(k);
    }
  });

  it('mentions both tools build_figure and refuse', () => {
    const p = buildSystemPrompt();
    expect(p).toContain('build_figure');
    expect(p).toContain('refuse');
  });

  it('is deterministic — 2 calls return identical string', () => {
    expect(buildSystemPrompt()).toBe(buildSystemPrompt());
  });

  it('snapshot stable', () => {
    expect(buildSystemPrompt()).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/prompt.test.ts`
Expected: FAIL — Cannot find module '../prompt'.

- [ ] **Step 3: Implement `prompt.ts`**

Path: `src/stamps/geometry-2d/ai/prompt.ts`

```ts
// src/stamps/geometry-2d/ai/prompt.ts
import { fixture as eq } from '../dsl/fixtures/triangle-equilateral';
import { fixture as md } from '../dsl/fixtures/triangle-median';
import { fixture as alt } from '../dsl/fixtures/triangle-altitude';
import { fixture as ce } from '../dsl/fixtures/triangle-centroid';
import { fixture as oc } from '../dsl/fixtures/triangle-orthocenter';
import { fixture as cc } from '../dsl/fixtures/triangle-circumcircle';
import { fixture as ic } from '../dsl/fixtures/triangle-incircle';
import { fixture as par } from '../dsl/fixtures/parallelogram';
import { fixture as two } from '../dsl/fixtures/two-circles-intersect';

const FIXTURES = [eq, md, alt, ce, oc, cc, ic, par, two];

export function buildSystemPrompt(): string {
  const examples = FIXTURES.map((f, i) =>
    `### Ví dụ ${i + 1}\n**Đề:** ${f.problem}\n**DSL:**\n\`\`\`json\n${JSON.stringify(f.dsl, null, 2)}\n\`\`\``,
  ).join('\n\n');

  return `Bạn là trợ lý vẽ hình học 2D cho học sinh THCS và lớp 10 Việt Nam.

## Nhiệm vụ
Đọc đề bài tiếng Việt → emit DSL JSON mô tả hình. Hệ thống sẽ render hình từ DSL.

## Quy tắc
1. Dùng tool \`build_figure\` khi vẽ được. Dùng tool \`refuse\` khi không vẽ được hoặc đề ngoài phạm vi (3D, lượng giác, phép biến hình lớp 11+, đại số).
2. Ưu tiên derived points (midpoint, perpFoot, circumcenter, ...) thay vì tự compute toạ độ.
3. Anchor (free) chỉ dùng cho điểm gốc (thường A, B, C của tam giác). Đặt coord hợp lý quanh gốc (-5..5).
4. Mọi điểm + hình phải có \`name\` (label "A", "M", "O₁", ...). Tham chiếu bằng name, không phải id.
5. Tam giác: emit cả \`polygon\` (vẽ viền) + segment/đường phụ riêng nếu đề yêu cầu (đường cao, trung tuyến).
6. Đường tròn (O; R) cho trước bán kính số: emit anchor helper trên đường tròn rồi dùng \`circleCP\` (DSL không hỗ trợ radius numeric trực tiếp).
7. Nếu đề mơ hồ: chọn case phổ biến nhất, không hỏi lại.

## Primitives sẵn có
**Points:** free, midpoint, onSegment, onLine, onCircle, perpFoot, circumcenter, incenter, centroid, orthocenter, intersection
**Shapes:** segment, line, ray, polygon, perpendicular, parallel, perpBisector, angleBisector, tangent, circleCP, circle3

## 9 ví dụ
${examples}

## Khi không vẽ được
Gọi \`refuse\` với \`reason\` tiếng Việt giải thích cụ thể (vd: "Đề thuộc lớp 11, ngoài phạm vi MVP" hoặc "Đề không rõ vị trí điểm M").`;
}
```

- [ ] **Step 4: Run — PASS với -u (snapshot tạo)**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/prompt.test.ts -u`
Expected: PASS (6 tests).

- [ ] **Step 5: Run không -u — verify stable**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/prompt.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/ai/prompt.ts src/stamps/geometry-2d/ai/__tests__/prompt.test.ts src/stamps/geometry-2d/ai/__tests__/__snapshots__/prompt.test.ts.snap
git commit -m "feat(ai): system prompt builder + 9 fixture few-shot — PR 1/3"
```

---

### Task 1.4: PR 1 final verification

- [ ] **Step 1: Full suite green**

Run: `npm run typecheck && npm test -- --silent && npm run lint`
Expected: typecheck PASS. Tests: 1086 (PR 0) → ~1097 (+11). Lint chỉ pre-existing.

- [ ] **Step 2: File layout**

Run: `ls src/stamps/geometry-2d/ai/`
Expected: `__tests__/  prompt.ts  tools.ts`.

PR 1 done. ✅

---

## PR 2 — Provider + buildFigure + barrel + root wire

### Task 2.1: Provider wrap với mock setup

**Files:**
- Create: `src/stamps/geometry-2d/ai/provider.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/provider.test.ts`

- [ ] **Step 1: Write failing test**

Path: `src/stamps/geometry-2d/ai/__tests__/provider.test.ts`

```ts
// src/stamps/geometry-2d/ai/__tests__/provider.test.ts
import { callProvider } from '../provider';

// Mock @anthropic-ai/sdk
const mockCreate = jest.fn();
const mockConstructor = jest.fn(() => ({
  messages: { create: mockCreate },
}));

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: function Anthropic(args: unknown) {
    return mockConstructor(args);
  },
}));

describe('callProvider', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockConstructor.mockClear();
  });

  it('constructs client with apiKey', async () => {
    mockCreate.mockResolvedValue({
      content: [], stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    await callProvider({
      apiKey: 'sk-test',
      model: 'claude-opus-4-7',
      maxTokens: 100,
      system: [{ type: 'text', text: 'hi' }],
      tools: [],
      toolChoice: { type: 'any' },
      messages: [{ role: 'user', content: 'test' }],
    });
    expect(mockConstructor).toHaveBeenCalledWith({ apiKey: 'sk-test' });
  });

  it('passes through request args to messages.create', async () => {
    mockCreate.mockResolvedValue({
      content: [], stop_reason: 'end_turn',
      usage: { input_tokens: 0, output_tokens: 0 },
    });
    const sys = [{ type: 'text' as const, text: 'system', cache_control: { type: 'ephemeral' as const } }];
    await callProvider({
      apiKey: 'k',
      model: 'claude-opus-4-7',
      maxTokens: 4096,
      system: sys,
      tools: [{ name: 't', description: 'd', input_schema: {} }],
      toolChoice: { type: 'any' },
      messages: [{ role: 'user', content: 'Đề bài' }],
    });
    const [req] = mockCreate.mock.calls[0];
    expect(req.model).toBe('claude-opus-4-7');
    expect(req.max_tokens).toBe(4096);
    expect(req.system).toEqual(sys);
    expect(req.tool_choice).toEqual({ type: 'any' });
    expect(req.messages).toEqual([{ role: 'user', content: 'Đề bài' }]);
  });

  it('returns response shape unchanged', async () => {
    const resp = {
      content: [{ type: 'tool_use', id: 'tu1', name: 'build_figure', input: { hi: 1 } }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 80 },
    };
    mockCreate.mockResolvedValue(resp);
    const r = await callProvider({
      apiKey: 'k', model: 'm', maxTokens: 1, system: [], tools: [],
      toolChoice: { type: 'any' }, messages: [],
    });
    expect(r).toEqual(resp);
  });

  it('propagates AbortSignal via 2nd arg', async () => {
    mockCreate.mockResolvedValue({
      content: [], stop_reason: 'end_turn',
      usage: { input_tokens: 0, output_tokens: 0 },
    });
    const ctrl = new AbortController();
    await callProvider({
      apiKey: 'k', model: 'm', maxTokens: 1, system: [], tools: [],
      toolChoice: { type: 'any' }, messages: [],
      signal: ctrl.signal,
    });
    const [, opts] = mockCreate.mock.calls[0];
    expect(opts).toEqual({ signal: ctrl.signal });
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/provider.test.ts`
Expected: FAIL — Cannot find module '../provider'.

- [ ] **Step 3: Implement `provider.ts`**

Path: `src/stamps/geometry-2d/ai/provider.ts`

```ts
// src/stamps/geometry-2d/ai/provider.ts
import Anthropic from '@anthropic-ai/sdk';

export interface ProviderSystemBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

export interface ProviderToolDef {
  name: string;
  description: string;
  input_schema: unknown;
}

export interface ProviderCallArgs {
  apiKey: string;
  model: string;
  maxTokens: number;
  system: ProviderSystemBlock[];
  tools: ProviderToolDef[];
  toolChoice: { type: 'any' } | { type: 'tool'; name: string };
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  signal?: AbortSignal;
}

export interface ProviderUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export type ProviderContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown };

export interface ProviderResponse {
  content: ProviderContentBlock[];
  stop_reason: string;
  usage: ProviderUsage;
}

export async function callProvider(args: ProviderCallArgs): Promise<ProviderResponse> {
  const client = new Anthropic({ apiKey: args.apiKey });
  const resp = await client.messages.create(
    {
      model: args.model,
      max_tokens: args.maxTokens,
      system: args.system,
      tools: args.tools as never,
      tool_choice: args.toolChoice,
      messages: args.messages,
    },
    args.signal ? { signal: args.signal } : undefined,
  );
  return resp as unknown as ProviderResponse;
}
```

- [ ] **Step 4: Run — PASS**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/provider.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/provider.ts src/stamps/geometry-2d/ai/__tests__/provider.test.ts
git commit -m "feat(ai): provider — @anthropic-ai/sdk wrap + mock-friendly — PR 2/3"
```

---

### Task 2.2: buildFigure orchestrator + comprehensive tests

**Files:**
- Create: `src/stamps/geometry-2d/ai/buildFigure.ts`
- Create: `src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts`

- [ ] **Step 1: Write failing test**

Path: `src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts`

```ts
// src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts
import { generateFigure } from '../buildFigure';
import { fixture as equilateral } from '../../dsl/fixtures/triangle-equilateral';

// Mock provider — KHÔNG mock SDK trực tiếp vì nó được wrap trong provider.ts
const mockCallProvider = jest.fn();
jest.mock('../provider', () => ({
  callProvider: (args: unknown) => mockCallProvider(args),
}));

describe('generateFigure', () => {
  beforeEach(() => mockCallProvider.mockReset());

  it('happy path: build_figure with valid DSL → ok:true', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'build_figure',
        input: equilateral.dsl,
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1500, output_tokens: 120, cache_read_input_tokens: 1400 },
    });
    const r = await generateFigure(equilateral.problem, { apiKey: 'sk-test' });
    if (!r.ok) throw new Error('expected ok: ' + JSON.stringify(r));
    expect(r.state.order).toEqual(['p1', 'p2', 'p3', 'poly1']);
    expect(r.dsl).toEqual(equilateral.dsl);
    expect(r.usage).toEqual({
      inputTokens: 1500, outputTokens: 120,
      cacheReadTokens: 1400, cacheCreationTokens: 0,
    });
  });

  it('refuse path: ok:false reason=refused with message', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'refuse',
        input: { reason: 'Đề thuộc lớp 11, ngoài phạm vi' },
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 100, output_tokens: 20 },
    });
    const r = await generateFigure('biến đổi affine', { apiKey: 'sk-test' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('refused');
    expect(r.message).toBe('Đề thuộc lớp 11, ngoài phạm vi');
    expect(r.usage).toBeDefined();
  });

  it('empty problem → api_error', async () => {
    const r = await generateFigure('', { apiKey: 'sk-test' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('api_error');
    expect(r.message).toContain('rỗng');
  });

  it('empty apiKey → api_error', async () => {
    const r = await generateFigure('Tam giác ABC', { apiKey: '' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('api_error');
    expect(r.message).toContain('apiKey');
  });

  it('SDK throws → api_error preserves status', async () => {
    const err = Object.assign(new Error('Unauthorized'), { status: 401 });
    mockCallProvider.mockRejectedValue(err);
    const r = await generateFigure('Tam giác ABC', { apiKey: 'bad-key' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('api_error');
    expect(r.message).toBe('Unauthorized');
    expect(r.status).toBe(401);
  });

  it('no tool_use in response → parse_error', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{ type: 'text', text: 'Tôi không hiểu' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 5 },
    });
    const r = await generateFigure('xyzzy', { apiKey: 'sk-test' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('parse_error');
  });

  it('unknown tool name → parse_error', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'x', name: 'mystery', input: {} }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 50, output_tokens: 10 },
    });
    const r = await generateFigure('test', { apiKey: 'sk-test' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('parse_error');
    expect(r.message).toContain('mystery');
  });

  it('build_figure with malformed DSL → transpile_error', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'build_figure',
        input: { version: 1, points: [{ name: 'A', kind: 'unknown' }], shapes: [] },
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 100, output_tokens: 30 },
    });
    const r = await generateFigure('test', { apiKey: 'sk-test' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.reason).toBe('transpile_error');
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.dsl).toEqual({ version: 1, points: [{ name: 'A', kind: 'unknown' }], shapes: [] });
  });

  it('default model = claude-opus-4-7', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'build_figure',
        input: equilateral.dsl,
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    await generateFigure(equilateral.problem, { apiKey: 'k' });
    const arg = mockCallProvider.mock.calls[0][0];
    expect(arg.model).toBe('claude-opus-4-7');
    expect(arg.maxTokens).toBe(8192);
  });

  it('enableCaching=true adds cache_control to system', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'build_figure',
        input: equilateral.dsl,
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    await generateFigure(equilateral.problem, { apiKey: 'k', enableCaching: true });
    const arg = mockCallProvider.mock.calls[0][0];
    expect(arg.system[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('enableCaching=false omits cache_control', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'build_figure',
        input: equilateral.dsl,
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    await generateFigure(equilateral.problem, { apiKey: 'k', enableCaching: false });
    const arg = mockCallProvider.mock.calls[0][0];
    expect(arg.system[0].cache_control).toBeUndefined();
  });

  it('forwards signal to callProvider', async () => {
    mockCallProvider.mockResolvedValue({
      content: [{
        type: 'tool_use', id: 'tu1', name: 'build_figure',
        input: equilateral.dsl,
      }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const ctrl = new AbortController();
    await generateFigure(equilateral.problem, { apiKey: 'k', signal: ctrl.signal });
    const arg = mockCallProvider.mock.calls[0][0];
    expect(arg.signal).toBe(ctrl.signal);
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts`
Expected: FAIL — Cannot find module '../buildFigure'.

- [ ] **Step 3: Implement `buildFigure.ts`**

Path: `src/stamps/geometry-2d/ai/buildFigure.ts`

```ts
// src/stamps/geometry-2d/ai/buildFigure.ts
import type { State as SceneState } from '../../../core/scene/types';
import type { DslInputT, TranspileError } from '../dsl';
import { transpile } from '../dsl';
import { callProvider, type ProviderResponse } from './provider';
import { buildSystemPrompt } from './prompt';
import { TOOLS } from './tools';

const DEFAULT_MODEL = 'claude-opus-4-7';
const DEFAULT_MAX_TOKENS = 8192;

export interface GenerateOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  enableCaching?: boolean;
  signal?: AbortSignal;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export type GenerateResult =
  | { ok: true; state: SceneState; dsl: DslInputT; usage: TokenUsage }
  | { ok: false; reason: 'refused'; message: string; usage?: TokenUsage }
  | { ok: false; reason: 'parse_error'; message: string; raw?: unknown; usage?: TokenUsage }
  | { ok: false; reason: 'transpile_error'; message: string; errors: TranspileError[]; dsl: unknown; usage?: TokenUsage }
  | { ok: false; reason: 'api_error'; message: string; status?: number };

function toUsage(u: ProviderResponse['usage']): TokenUsage {
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheCreationTokens: u.cache_creation_input_tokens ?? 0,
  };
}

export async function generateFigure(
  problem: string,
  opts: GenerateOptions,
): Promise<GenerateResult> {
  if (!opts.apiKey) {
    return { ok: false, reason: 'api_error', message: 'apiKey bắt buộc' };
  }
  if (!problem || !problem.trim()) {
    return { ok: false, reason: 'api_error', message: 'Đề bài rỗng' };
  }

  const systemText = buildSystemPrompt();
  const enableCaching = opts.enableCaching !== false;
  const systemBlock = enableCaching
    ? { type: 'text' as const, text: systemText, cache_control: { type: 'ephemeral' as const } }
    : { type: 'text' as const, text: systemText };

  let response: ProviderResponse;
  try {
    response = await callProvider({
      apiKey: opts.apiKey,
      model: opts.model ?? DEFAULT_MODEL,
      maxTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: [systemBlock],
      tools: TOOLS as never,
      toolChoice: { type: 'any' },
      messages: [{ role: 'user', content: problem }],
      signal: opts.signal,
    });
  } catch (e) {
    const err = e as { message?: string; status?: number };
    return {
      ok: false,
      reason: 'api_error',
      message: err.message ?? 'Lỗi gọi Claude API',
      ...(err.status !== undefined ? { status: err.status } : {}),
    };
  }

  const usage = toUsage(response.usage);

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    const text = response.content.find((c) => c.type === 'text');
    const textStr = text?.type === 'text' ? text.text : '(empty)';
    return {
      ok: false,
      reason: 'parse_error',
      message: 'AI không gọi tool nào. Response: ' + textStr,
      raw: response.content,
      usage,
    };
  }

  if (toolUse.name === 'refuse') {
    const input = toolUse.input as { reason?: string };
    return {
      ok: false,
      reason: 'refused',
      message: input.reason ?? 'AI từ chối không nêu lý do',
      usage,
    };
  }

  if (toolUse.name !== 'build_figure') {
    return {
      ok: false,
      reason: 'parse_error',
      message: `Tool không xác định: "${toolUse.name}"`,
      raw: toolUse,
      usage,
    };
  }

  const tResult = transpile(toolUse.input);
  if (!tResult.ok) {
    return {
      ok: false,
      reason: 'transpile_error',
      message: 'DSL từ AI không hợp lệ',
      errors: tResult.errors,
      dsl: toolUse.input,
      usage,
    };
  }

  return {
    ok: true,
    state: tResult.state,
    dsl: toolUse.input as DslInputT,
    usage,
  };
}
```

- [ ] **Step 4: Run — PASS**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/buildFigure.ts src/stamps/geometry-2d/ai/__tests__/buildFigure.test.ts
git commit -m "feat(ai): generateFigure orchestrator + 12 scenario tests — PR 2/3"
```

---

### Task 2.3: Barrel + root export

**Files:**
- Create: `src/stamps/geometry-2d/ai/index.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create AI barrel**

Path: `src/stamps/geometry-2d/ai/index.ts`

```ts
// src/stamps/geometry-2d/ai/index.ts
export { generateFigure } from './buildFigure';
export type {
  GenerateOptions,
  GenerateResult,
  TokenUsage,
} from './buildFigure';
```

- [ ] **Step 2: Add export to root**

Read current `src/index.ts` to find a good insertion point (after existing whiteboard exports, before any internal helpers).

Append (or insert) at logical location:

```ts
export { generateFigure } from './stamps/geometry-2d/ai';
export type {
  GenerateOptions,
  GenerateResult,
  TokenUsage,
} from './stamps/geometry-2d/ai';
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: typecheck PASS, build PASS (dist/* regenerated, `"use client"` injected). Verify `dist/index.d.ts` chứa `generateFigure` signature.

- [ ] **Step 4: Full suite**

Run: `npm test -- --silent`
Expected: full green. ~1097 (PR 1) → ~1113 (+16 từ provider + buildFigure).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: chỉ pre-existing tools.tsx error.

- [ ] **Step 6: Commit**

```bash
git add src/stamps/geometry-2d/ai/index.ts src/index.ts
git commit -m "feat(ai): public barrel + re-export từ root — PR 2/3"
```

---

### Task 2.4: PR 2 final verification

- [ ] **Step 1: Verify file layout**

Run: `ls src/stamps/geometry-2d/ai/`
Expected:
```
__tests__
buildFigure.ts
index.ts
prompt.ts
provider.ts
tools.ts
```

PR 2 done. ✅

---

## PR 3 — Release v0.24.0

### Task 3.1: Bump version + tag

- [ ] **Step 1: Pre-release sanity**

Run: `npm run typecheck && npm test -- --silent && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 2: Bump version**

Run: `npm version minor -m "chore: release v%s — Phase 2.1 Claude SDK call layer"`
Expected: `package.json` → v0.24.0, commit `chore: release v0.24.0 ...`, tag `v0.24.0`.

- [ ] **Step 3: Verify tag**

Run: `git tag -l v0.24.0`
Expected: `v0.24.0`.

- [ ] **Step 4: Push**

Run: `git push --follow-tags origin main`
Expected: push commits + tag v0.24.0.

- [ ] **Step 5: Defer npm publish**

NOT chạy `npm publish`. Defer cùng các release sau nếu user yêu cầu.

PR 3 done. ✅ Phase 2.1 complete.

---

## Summary

- 3 PR, 1 subagent / PR
- ~29 new tests (tools: 7, prompt: 6, provider: 4, buildFigure: 12)
- Public API mới: `generateFigure(problem, opts): Promise<GenerateResult>` + 3 types
- 2 deps mới: `@anthropic-ai/sdk` ^0.98, `zod-to-json-schema` ^3.25
- Tag v0.24.0
- Foundation cho Phase 2.2 (UX integration trong EditorPanel)

**Drift from spec:** Spec liệt kê `ai/errors.ts` cho message formatting; plan YAGNI bỏ vì `buildFigure.ts` dùng inline strings tiếng Việt cho ~5 message paths — không cần module riêng cho MVP. Refactor sau nếu có 3rd path reuse.
