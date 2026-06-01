# Multi-step refine (handleGenerateFigureDelta) — Design

**Status:** Approved 2026-06-01
**Track:** Issue #42 P1.3 (AI production-ready)
**Related:** [Phase 2.0/2.1 design](2026-05-25-phase2-1-ai-provider-design.md), [DSL kind modules refactor](2026-05-29-dsl-kind-modules-refactor-design.md)

## Mục tiêu

Học sinh đã có hình (vd tam giác ABC), gõ chỉ thị bổ sung ("thêm trung điểm M của BC", "vẽ đường cao AH"). AI emit delta DSL (chỉ entity mới) hoặc thay toàn bộ figure mới. Không cần gõ lại đề từ đầu.

## Scope

- Façade mới `handleGenerateFigureDelta` ở package `@xom11/whiteboard`.
- Schema envelope mới với 3 decision: `add` / `replace` / `refuse`.
- Editor UI mở rộng: 2 mode auto-detect (Dựng mới / Thêm vào) + override.
- 10 refine fixture cho test.
- Demo Vite middleware route mới.

**Out of scope (defer):**
- Consumer hoctotbachkhoa wire (P0.1, session khác).
- Multi-turn conversation history (chỉ 1-shot refine với current DSL).
- Diff visualization (highlight entity vừa thêm).

## Architecture

```
Editor (state có content)
    │ serializeState(state) → { dsl, unsupported }
    │ unsupported.length === 0 ? OK : disable refine + fallback build
    │
    ▼ generator(problem, { signal, onProgress, currentDsl })
HTTP transport (Vite middleware, Next.js route)
    │ POST { problem, currentDsl } → /api/.../generate-figure-refine
    │
    ▼ handleGenerateFigureDelta({ problem, currentDsl }, opts)
buildFigureDelta()
    │ buildRefineSystemPrompt(currentDsl)
    │ provider.call(...) → FigureRefineEnvelopeZ.safeParse
    │
    ├ decision=refuse  → { ok:false, reason:'refused', message }
    ├ decision=replace → transpile(envelope.figure)
    │                    → { ok:true, state }
    └ decision=add     → transpile(concat(currentDsl, envelope.figure))
                          → { ok:true, state }
```

### Module mới

```
src/stamps/geometry-2d/ai/
├── handleGenerateFigureDelta.ts   ← façade (mirror handleGenerateFigure)
├── buildFigureDelta.ts            ← orchestrator
├── refineEnvelope.ts              ← FigureRefineEnvelopeZ
├── refinePrompt.ts                ← buildRefineSystemPrompt(currentDsl)
├── refineFixtures.ts              ← 10 fixture { currentDsl, instruction, expectedDelta }
└── __tests__/
    ├── handleGenerateFigureDelta.test.ts
    ├── buildFigureDelta.test.ts
    ├── refineEnvelope.test.ts
    └── refinePrompt.test.ts
```

### Public API export

```ts
// src/stamps/geometry-2d/ai/index.ts
export {
  handleGenerateFigure,
  type HandleGenerateFigureInput,
  type HandleGenerateFigureOptions,
} from './handleGenerateFigure';
export {
  handleGenerateFigureDelta,                    // ← MỚI
  type HandleGenerateFigureDeltaInput,          // ← MỚI
  type HandleGenerateFigureDeltaOptions,        // ← MỚI
} from './handleGenerateFigureDelta';
```

### Bridge type mở rộng

```ts
// src/stamps/shared/types.ts
export type GenerateGeometryFigure = (
  problem: string,
  options: {
    signal: AbortSignal;
    onProgress?: (info: AiFigureProgress) => void;
    currentDsl?: DslInputT;        // ← MỚI; consumer pass khi mode='refine'
  },
) => Promise<AiFigureUiResult>;
```

Consumer (transport layer) branch theo `currentDsl`: có → POST refine endpoint, không → POST build endpoint cũ.

## Schema

### `FigureRefineEnvelopeZ` (refineEnvelope.ts)

```ts
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

Tách hẳn khỏi `FigureEnvelopeZ` cũ — không union 2 schema vì decision overlap (refuse) gây discriminate phức tạp.

## Prompt

### `buildRefineSystemPrompt(currentDsl)` (refinePrompt.ts)

Nội dung prompt:

```
Bạn là trợ lý vẽ hình học 2D. Học sinh đã có hình hiện tại và muốn THÊM/SỬA.

## Hình hiện tại (DSL JSON)
<JSON.stringify(currentDsl, null, 2)>

## Tên đã dùng
points: <derived from currentDsl.points map(p => p.name)>
shapes: <derived from currentDsl.shapes map(s => s.name)>

