# Phase 2.1 — Claude SDK + Prompt + Provider (call layer)

**Status:** Spec approved by user 2026-05-25 (auto-accept).
**Target version:** v0.24.0.
**Foundation for:** Phase 2.2 (UX integration in EditorPanel).
**Builds on:** Phase 2.0 (DSL + transpiler, v0.23.0).

Tracks GitHub issue **#40**.

---

## Mục tiêu

Thêm call layer LLM thuần — function `generateFigure(problem, opts)` chạy server-side (Node) nhận đề tiếng Việt, gọi Claude API qua `@anthropic-ai/sdk`, parse tool_use response, chạy transpile từ Phase 2.0, return `GenerateResult`. KHÔNG UI, KHÔNG hook React.

**Tại sao tách Phase 2.1 thành PR riêng:**
1. Call layer pure (network + parse) — isolate khỏi UX concerns (Phase 2.2).
2. Test mock SDK → deterministic, CI free.
3. Consumer có thể tự wire vào Server Action / API route tuỳ stack.

---

## Scope

**In scope (Phase 2.1):**
- `src/stamps/geometry-2d/ai/` module.
- `generateFigure(problem, opts): Promise<GenerateResult>` exported từ root barrel.
- System prompt tiếng Việt + 9 fixture few-shot (import từ `dsl/fixtures/`).
- 2 tools: `build_figure` (DSL JSON Schema từ zod-to-json-schema) + `refuse`.
- `tool_choice: any` (LLM bắt buộc pick 1).
- Prompt caching: 1 ephemeral breakpoint trên system.
- Error model: `refused | parse_error | transpile_error | api_error`.
- Token usage tracking (input/output/cache).
- Mock SDK tests (~30 tests).

**Out of scope (defer Phase 2.2+):**
- UI input "AI prompt" trong EditorPanel (Phase 2.2).
- React hook `useAiFigure()` (Phase 2.2).
- Streaming response.
- Multi-turn conversation.
- Recorded fixture tests (full mock SDK đủ cho v1).
- Eval harness 20-30 đề SGK (Phase 2.3).
- State → DSL reverse serializer (tách issue).

---

## Decisions chốt (brainstorm 2026-05-25)

1. **Call layer thuần.** `generateFigure(problem, opts)` server-side. Consumer wrap trong Server Action / API route.
2. **zod-to-json-schema cho tool input_schema.** Single source of truth từ `DslInput` Zod. Tránh drift.
3. **All 9 fixtures trong system prompt text.** Cached, đủ coverage primitive.
4. **2 tools `build_figure` + `refuse`, `tool_choice: any`.** DSL schema stay clean (không pollute meta), refusal explicit.
5. **Mock SDK cho test.** Deterministic, fast, CI free. Manual smoke với API key thật khi setup local.
6. **Prompt caching ON default.** 1 ephemeral breakpoint trên system (5 phút TTL).
7. **`@anthropic-ai/sdk` là `dependencies`** (không peerDep) — core feature, consumer không tự cài.

---

## Design

### Public API

File: `src/stamps/geometry-2d/ai/index.ts` (barrel) + re-export trong `src/index.ts`.

```ts
import type { SceneState } from '../../../core/scene/types';
import type { DslInputT } from '../dsl';
import type { TranspileError } from '../dsl';

export interface GenerateOptions {
  apiKey: string;
  model?: string;            // default 'claude-opus-4-7'
  maxTokens?: number;        // default 8192
  enableCaching?: boolean;   // default true
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

export function generateFigure(
  problem: string,
  opts: GenerateOptions,
): Promise<GenerateResult>;
```

### File layout

```
src/stamps/geometry-2d/ai/
├── index.ts                Barrel: re-export generateFigure + types
├── provider.ts             Thin @anthropic-ai/sdk wrapper (callProvider)
├── prompt.ts               buildSystemPrompt() + import 9 fixtures
├── tools.ts                BUILD_FIGURE_TOOL + REFUSE_TOOL + zod-to-json-schema gen
├── buildFigure.ts          generateFigure() orchestrator
├── errors.ts               AiError helpers, message formatting tiếng Việt
└── __tests__/
    ├── prompt.test.ts          Snapshot system prompt
    ├── tools.test.ts           Snapshot JSON schemas + shape verify
    ├── provider.test.ts        Mock SDK constructor + args mapping
    └── buildFigure.test.ts     8 scenario mock SDK responses
```

