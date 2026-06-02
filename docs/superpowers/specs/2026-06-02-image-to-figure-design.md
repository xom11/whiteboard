# Image-to-Figure: gửi ảnh đề bài → AI vẽ hình

**Status:** Design (chờ user review)
**Date:** 2026-06-02
**Target release:** 0.26.0
**Related:** [[ai-intent-pipeline-design]] (0.25.0 baseline), [[multi-step-refine-design]]

## Tổng quan

Hiện tại pipeline AI vẽ hình hình học (`handleGenerateFigureIntent`) nhận **text đề bài**. Cô giáo phải gõ tay đề từ sách giáo khoa / đề thi / screenshot — chậm.

Feature này thêm khả năng **gửi ảnh đề bài → OCR ra text → đẩy vào pipeline cũ**. Giữ pipeline DSL/intent (đã tune Tier 4+5) nguyên vẹn; chỉ thêm 1 layer OCR ở đầu vào.

### Out of scope (defer ≥ 0.27)

- Multi-image stitch (đề thi scan 2-3 trang)
- Camera capture trực tiếp trên mobile (`<input capture>`)
- OCR chữ viết tay
- 1-shot vision → DSL trực tiếp (bỏ qua text trung gian)
- Math formula → LaTeX (chỉ giữ Unicode ký hiệu)
- Stamp riêng cho "OCR result" — text vào thẳng existing DSL pipeline

## Architecture

### Flow tổng

```
[File ảnh từ user]
    │ (file picker | clipboard paste | drag-drop)
    ↓
[ImageDropZone client-side]
    │ (validate type/size, downscale 2048px max, encode base64)
    ↓
[handleExtractProblem(image, opts)]
    │ (façade, error mapping → ExtractUiResult)
    ↓
[vision/extractProblem.ts orchestrator]
    │ (build VisionRequest, gọi provider.extractText(), parse envelope, post-process)
    ↓
[provider.extractText()] (Ollama Gemma 3 4B vision / Claude 4.x vision)
    │ (JSON envelope { text, confidence? } hoặc decision: 'refuse')
    ↓
[Auto-fill textarea AiFigurePrompt]
    │ (user xem/sửa nếu cần, nhấn "Vẽ hình")
    ↓
[handleGenerateFigureIntent(text)] — EXISTING pipeline 0.25.0, không đổi
    ↓
[DSL → JSXGraph → hình]
```

### Module layout

```
src/stamps/geometry-2d/ai/
├── providers/
│   ├── types.ts            ← extend: AIProvider.extractText?() optional method
│   ├── anthropic.ts        ← impl: image content block (Claude 4.x vision)
│   ├── ollama.ts           ← impl: images[] field (Gemma 3 multimodal)
│   └── index.ts            ← selectProvider() unchanged
├── vision/                  ← NEW
│   ├── extractProblem.ts    ← orchestrator (image → text)
│   ├── prompt.ts            ← OCR-specialized prompt (Vietnamese math)
│   ├── envelope.ts          ← Zod schema { text, confidence? }
│   ├── preprocess.ts        ← downscale, format detection, base64 encode
│   └── __tests__/
└── handleExtractProblem.ts  ← NEW façade (parallel với handleGenerateFigureIntent)

src/stamps/geometry-2d/editor/
├── AiFigurePrompt.tsx       ← extend: thêm ImageDropZone, state machine
└── ImageDropZone.tsx        ← NEW sub-component
```

### Provider abstraction extension

Mở rộng `AIProvider` interface bằng cách thêm **optional method** `extractText?()`, không break consumer cũ:

```ts
// src/stamps/geometry-2d/ai/providers/types.ts (extend)

export interface ImagePart {
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
  base64: string; // không bao gồm "data:image/...;base64," prefix
}

export interface VisionRequest {
  systemPrompt: string;
  userPrompt: string;
  schema: Record<string, unknown>;
  images: ImagePart[];           // v1: luôn length 1; array để forward-compat
  model?: string;                // optional override, default = provider chọn
  maxTokens: number;
  signal?: AbortSignal;
}

export interface AIProvider {
  readonly name: string;
  readonly defaultModel: string;
  call(req: ProviderRequest): Promise<ProviderOutput>;
  extractText?(req: VisionRequest): Promise<ProviderOutput>; // NEW optional
}
```