## Nhiệm vụ
Đọc YÊU CẦU CHỈNH SỬA → emit envelope:

  { "decision": "add",     "figure": <DSL chỉ chứa entity MỚI> }
  { "decision": "replace", "figure": <DSL hoàn chỉnh thay thế hình cũ> }
  { "decision": "refuse",  "reason": "lý do tiếng Việt" }

## Khi nào dùng decision nào?
- "add": user thêm primitive ("thêm trung điểm M của BC", "dựng đường cao AH").
  → figure chỉ chứa point/shape MỚI. Ref name cũ OK. KHÔNG redefine name cũ.
- "replace": user vẽ lại từ đầu ("vẽ tam giác đều thay vào", "đổi sang hình thoi").
  → figure đầy đủ như prompt mới.
- "refuse": ngoài phạm vi (3D, lượng giác, biến hình lớp 11+).

## Quy tắc cho decision=add
1. Name MỚI không trùng tên cũ. Trùng → đặt khác (M', M1, M2…).
2. ƯU TIÊN derived: midpoint, perpFoot, intersection, …
3. Ref tới name cũ là OK ("A", "B", "C", "ω1").
4. KHÔNG copy lại entity cũ vào figure delta.

## Anti-pattern
- KHÔNG emit add với figure chứa cả entity cũ → đó là replace.
- KHÔNG ref tới name chưa có (chỉ name trong "Hình hiện tại" + name vừa định nghĩa trong delta).

## Ví dụ
<6-8 refine fixtures, mỗi fixture: currentDsl + instruction + expected envelope>

Trả về CHỈ 1 JSON object đúng schema.
```

### Refine fixtures (6-8 cho prompt few-shot, 10 cho test)

Pattern: `{ currentDsl, instruction, expectedEnvelope }`.

| # | currentDsl | instruction | decision | delta/replace |
|---|-----------|-------------|----------|---------------|
| 1 | triangle ABC | "thêm trung điểm M của BC" | add | M=midpoint(B,C) + AM segment |
| 2 | triangle ABC | "dựng đường cao AH xuống BC" | add | H=perpFoot(A, BC) + AH segment |
| 3 | triangle ABC | "vẽ đường tròn ngoại tiếp" | add | O=circumcenter(A,B,C) + ω=circle3(A,B,C) |
| 4 | triangle ABC vuông tại A | "thêm trọng tâm G" | add | G=centroid(A,B,C) |
| 5 | parallelogram ABCD | "vẽ giao điểm 2 đường chéo" | add | AC + BD diagonals + O=intersection |
| 6 | circle (O) + point A on it | "kẻ tiếp tuyến tại A" | add | t=tangent(A, ω) |
| 7 | triangle ABC | "vẽ lại thành tam giác đều" | replace | full equilateral DSL |
| 8 | triangle ABC | "đổi sang hình thoi" | replace | full rhombus DSL |
| 9 | (any) | "tính diện tích tam giác" | refuse | "Yêu cầu tính toán, không phải vẽ hình" |
| 10 | (any) | "vẽ hình chóp SABC" | refuse | "Hình 3D ngoài phạm vi geometry-2d" |

## Orchestrator (buildFigureDelta.ts)

```ts
export interface GenerateDeltaOptions extends GenerateOptions {}

export type GenerateDeltaResult =
  | { ok: true; state: SceneState; mergedDsl: DslInputT; mode: 'add' | 'replace'; usage: TokenUsage; provider: string }
  | { ok: false; reason: 'refused'; message: string; usage?: TokenUsage; provider?: string }
  | { ok: false; reason: 'parse_error'; message: string; raw?: unknown; usage?: TokenUsage; provider?: string }
  | { ok: false; reason: 'transpile_error'; message: string; errors: TranspileError[]; dsl: unknown; usage?: TokenUsage; provider?: string }
  | { ok: false; reason: 'name_collision'; message: string; collisions: string[]; usage?: TokenUsage; provider?: string }
  | { ok: false; reason: 'unresolved_ref'; message: string; refs: string[]; usage?: TokenUsage; provider?: string }
  | { ok: false; reason: 'api_error'; message: string; status?: number; provider?: string };

export async function generateFigureDelta(
  input: { problem: string; currentDsl: DslInputT },
  opts: GenerateDeltaOptions = {},
): Promise<GenerateDeltaResult> {
  // 1. selectProvider
  // 2. buildRefineSystemPrompt(currentDsl)
  // 3. provider.call → FigureRefineEnvelopeZ.safeParse
  // 4. decision=refuse → return
  // 5. decision=replace → transpile(envelope.figure) → return
  // 6. decision=add:
  //    a. Detect name collision: envelope.figure.points|shapes.name ∩ currentDsl names → name_collision
  //    b. Concat: merged = { version:1, points: [...currentDsl.points, ...envelope.figure.points], shapes: similar }
  //    c. transpile(merged) → return (transpile catch unresolved_ref)
}
```

Pre-transpile validation:
- **Name collision check**: trước khi concat, intersect `envelope.figure.points.map(p => p.name)` ∪ `envelope.figure.shapes.map(s => s.name)` với names hiện có. Có overlap → `name_collision` reason kèm list.
- **Unresolved ref**: dựa trên transpile errors. Nếu errors có `code === 'unresolved-ref'` (xem existing TranspileError shape) → lift lên `unresolved_ref` reason.

## Façade (handleGenerateFigureDelta.ts)

Mirror `handleGenerateFigure` 90%:
- Auto-retry max 2 chỉ với `transpile_error`. KHÔNG retry `name_collision`/`unresolved_ref`/`refused`/`api_error`.
- `onResult` callback giống.
- Map error → `AiFigureUiResult` qua `mapErrorToUi`:

```ts
function mapErrorToUi(result: GenerateDeltaResult): AiFigureUiResult {
  if (result.ok) return { ok: true, state: result.state };
  switch (result.reason) {
    case 'refused':         return { ok: false, message: result.message };
    case 'parse_error':     return { ok: false, message: 'AI trả về dữ liệu không hợp lệ...' };
    case 'transpile_error': return { ok: false, message: 'AI tạo hình không hợp lệ (đã thử lại)...' };
    case 'name_collision':  return { ok: false, message: `AI tạo điểm trùng tên (${result.collisions.join(', ')}). Vui lòng diễn đạt lại.` };
    case 'unresolved_ref':  return { ok: false, message: `AI tham chiếu sai tên đối tượng (${result.refs.join(', ')}).` };
    case 'api_error':
    default:                return { ok: false, message: result.message };
  }
}
```

## UI changes

### `AiFigurePrompt.tsx`

Thêm prop `currentState?: State`. Hook `useAiFigure` mở rộng:

```ts
type Mode = 'build' | 'refine';

export interface UseAiFigureResult {
  // existing fields...
  mode: Mode;
  setMode: (mode: Mode) => void;
  /** Số entity hiện có trong state (cho chip label). */
  entityCount: { points: number; shapes: number };
  /** State có entity ngoài DSL (vector/arc/transform) không. Khi true → refine disabled. */
  hasUnsupported: boolean;
}
```

Mode auto-detect logic (trong hook):
```ts
const initialMode: Mode = currentState && currentState.order.length > 0 ? 'refine' : 'build';
```

Hook submit logic:
- `mode === 'build'` → `generator(prompt, { signal, onProgress })` (như cũ)
- `mode === 'refine'` → `generator(prompt, { signal, onProgress, currentDsl: serializeState(currentState).dsl })`

Toggle "Dựng mới" khi đang có state → confirm dialog:
> "Dựng mới sẽ thay toàn bộ hình hiện tại bằng hình mới từ AI. Tiếp tục?"

UI layout:
```
┌─────────────────────────────────────┐
│ Dựng hình bằng AI                    │
│ [● Thêm vào · 3đ, 1đoạn] [○ Dựng mới]│
│ ┌─────────────────────────────────┐ │
│ │ Ví dụ: thêm trung điểm M của BC  │ │
│ └─────────────────────────────────┘ │
│              [Dựng bằng AI]          │
└─────────────────────────────────────┘
```

Gợi ý prompt theo mode:
```ts
const REFINE_EXAMPLES = [
  'Thêm trung điểm M của BC',
  'Dựng đường cao AH xuống BC',
  'Vẽ đường tròn ngoại tiếp',
  'Thêm tiếp tuyến tại A',
];

const BUILD_EXAMPLES = [
  'Tam giác ABC, dựng trung điểm M của BC',
  // ... existing 4
];
```

### `EditorPanel.tsx`

Pass `currentState={state}` vào `<AiFigurePrompt>`. Sau `onGenerated(newState)` → replace state qua handler hiện có (đã có, không sửa).

### `serializeState` unsupported handling

Nếu `unsupported.length > 0`:
- Force `mode='build'`, disable toggle
- Tooltip trên chip: "Hình có {N} đối tượng ngoài DSL — chỉ dựng mới được"
- Banner nhỏ trong AI panel (không block submit nhưng cảnh báo)

## Demo Vite middleware

Thêm route mới ở `scripts/demo/aiMiddlewarePlugin.ts`:

```
POST /api/whiteboard/generate-figure-refine
POST /api/whiteboard/generate-figure-refine/stream  (SSE)

Body: { problem: string, currentDsl: DslInputT }
```

Gọi `handleGenerateFigureDelta` thay vì `handleGenerateFigure`. Lazy config qua `getOptions: () => GenerateOptions` (theo memory [[feedback-ai-swap-design]]).

Demo client (`scripts/demo/main.tsx`) wire `generateGeometryFigure` adapter detect `currentDsl` trong options → POST refine endpoint.

## Test approach

### Unit tests (Jest + mock provider, 100% offline)

1. **refineEnvelope.test.ts** (5-8 tests)
   - Validate add/replace/refuse correct shapes
   - Reject add without figure / refuse without reason
   - JSON schema generation

2. **refinePrompt.test.ts** (3-5 tests)
   - Snapshot test: prompt chứa current DSL JSON đúng
   - Name list extracted correctly
   - Empty currentDsl → vẫn build prompt được (edge case)

3. **buildFigureDelta.test.ts** (12-15 tests)
   - Mock provider emit add với delta hợp lệ → merged state correct
   - Mock provider emit replace → State thay full
   - Mock provider emit refuse → ok:false reason='refused'
   - Mock provider emit add với name trùng → name_collision detected pre-transpile
   - Mock provider emit add với unresolved ref → unresolved_ref (lifted từ transpile error)
   - transpile fail random → retry (max 2 default)
   - Empty problem → api_error
   - Invalid JSON from provider → parse_error
   - currentDsl empty → vẫn chạy được (degenerate case)

4. **handleGenerateFigureDelta.test.ts** (8-10 tests)
   - Mirror handleGenerateFigure tests
   - Error mapping verified
   - onResult callback gọi đúng số attempt
   - maxAttempts clamping

### Refine fixtures (refineFixtures.ts, 10 fixtures)

Mỗi fixture: `{ name, currentDsl, instruction, expectedEnvelope }`. 6-8 dùng trong refine prompt few-shot. Tất cả 10 dùng cho integration smoke test.

### Integration test (gated env)

- `OLLAMA_SMOKE=1` + `pnpm test refine-ollama` → 10 fixture qua Gemma 4B, assert transpile rate ≥70%
- `ANTHROPIC_SMOKE=1` + `pnpm test refine-anthropic` → 5 fixture qua Claude haiku, assert ≥90%

### UI tests (jsdom)

5-7 tests trong `AiFigurePrompt.test.tsx`:
- `currentState=empty` → mode='build' default, chip ẩn
- `currentState=triangle` (3 points + 3 shapes) → mode='refine' default, chip "Thêm vào · 3đ, 3đoạn"
- Toggle "Dựng mới" khi có state → confirm dialog, accept → mode='build'
- `currentState` chứa unsupported entity (vector) → refine disabled, banner hiển thị
- Submit mode='refine' → generator called với currentDsl
- Submit mode='build' → generator called không có currentDsl

## Migration / Backward compat

- `handleGenerateFigure` unchanged. Fixtures cũ unchanged.
- `FigureEnvelopeZ` unchanged.
- `GenerateGeometryFigure` bridge: thêm field optional `currentDsl?` → consumers cũ không pass → behavior cũ.
- `AiFigurePrompt` props: `currentState?` optional → consumers cũ không pass → mode='build' luôn.
- Demo middleware: thêm route mới, route cũ giữ nguyên.

## Open questions

Không có (đã chốt qua brainstorm).

## Acceptance criteria

- [ ] `handleGenerateFigureDelta` export từ `@xom11/whiteboard` package.
- [ ] 10 refine fixtures pass với mock provider (100% transpile).
- [ ] AiFigurePrompt UI có 2 mode toggle + auto-detect.
- [ ] Demo Vite route `/api/whiteboard/generate-figure-refine` hoạt động end-to-end.
- [ ] Unit test coverage ≥90% cho 4 file mới.
- [ ] `npm test` pass (current 1199+ tests + ~40 mới).
- [ ] `npm run typecheck` clean.
- [ ] Smoke test (gated) ≥70% transpile rate với Gemma 4B.

## Out of scope (defer riêng)

- Multi-turn conversation (lưu history, AI biết context các turn trước) — defer cho phase 3 nếu user feedback cần.
- Diff visualization (highlight entity vừa thêm bằng màu khác trong State render) — defer cho UX polish phase.
- Undo last AI add (1-click undo entity AI vừa thêm) — defer; user dùng undo chung của Excalidraw.
- Eval CI gate cho refine fixtures (P1.4 territory) — issue #42 P1.4.