### `tools.ts` — Tool definitions

```ts
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
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

### `prompt.ts` — System prompt builder

```ts
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
    `### Ví dụ ${i + 1}\n**Đề:** ${f.problem}\n**DSL:**\n\`\`\`json\n${JSON.stringify(f.dsl, null, 2)}\n\`\`\``
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

### `provider.ts` — Thin SDK wrap

Thiết kế interface để dễ mock + swap (sang Gateway/proxy nếu cần sau).

```ts
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
    { signal: args.signal },
  );
  return resp as unknown as ProviderResponse;
}
```

### `buildFigure.ts` — Orchestrator

```ts
import type { GenerateOptions, GenerateResult, TokenUsage } from './index';
import { callProvider, type ProviderResponse } from './provider';
import { buildSystemPrompt } from './prompt';
import { TOOLS } from './tools';
import { transpile } from '../dsl';

const DEFAULT_MODEL = 'claude-opus-4-7';
const DEFAULT_MAX_TOKENS = 8192;

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

  let response: ProviderResponse;
  try {
    response = await callProvider({
      apiKey: opts.apiKey,
      model: opts.model ?? DEFAULT_MODEL,
      maxTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: [{
        type: 'text',
        text: systemText,
        ...(enableCaching ? { cache_control: { type: 'ephemeral' as const } } : {}),
      }],
      tools: TOOLS as never,
      toolChoice: { type: 'any' },
      messages: [{ role: 'user', content: problem }],
      signal: opts.signal,
    });
  } catch (e) {
    const err = e as { message?: string; status?: number };
    return {
      ok: false, reason: 'api_error',
      message: err.message ?? 'Lỗi gọi Claude API',
      status: err.status,
    };
  }

  const usage: TokenUsage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
  };

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    const text = response.content.find((c) => c.type === 'text');
    return {
      ok: false, reason: 'parse_error',
      message: 'AI không gọi tool nào. Response: ' + (text?.type === 'text' ? text.text : '(empty)'),
      raw: response.content, usage,
    };
  }

  if (toolUse.name === 'refuse') {
    const input = toolUse.input as { reason?: string };
    return {
      ok: false, reason: 'refused',
      message: input.reason ?? 'AI từ chối không nêu lý do',
      usage,
    };
  }

  if (toolUse.name !== 'build_figure') {
    return {
      ok: false, reason: 'parse_error',
      message: `Tool không xác định: "${toolUse.name}"`,
      raw: toolUse, usage,
    };
  }

  const tResult = transpile(toolUse.input);
  if (!tResult.ok) {
    return {
      ok: false, reason: 'transpile_error',
      message: 'DSL từ AI không hợp lệ',
      errors: tResult.errors,
      dsl: toolUse.input,
      usage,
    };
  }

  return {
    ok: true,
    state: tResult.state,
    dsl: toolUse.input as never, // validated by transpile
    usage,
  };
}
```

### `index.ts` — Barrel

```ts
export { generateFigure } from './buildFigure';
export type { GenerateOptions, GenerateResult, TokenUsage } from './buildFigure';
```

Wire vào root `src/index.ts`:

```ts
export { generateFigure } from './stamps/geometry-2d/ai';
export type { GenerateOptions, GenerateResult, TokenUsage } from './stamps/geometry-2d/ai';
```

---

## Testing plan

### Mock setup

`__mocks__/anthropic.ts` hoặc `jest.mock('@anthropic-ai/sdk')` per-test. Mock returns user-controllable response.

### `prompt.test.ts` (~5 tests)
- Snapshot full `buildSystemPrompt()` output.
- Assert 9 fixture problems all included.
- Assert primitive list complete.
- Assert no exposed API keys / secrets (pattern scan).
- Determinism: 2 calls return identical string.