**Anthropic impl** (`providers/anthropic.ts`):
- Reuse fetch path `/v1/messages`.
- Content block: `[{type: 'image', source: {type: 'base64', media_type, data}}, {type: 'text', text: userPrompt}]`.
- Tool input_schema = `req.schema` (giống path `call()`).
- Default vision model: `claude-opus-4-7` (cùng family, vision native).

**Ollama impl** (`providers/ollama.ts`):
- Reuse fetch path `/api/chat`.
- Request body: `{ model, messages: [{role: 'user', content: userPrompt, images: [base64]}], format: schema, stream: false }`.
- Default vision model: `gemma3:4b` (Gemma 3 family multimodal native). Override qua `WHITEBOARD_AI_VISION_MODEL`.

### Vision orchestrator

```ts
// src/stamps/geometry-2d/ai/vision/extractProblem.ts

export interface ExtractProblemOptions extends SelectProviderOptions {
  /** Override model OCR. Default đọc env WHITEBOARD_AI_VISION_MODEL. */
  visionModel?: string;
  maxTokens?: number; // default 1024
}

export interface ExtractProblemResult {
  ok: true;
  text: string;
  confidence: 'high' | 'low';
  usage: { inputTokens: number; outputTokens: number };
}

export interface ExtractProblemRefuse {
  ok: false;
  reason: 'not-math' | 'unreadable' | 'empty';
  message: string;
}

export type ExtractProblemOutcome = ExtractProblemResult | ExtractProblemRefuse;

export async function extractProblemFromImage(
  image: ImagePart,
  opts: ExtractProblemOptions = {},
): Promise<ExtractProblemOutcome>;
```

Selector `pickVisionModel(provider, opts, env)` lazy-resolves model theo priority:

1. `opts.visionModel`
2. `env.WHITEBOARD_AI_VISION_MODEL`
3. Provider-specific vision default (`gemma3:4b` cho Ollama, `claude-opus-4-7` cho Anthropic)

→ Code không hardcode provider/model: user dev với Ollama hôm nay, prod đổi `WHITEBOARD_AI_PROVIDER=anthropic` ngày mai mà không touch code (theo pattern `feedback_ai_swap_design.md`).

### Façade `handleExtractProblem`

Mirror shape của `handleGenerateFigureIntent`:

```ts
export type ExtractUiResult =
  | { kind: 'success'; text: string; usage: TokenUsage }
  | { kind: 'low-confidence'; text: string; warning: string; usage: TokenUsage }
  | { kind: 'refused'; reason: 'not-math'; message: string }
  | { kind: 'error'; code: 'network' | 'unsupported' | 'quota' | 'too-large' | 'invalid-format'; message: string };

export async function handleExtractProblem(
  image: ImagePart,
  opts?: ExtractProblemOptions,
): Promise<ExtractUiResult>;
```

UI mapping:
- `success` → setText, focus textarea, scroll vào.
- `low-confidence` → setText + banner vàng "OCR có thể không chính xác, kiểm tra trước khi vẽ".
- `refused` → toast đỏ với message ("Ảnh không có vẻ là đề toán").
- `error` → toast đỏ + button "Thử lại".

## Components & data flow

### `ImageDropZone.tsx` (NEW)

Sub-component nội bộ trong `AiFigurePrompt`. Props:

```tsx
interface ImageDropZoneProps {
  value: ImagePart | null;
  onChange: (image: ImagePart | null) => void;
  disabled?: boolean;
  maxBytes?: number; // default 10 * 1024 * 1024
}
```

Behavior:
- 3 input methods chung 1 handler `handleFile(File): Promise<void>`:
  - `<input type="file" accept="image/png,image/jpeg,image/webp">` (button "Chọn ảnh")
  - `onPaste` ở scope component: đọc `e.clipboardData.items`, filter image
  - `onDrop` + `onDragOver` ở zone div (dashed border)
- `handleFile` →:
  1. Validate type (whitelist 3 format) + size (< 10MB raw).
  2. Downscale qua `createImageBitmap` + `<canvas>` nếu dimension > 2048px max edge.
  3. Encode base64 (`canvas.toDataURL` → strip prefix).
  4. Call `onChange({ mediaType, base64 })`.
- Render:
  - Idle: dashed-border zone "Kéo thả ảnh đề bài vào đây, paste (Ctrl+V), hoặc [Chọn ảnh]".
  - Image-ready: thumbnail 120×120 + filename + button "×" remove.

### `AiFigurePrompt.tsx` (extend existing)

Thêm state + 2 button mới, giữ textarea + "Vẽ hình" cũ:

```tsx
type Phase = 'idle' | 'image-ready' | 'extracting' | 'text-filled' | 'generating' | 'done';

// state mới:
const [image, setImage] = useState<ImagePart | null>(null);
const [confidence, setConfidence] = useState<'high' | 'low' | null>(null);
```

Render order:
1. **ImageDropZone** (collapsible — chỉ show nếu user click "📷 Đọc đề từ ảnh" hoặc đang có ảnh).
2. **ActionRow OCR:**
   - Button "Đọc đề từ ảnh" → disabled khi không có ảnh, loading khi `extracting`.
   - Button "Đọc lại" → chỉ show khi `phase === 'text-filled'` và `image != null`.
3. **TextPromptArea** existing — auto-fill từ OCR result.
4. **Banner low-confidence** (khi `confidence === 'low'`).
5. **ActionRow generate:** "Vẽ hình" existing.

State machine transitions:

```
idle ──setImage──→ image-ready
image-ready ──click "Đọc đề từ ảnh"──→ extracting
extracting ──handleExtractProblem success──→ text-filled (focus textarea)
extracting ──low-confidence──→ text-filled + banner
extracting ──refused/error──→ image-ready + toast
text-filled ──click "Đọc lại"──→ extracting
text-filled ──user remove image──→ idle (giữ text — user có thể đã sửa)
text-filled ──click "Vẽ hình"──→ generating (existing flow)
any ──user xoá image──→ idle (clear image only, giữ text)
```

### Data preprocessing (`vision/preprocess.ts`)

Pure functions (testable nặng):

```ts
export async function fileToImagePart(
  file: File,
  opts?: { maxEdge?: number; maxBytes?: number }
): Promise<ImagePart>;

export function inferMediaType(file: File): ImagePart['mediaType'] | null;

export async function downscaleImage(
  bitmap: ImageBitmap,
  maxEdge: number
): Promise<{ blob: Blob; mediaType: ImagePart['mediaType'] }>;
```

Threshold defaults:
- `maxEdge`: 2048px (Anthropic recommend ≤ 1568 dim cost, ≤ 8000 hard limit; 2048 cap an toàn + đủ chất lượng).
- `maxBytes`: 4MB encoded base64 (Anthropic limit 5MB, buffer 1MB).
- `maxBytes` raw input: 10MB (reject sớm trước khi load vào memory).

## Error handling

### Layer 1 — Client-side validation (trước khi gọi API)

| Case | Code | UX |
|---|---|---|
| File không phải image/png\|jpeg\|webp | `invalid-format` | Toast "Chỉ hỗ trợ PNG, JPEG, WEBP" |
| File > 10 MB raw | `too-large` | Toast "Ảnh quá lớn (> 10MB). Crop hoặc resize trước." |
| HEIC iPhone (decode fail trong canvas) | `invalid-format` | Toast "Định dạng HEIC chưa hỗ trợ. Convert sang JPEG." |
| Dimension > 2048px | (auto-fix) | Silent downscale qua `<canvas>` |

### Layer 2 — Provider response

| Case | UI result kind | UX |
|---|---|---|
| Text ≥ 20 chars, confidence high | `success` | Auto-fill, focus, scroll |
| Text < 20 chars hoặc confidence low | `low-confidence` | Fill + banner vàng |
| Provider trả `decision: 'refuse'` | `refused` | Toast "Ảnh không phải đề toán" |
| Network/timeout/5xx | `error/network` | Toast + "Thử lại" |
| `provider.extractText` undefined | `error/unsupported` | Toast "Provider hiện tại không hỗ trợ đọc ảnh" |
| Anthropic 429 / quota | `error/quota` | Toast + hint env vars |

### Layer 3 — Post-OCR

Text từ OCR đi vào existing pipeline → reuse error UX của `AiFigurePrompt` (transpile fail, refuse, ...). Không cần thêm gì.