### `tools.test.ts` (~6 tests)
- Snapshot BUILD_FIGURE_TOOL.input_schema.
- Snapshot REFUSE_TOOL.input_schema.
- Verify no `$ref` trong output (Anthropic chưa support inline-only).
- Verify `refuse.reason` required.
- Verify `build_figure.input_schema.required` chứa `version`, `points`.
- Verify discriminator union shape preserved (anyOf hoặc oneOf).

### `provider.test.ts` (~4 tests)
- Mock SDK constructor — assert apiKey passed.
- Mock Messages.create — assert request shape (model, system, tools, tool_choice).
- Pass-through signal abort.
- Response shape preserved.

### `buildFigure.test.ts` (~10 tests)
- Happy path: build_figure with valid DSL → ok:true with state+dsl+usage
- Refuse: tool refuse with reason → ok:false reason:'refused' message=reason
- Empty problem → ok:false reason:'api_error' message='Đề bài rỗng'
- Empty apiKey → ok:false reason:'api_error' message='apiKey bắt buộc'
- API throws (network) → ok:false reason:'api_error'
- API throws with status → ok:false reason:'api_error' status=N
- No tool_use in response → ok:false reason:'parse_error'
- Unknown tool name → ok:false reason:'parse_error'
- build_figure with malformed DSL → ok:false reason:'transpile_error' errors
- Cache headers propagated to usage (cacheRead/cacheCreation)

**Total: ~25 tests.**

---

## Dependencies thêm

```json
"dependencies": {
  "immer": "^10.2.0",
  "pdfjs-dist": "^5.7.284",
  "zod": "^3.23.8",
  "zod-to-json-schema": "^3.23.0",
  "@anthropic-ai/sdk": "^0.40.0"
}
```

`@anthropic-ai/sdk` là **dependency** (không peerDep): core feature, consumer không phải tự cài.

---

## PR sequencing

Theo pattern subagent (`[[feedback_subagent_execution_pattern]]`): 1 subagent / PR, Sonnet.

### PR 1 — Tools + prompt + snapshot tests
- Add deps `zod-to-json-schema` + `@anthropic-ai/sdk`
- `ai/tools.ts`
- `ai/prompt.ts`
- `ai/__tests__/tools.test.ts`
- `ai/__tests__/prompt.test.ts`
- ~11 tests

### PR 2 — Provider + buildFigure + integration
- `ai/provider.ts`
- `ai/buildFigure.ts`
- `ai/errors.ts` (helpers, message formatting)
- `ai/index.ts` (barrel)
- Wire root `src/index.ts`
- `ai/__tests__/provider.test.ts`
- `ai/__tests__/buildFigure.test.ts`
- ~14 tests

### PR 3 — Release v0.24.0 + docs
- Bump version
- Append README usage section (1 đoạn ngắn)
- Tag + push

---

## Migration & backward compat

- Phase 2.0 (v0.23.0) đã có DSL + transpile. Phase 2.1 chỉ thêm `ai/`. Không sửa DSL/transpile.
- Root `src/index.ts` thêm export — additive, không break consumer cũ.
- Consumer hiện tại chưa dùng AI → no migration.

---

## Out of scope — phase 2 follow-ups

- **Phase 2.2** — UX trong EditorPanel: input textarea, loading state, error display, insert state vào MiniBoard, React hook `useAiFigure()`.
- **Phase 2.3** — Eval harness 20-30 đề SGK, gold-standard comparison.
- **Phase 2.5** — Decorations (length label, right-angle mark, angle marker).
- Streaming response, multi-turn conversation, image input đề.
- State → DSL reverse serializer cho tab "Đối tượng" (issue riêng).

---

## Linked artifacts

- Issue tracker: GitHub issue #40
- Memory: `[[project_ai_feature_phase2_decisions]]`, `[[reference_phase_2_0_dsl_artifacts]]`, `[[feedback_subagent_execution_pattern]]`
- Foundation: `src/stamps/geometry-2d/dsl/` (Phase 2.0)
- Skill: claude-api (prompt caching, tool use best practices)