Edge case xử lý trong `extractProblem.ts` post-process:
- Strip markdown wrapper (`**bold**`, `_italic_`, ` ``` `).
- Collapse whitespace `\s+` → ` `.
- Normalize Unicode ký hiệu (NFC).
- Truncate nếu text > 2000 chars → warn low-confidence.

## OCR prompt strategy (`vision/prompt.ts`)

System prompt yêu cầu LLM:

1. Đọc text trong ảnh, giữ nguyên **ký hiệu toán** (Δ, ⊥, ∥, °, ⊙, π, →, ≤, ≥, ∈).
2. Bỏ qua **hình vẽ minh hoạ** — chỉ trả phần đề bài (lời văn + công thức inline).
3. Nếu ảnh **không phải đề toán hình học** → `decision: 'refuse'` với reason cụ thể.
4. Nếu text bị mờ / không đọc được rõ ràng (< 50% ký tự confident) → `confidence: 'low'`.
5. Output JSON envelope đúng schema.

Envelope schema:

```ts
// vision/envelope.ts
export const VisionEnvelopeZ = z
  .object({
    decision: z.enum(['extract', 'refuse']),
    text: z.string().optional(),
    confidence: z.enum(['high', 'low']).optional(),
    reason: z.string().optional(),
  })
  .refine(e => e.decision === 'extract' ? (e.text != null && e.text.length > 0) : (e.reason != null), {
    message: 'extract cần text; refuse cần reason',
  });
```

User prompt minimal: `"Đọc đề bài trong ảnh sau."`

## Testing strategy

### Layer 1 — Unit tests (Jest + jsdom)

| Module | Coverage target | Test cases |
|---|---|---|
| `vision/extractProblem.ts` | 90% | Mock provider trả success/refuse/error/low-confidence; verify trim, collapse, refuse mapping |
| `vision/prompt.ts` | 100% | Snapshot prompt content, verify ký hiệu Δ ⊥ ° xuất hiện trong instruction |
| `vision/preprocess.ts` | 95% | `fileToImagePart` happy path + reject cases; `downscaleImage` với fixture bitmap synthetic |
| `vision/envelope.ts` | 100% | Zod parse: valid extract, valid refuse, missing text trong extract → throw |
| `handleExtractProblem.ts` | 90% | Error mapping: undefined extractText → `unsupported`; fetch throw → `network`; refuse → `refused` |
| `editor/ImageDropZone.tsx` | 80% | RTL: file upload, paste event với `clipboardData.items`, drop, remove, preview render |
| `editor/AiFigurePrompt.tsx` (extend) | 85% | State machine transitions, auto-focus textarea sau OCR, banner low-confidence |

### Layer 2 — Provider tests

| Provider | Test |
|---|---|
| `providers/anthropic.ts:extractText` | Mock `fetch`: verify body có `content: [{type: 'image', source: {type: 'base64', media_type, data}}, {type: 'text'}]`, parse tool_use response, error mapping 4xx/5xx |
| `providers/ollama.ts:extractText` | Mock `fetch`: verify body có `messages[0].images: [base64]`, `format: schema`, default model `gemma3:4b`, parse JSON response |

### Layer 3 — Integration eval (script, không CI)

```bash
npx tsx scripts/eval-vision.ts gemma3:4b
npx tsx scripts/eval-vision.ts gemma3:12b
npx tsx scripts/eval-vision.ts claude-opus-4-7
```

**Fixtures:** `scripts/vision-fixtures/` — 10 ảnh thật (5 đề thi in scan, 3 screenshot PDF, 2 phone photo clean). Mỗi ảnh có `<name>.expected.json` chứa text human-typed chuẩn.

**Metric:**
- Character-level F1 (sau Unicode normalize + whitespace collapse).
- Recall ký hiệu toán quan trọng: `{Δ, ⊥, ∥, °, ⊙}`.
- Refusal accuracy: 2 ảnh control (Truyện Kiều, random meme) phải refuse.

**Target v1:**
- Claude Opus 4.7: **≥ 95% F1**, **100% refusal accuracy**.
- Gemma 3 12B: **≥ 85% F1**, **≥ 80% refusal accuracy**.
- Gemma 3 4B: **≥ 75% F1** (chấp nhận miss ký hiệu, là default dev).

Kết quả lưu `docs/superpowers/results/2026-MM-DD-eval-vision-<model>.txt`.

## Dependencies & config

### Runtime deps mới

**Không có.** Dùng Web API native:
- `FileReader`, `createImageBitmap`, `<canvas>` cho preprocess.
- `fetch` cho provider (đã có).

### Env vars mới

```bash
# .env
WHITEBOARD_AI_VISION_MODEL=gemma3:4b   # optional, override model OCR
                                        # default: provider tự chọn vision-capable
```

`WHITEBOARD_AI_PROVIDER` (existing) tự apply cho cả DSL gen và OCR — 1 env var control 2 use case.

### Backwards compatibility

- `extractText?` là **optional method** → provider không impl vẫn satisfy interface. Consumer cũ không động vào `extractText` → 0 break.
- `AiFigurePrompt` props không đổi — `ImageDropZone` là sub-component nội bộ.
- Intent pipeline 0.25.0 không đụng vào.
- Test suite cũ pass nguyên.

## Rollout plan

| Phase | Scope | Verify |
|---|---|---|
| **P1: provider + orchestrator** | `vision/*`, `providers.extractText`, `handleExtractProblem.ts`, unit tests | `npm test` xanh, eval-vision đạt target ≥ 1 model |
| **P2: UI integration** | `ImageDropZone`, extend `AiFigurePrompt`, state machine, error toasts | Manual test browser: upload + paste + drag-drop trên Chrome/Firefox/Safari desktop |
| **P3: real-image eval + docs** | 10 fixture ảnh + 2 control refusal, eval script multi-model, update `CLAUDE.md` "Gotchas" (base64 limit, HEIC, Gemma 3 multimodal) | Eval pass target trên Claude + Gemma 12B |
| **P4: ship 0.26.0** | Bump version, publish npm, update consumer `hoctotbachkhoa` | Smoke test consumer: upload 1 ảnh đề thật → ra hình đúng |

**Không alpha** — test kỹ ở dev branch trước khi merge main, push thẳng 0.26.0.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Gemma 3 4B vision quality kém với ký hiệu toán | Eval ở P3 trước; nếu < 75% F1 → recommend `gemma3:12b` mặc định cho vision, doc trong CLAUDE.md |
| Anthropic vision cost ~70đ/ảnh | Downscale 2048px max + doc cost trong CLAUDE.md; không rate-limit v1, defer khi hit thực tế |
| HEIC từ iPhone không decode browser | Reject với hint convert sang JPEG; defer HEIC support |
| Clipboard paste blocked do browser permission | Fallback graceful: vẫn hỗ trợ file picker + drag-drop, không crash |
| Gemma 3 4B đôi khi trả text quá ngắn / sai schema | Validator + retry 1 lần (giống pattern intent pipeline đã có) |

## Open questions resolved

| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Vision model env riêng? | YES — `WHITEBOARD_AI_VISION_MODEL`, lazy config, không hardcode provider |
| 2 | Rate limit Anthropic v1? | NO — defer khi hit cost thực tế |
| 3 | Alpha release? | NO — test kỹ rồi ship thẳng 0.26.0 |
| 4 | Refuse path? | LLM tự refuse nếu không phải đề toán; low-confidence vẫn fill + banner |
| 5 | Multi-image? | Defer ≥ 0.27 |
| 6 | Camera mobile capture? | Defer ≥ 0.27 |
| 7 | Handwriting OCR? | Defer ≥ 0.27 |
| 8 | 1-shot vision → DSL? | No, dùng 2-stage để user edit text + tái sử dụng pipeline 0.25.0 |
| 9 | Tách `VisionProvider` riêng? | No, extend `AIProvider` với optional `extractText?()` |

## Success criteria

- ✅ Cô giáo upload ảnh đề thi in → text auto-fill textarea trong < 5s (Gemma local) hoặc < 3s (Claude).
- ✅ Text OCR đủ chuẩn để pipeline 0.25.0 transpile thành DSL đúng cho ≥ 80% fixture v1.
- ✅ Paste Ctrl+V screenshot từ máy tính hoạt động trên Chrome + Firefox + Safari desktop.
- ✅ Drag-drop file ảnh hoạt động.
- ✅ Sai ảnh (không phải đề toán) → toast refuse, không silent fill rác.
- ✅ Không break test suite + intent eval cũ.
- ✅ Bundle size không tăng (0 runtime deps mới).
