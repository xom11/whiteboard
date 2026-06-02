# Image-to-Figure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cô giáo upload ảnh đề bài → AI OCR ra text → text auto-fill vào textarea AI hiện có → pipeline DSL 0.25.0 vẽ hình.

**Architecture:** 2-stage flow. Thêm optional method `extractText()` vào `AIProvider`, thư mục `ai/vision/` cho orchestrator + prompt, sub-component `ImageDropZone` cho UI (file picker + paste + drag-drop), state machine mới trong `AiFigurePrompt`. Façade + lazy config: Ollama Gemma 3 multimodal default dev, Claude vision optional prod qua env `WHITEBOARD_AI_VISION_MODEL`.

**Tech Stack:** TypeScript strict, React 18, Jest 29 + jsdom + RTL, Zod, @anthropic-ai/sdk (existing), Ollama HTTP, native Web API (File/canvas/createImageBitmap).

**Spec:** `docs/superpowers/specs/2026-06-02-image-to-figure-design.md`

---

## Phase 1 — Provider abstraction extension

### Task 1: Extend `providers/types.ts` với `ImagePart`, `VisionRequest`, optional `extractText?()`

**Files:**
- Modify: `src/stamps/geometry-2d/ai/providers/types.ts`
- Test: `src/stamps/geometry-2d/ai/providers/__tests__/types.test.ts` (create new — currently không có test riêng cho types)

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-2d/ai/providers/__tests__/types.test.ts`:

```ts
import type { AIProvider, ImagePart, VisionRequest } from '../types';

describe('provider types — vision extension', () => {
  it('ImagePart shape: mediaType + base64 strings', () => {
    const img: ImagePart = { mediaType: 'image/png', base64: 'abc' };
    expect(img.mediaType).toBe('image/png');
    expect(img.base64).toBe('abc');
  });

  it('VisionRequest shape: includes images array + optional model', () => {
    const req: VisionRequest = {
      systemPrompt: 's',
      userPrompt: 'u',
      schema: { type: 'object' },
      images: [{ mediaType: 'image/jpeg', base64: 'b64' }],
      maxTokens: 100,
    };
    expect(req.images).toHaveLength(1);
    expect(req.model).toBeUndefined();
  });

  it('AIProvider.extractText is optional (provider can omit)', () => {
    const provider: AIProvider = {
      name: 'mock',
      defaultModel: 'm',
      call: async () => ({ kind: 'error', message: 'noop' }),
      // extractText omitted intentionally
    };
    expect(provider.extractText).toBeUndefined();
  });

  it('AIProvider with extractText satisfies interface', () => {
    const provider: AIProvider = {
      name: 'mock',
      defaultModel: 'm',
      call: async () => ({ kind: 'error', message: 'noop' }),
      extractText: async () => ({ kind: 'error', message: 'noop' }),
    };
    expect(typeof provider.extractText).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/types.test.ts`
Expected: FAIL với "Module has no exported member 'ImagePart'" hoặc tương đương.

- [ ] **Step 3: Extend types.ts**

Append to `src/stamps/geometry-2d/ai/providers/types.ts`:

```ts
// Vision capability (optional) — image OCR + structured output.

export interface ImagePart {
  /** Whitelist 3 format browser decode native được. */
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Base64 không bao gồm "data:image/...;base64," prefix. */
  base64: string;
}

export interface VisionRequest {
  systemPrompt: string;
  userPrompt: string;
  /** JSON Schema constraint output. */
  schema: Record<string, unknown>;
  /** v1 luôn length 1; array để forward-compat multi-image. */
  images: ImagePart[];
  /** Optional override; nếu omit, provider tự chọn vision-capable default. */
  model?: string;
  maxTokens: number;
  signal?: AbortSignal;
}
```

Modify existing `AIProvider` interface — add optional method:

```ts
export interface AIProvider {
  readonly name: string;
  readonly defaultModel: string;
  call(req: ProviderRequest): Promise<ProviderOutput>;
  /**
   * Optional vision capability. Provider không impl → caller check undefined
   * trước khi gọi (façade trả error code='unsupported').
   */
  extractText?(req: VisionRequest): Promise<ProviderOutput>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/types.test.ts`
Expected: PASS (4/4).

Run full provider test suite: `npx jest src/stamps/geometry-2d/ai/providers/`
Expected: existing tests vẫn pass.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/providers/types.ts \
        src/stamps/geometry-2d/ai/providers/__tests__/types.test.ts
git commit -m "feat(ai): extend AIProvider với ImagePart + VisionRequest + optional extractText()"
```

---

### Task 2: Vision envelope schema (`vision/envelope.ts`)

**Files:**
- Create: `src/stamps/geometry-2d/ai/vision/envelope.ts`
- Test: `src/stamps/geometry-2d/ai/vision/__tests__/envelope.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-2d/ai/vision/__tests__/envelope.test.ts`:

```ts
import { VisionEnvelopeZ, visionEnvelopeJsonSchema } from '../envelope';

describe('VisionEnvelope', () => {
  it('parse decision=extract với text valid', () => {
    const e = VisionEnvelopeZ.parse({ decision: 'extract', text: 'Cho tam giác ABC', confidence: 'high' });
    expect(e.decision).toBe('extract');
    expect(e.text).toBe('Cho tam giác ABC');
    expect(e.confidence).toBe('high');
  });

  it('parse decision=refuse với reason valid', () => {
    const e = VisionEnvelopeZ.parse({ decision: 'refuse', reason: 'Ảnh không phải đề toán' });
    expect(e.decision).toBe('refuse');
    expect(e.reason).toBe('Ảnh không phải đề toán');
  });

  it('throw khi extract thiếu text', () => {
    expect(() => VisionEnvelopeZ.parse({ decision: 'extract' })).toThrow();
  });

  it('throw khi extract text rỗng', () => {
    expect(() => VisionEnvelopeZ.parse({ decision: 'extract', text: '' })).toThrow();
  });

  it('throw khi refuse thiếu reason', () => {
    expect(() => VisionEnvelopeZ.parse({ decision: 'refuse' })).toThrow();
  });

  it('confidence default omitted (optional)', () => {
    const e = VisionEnvelopeZ.parse({ decision: 'extract', text: 'abc' });
    expect(e.confidence).toBeUndefined();
  });

  it('jsonSchema generator returns object schema', () => {
    const schema = visionEnvelopeJsonSchema();
    expect(typeof schema).toBe('object');
    expect((schema as { type?: string }).type).toBe('object');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/ai/vision/__tests__/envelope.test.ts`
Expected: FAIL với "Cannot find module '../envelope'".

- [ ] **Step 3: Implement envelope.ts**

Create `src/stamps/geometry-2d/ai/vision/envelope.ts`:

```ts
// src/stamps/geometry-2d/ai/vision/envelope.ts
//
// Envelope schema cho OCR output. AI vision luôn emit:
//   { decision: 'extract', text: '...', confidence?: 'high'|'low' }
//   { decision: 'refuse',  reason: '...' }
//
// Schema flatten được pass cho cả Anthropic tool input_schema + Ollama format.

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const VisionEnvelopeZ = z
  .object({
    decision: z.enum(['extract', 'refuse']),
    text: z.string().optional(),
    confidence: z.enum(['high', 'low']).optional(),
    reason: z.string().optional(),
  })
  .refine(
    (e) =>
      e.decision === 'extract'
        ? e.text != null && e.text.length > 0
        : e.reason != null && e.reason.length > 0,
    { message: 'extract cần text không rỗng; refuse cần reason không rỗng' },
  );

export type VisionEnvelopeT = z.infer<typeof VisionEnvelopeZ>;

export function visionEnvelopeJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(VisionEnvelopeZ, {
    $refStrategy: 'none',
    target: 'jsonSchema7',
  }) as Record<string, unknown>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/ai/vision/__tests__/envelope.test.ts`
Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/vision/envelope.ts \
        src/stamps/geometry-2d/ai/vision/__tests__/envelope.test.ts
git commit -m "feat(ai): vision envelope schema (extract|refuse + confidence)"
```

---

## Phase 2 — Vision orchestrator core

### Task 3: Vision prompt builder (`vision/prompt.ts`)

**Files:**
- Create: `src/stamps/geometry-2d/ai/vision/prompt.ts`
- Test: `src/stamps/geometry-2d/ai/vision/__tests__/prompt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-2d/ai/vision/__tests__/prompt.test.ts`:

```ts
import { buildVisionSystemPrompt, VISION_USER_PROMPT } from '../prompt';

describe('vision prompt', () => {
  it('system prompt instructs reading Vietnamese math text', () => {
    const p = buildVisionSystemPrompt();
    expect(p).toMatch(/tiếng Việt/i);
    expect(p).toMatch(/đề toán|đề bài/i);
  });

  it('system prompt lists key math symbols to preserve', () => {
    const p = buildVisionSystemPrompt();
    expect(p).toContain('Δ');
    expect(p).toContain('⊥');
    expect(p).toContain('°');
  });

  it('system prompt instructs refuse for non-math images', () => {
    const p = buildVisionSystemPrompt();
    expect(p).toMatch(/decision.*refuse|từ chối/i);
  });

  it('system prompt mentions confidence field', () => {
    const p = buildVisionSystemPrompt();
    expect(p).toMatch(/confidence/i);
  });

  it('user prompt is short imperative Vietnamese', () => {
    expect(VISION_USER_PROMPT).toMatch(/đọc.*đề|đề.*ảnh/i);
    expect(VISION_USER_PROMPT.length).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/ai/vision/__tests__/prompt.test.ts`
Expected: FAIL "Cannot find module '../prompt'".

- [ ] **Step 3: Implement prompt.ts**

Create `src/stamps/geometry-2d/ai/vision/prompt.ts`:

```ts
// src/stamps/geometry-2d/ai/vision/prompt.ts
//
// Prompt OCR chuyên đề toán hình học tiếng Việt. Giữ ký hiệu Unicode toán.

export function buildVisionSystemPrompt(): string {
  return [
    'Bạn là OCR chuyên đọc đề toán hình học tiếng Việt từ ảnh.',
    '',
    'NHIỆM VỤ:',
    '1. Đọc text trong ảnh, trả về phần ĐỀ BÀI (lời văn + công thức inline).',
    '2. GIỮ NGUYÊN các ký hiệu toán Unicode: Δ ⊥ ∥ ° ⊙ π → ≤ ≥ ∈ ∉ ∩ ∪.',
    '3. BỎ QUA hình vẽ minh hoạ — chỉ trả phần text.',
    '4. Nếu ảnh KHÔNG phải đề toán hình học (vd: văn học, ảnh đời thường, code, công thức không liên quan): decision="refuse" với reason cụ thể bằng tiếng Việt.',
    '5. Đánh giá confidence:',
    '   - "high": ≥ 80% ký tự đọc rõ ràng, không nghi ngờ.',
    '   - "low": ảnh mờ, có chữ không chắc chắn, hoặc < 80% ký tự confident.',
    '',
    'OUTPUT: JSON theo schema sau, không markdown, không giải thích thêm.',
    '  { "decision": "extract", "text": "...", "confidence": "high"|"low" }',
    '  { "decision": "refuse",  "reason": "..." }',
    '',
    'VÍ DỤ extract success:',
    '  { "decision": "extract", "text": "Cho tam giác ABC vuông tại A. Kẻ đường cao AH ⊥ BC. Chứng minh AH² = BH · CH.", "confidence": "high" }',
    '',
    'VÍ DỤ refuse:',
    '  { "decision": "refuse", "reason": "Ảnh không phải đề toán — đây là một đoạn văn về Truyện Kiều." }',
  ].join('\n');
}

export const VISION_USER_PROMPT = 'Đọc đề bài hình học trong ảnh sau.';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/ai/vision/__tests__/prompt.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/vision/prompt.ts \
        src/stamps/geometry-2d/ai/vision/__tests__/prompt.test.ts
git commit -m "feat(ai): vision OCR prompt cho đề toán hình học tiếng Việt"
```

---

### Task 4: Image preprocessing (`vision/preprocess.ts`)

**Files:**
- Create: `src/stamps/geometry-2d/ai/vision/preprocess.ts`
- Test: `src/stamps/geometry-2d/ai/vision/__tests__/preprocess.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-2d/ai/vision/__tests__/preprocess.test.ts`:

```ts
import { inferMediaType, validateFile, MAX_RAW_BYTES, MAX_EDGE_PX } from '../preprocess';

describe('preprocess.inferMediaType', () => {
  it('returns image/png for png file', () => {
    const f = new File([new Uint8Array([0x89, 0x50])], 'a.png', { type: 'image/png' });
    expect(inferMediaType(f)).toBe('image/png');
  });

  it('returns image/jpeg for jpg file', () => {
    const f = new File([new Uint8Array([0xff, 0xd8])], 'a.jpg', { type: 'image/jpeg' });
    expect(inferMediaType(f)).toBe('image/jpeg');
  });

  it('returns image/webp for webp', () => {
    const f = new File([new Uint8Array([])], 'a.webp', { type: 'image/webp' });
    expect(inferMediaType(f)).toBe('image/webp');
  });

  it('returns null for unsupported type (heic)', () => {
    const f = new File([new Uint8Array([])], 'a.heic', { type: 'image/heic' });
    expect(inferMediaType(f)).toBeNull();
  });

  it('returns null for non-image (pdf)', () => {
    const f = new File([new Uint8Array([])], 'a.pdf', { type: 'application/pdf' });
    expect(inferMediaType(f)).toBeNull();
  });
});

describe('preprocess.validateFile', () => {
  it('accepts valid png under size limit', () => {
    const f = new File([new Uint8Array(1024)], 'a.png', { type: 'image/png' });
    expect(validateFile(f)).toEqual({ ok: true, mediaType: 'image/png' });
  });

  it('rejects unsupported format', () => {
    const f = new File([new Uint8Array(100)], 'a.heic', { type: 'image/heic' });
    const r = validateFile(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('invalid-format');
  });

  it('rejects file > MAX_RAW_BYTES', () => {
    const big = new File([new Uint8Array(MAX_RAW_BYTES + 1)], 'big.png', { type: 'image/png' });
    const r = validateFile(big);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('too-large');
  });
});

describe('preprocess constants', () => {
  it('MAX_EDGE_PX = 2048', () => {
    expect(MAX_EDGE_PX).toBe(2048);
  });
  it('MAX_RAW_BYTES = 10 MB', () => {
    expect(MAX_RAW_BYTES).toBe(10 * 1024 * 1024);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/ai/vision/__tests__/preprocess.test.ts`
Expected: FAIL "Cannot find module '../preprocess'".

- [ ] **Step 3: Implement preprocess.ts**

Create `src/stamps/geometry-2d/ai/vision/preprocess.ts`:

```ts
// src/stamps/geometry-2d/ai/vision/preprocess.ts
//
// Pure-ish browser utilities cho image: validate, infer media type, downscale,
// encode base64. fileToImagePart() là entry point chính cho UI.

import type { ImagePart } from '../providers/types';

export const MAX_EDGE_PX = 2048;
export const MAX_RAW_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ENCODED_BYTES = 4 * 1024 * 1024; // 4 MB sau base64 — cap budget cho Anthropic

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

export type ValidationResult =
  | { ok: true; mediaType: AllowedType }
  | { ok: false; code: 'invalid-format' | 'too-large'; message: string };

export function inferMediaType(file: File): AllowedType | null {
  const t = file.type.toLowerCase();
  if ((ALLOWED_TYPES as readonly string[]).includes(t)) return t as AllowedType;
  return null;
}

export function validateFile(file: File): ValidationResult {
  const mt = inferMediaType(file);
  if (mt == null) {
    return {
      ok: false,
      code: 'invalid-format',
      message: 'Chỉ hỗ trợ PNG, JPEG, WEBP.',
    };
  }
  if (file.size > MAX_RAW_BYTES) {
    return {
      ok: false,
      code: 'too-large',
      message: `Ảnh quá lớn (> ${Math.round(MAX_RAW_BYTES / 1024 / 1024)} MB). Crop hoặc resize trước.`,
    };
  }
  return { ok: true, mediaType: mt };
}

/**
 * Convert File → ImagePart. Auto-downscale nếu max edge > MAX_EDGE_PX.
 * Throws nếu file invalid hoặc decode fail.
 */
export async function fileToImagePart(file: File): Promise<ImagePart> {
  const v = validateFile(file);
  if (!v.ok) throw new Error(v.message);

  // Decode + có thể downscale qua canvas.
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const maxEdge = Math.max(width, height);
  const scale = maxEdge > MAX_EDGE_PX ? MAX_EDGE_PX / maxEdge : 1;
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(targetW, targetH)
      : Object.assign(document.createElement('canvas'), { width: targetW, height: targetH });
  const ctx = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error('Không tạo được canvas 2D context');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  // Encode: PNG nếu input PNG, JPEG cho jpeg/webp (downscale → re-encode JPEG nhỏ hơn).
  const outputType: AllowedType =
    v.mediaType === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, outputType, 0.92);

  // Nếu vẫn quá cap encoded → re-encode JPEG quality thấp hơn 1 lần.
  let finalBlob = blob;
  if (blob.size > MAX_ENCODED_BYTES && outputType === 'image/jpeg') {
    finalBlob = await canvasToBlob(canvas, 'image/jpeg', 0.7);
  }

  const base64 = await blobToBase64(finalBlob);
  return { mediaType: outputType, base64 };
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: AllowedType,
  quality: number,
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas encode fail'))),
      type,
      quality,
    );
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  // btoa cần string → dùng chunked conversion cho Uint8Array.
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/ai/vision/__tests__/preprocess.test.ts`
Expected: PASS — chỉ test pure helpers (`inferMediaType`, `validateFile`, constants). `fileToImagePart` cần browser API, defer integration tới P2 manual test.

> **Note:** Không test `fileToImagePart()` trong jsdom vì `createImageBitmap` + `<canvas>.toBlob` không available. Will manual-test trong Phase 4.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/vision/preprocess.ts \
        src/stamps/geometry-2d/ai/vision/__tests__/preprocess.test.ts
git commit -m "feat(ai): image preprocess — validate + downscale 2048px + base64 encode"
```

---

### Task 5: Vision orchestrator (`vision/extractProblem.ts`)

**Files:**
- Create: `src/stamps/geometry-2d/ai/vision/extractProblem.ts`
- Test: `src/stamps/geometry-2d/ai/vision/__tests__/extractProblem.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-2d/ai/vision/__tests__/extractProblem.test.ts`:

```ts
import { extractProblemFromImage, pickVisionModel } from '../extractProblem';
import type { AIProvider, ImagePart, VisionRequest } from '../../providers/types';

function makeProvider(overrides: Partial<AIProvider> = {}): AIProvider {
  return {
    name: 'mock',
    defaultModel: 'mock-default',
    call: jest.fn(),
    extractText: jest.fn(),
    ...overrides,
  } as AIProvider;
}

const sampleImage: ImagePart = { mediaType: 'image/png', base64: 'iVBOR...' };

describe('pickVisionModel', () => {
  it('priority 1: opts.visionModel', () => {
    expect(pickVisionModel('a', { visionModel: 'override' }, {})).toBe('override');
  });
  it('priority 2: env WHITEBOARD_AI_VISION_MODEL', () => {
    expect(pickVisionModel('ollama-default', {}, { WHITEBOARD_AI_VISION_MODEL: 'envmodel' })).toBe('envmodel');
  });
  it('priority 3: providerDefault fallback', () => {
    expect(pickVisionModel('provider-default', {}, {})).toBe('provider-default');
  });
});

describe('extractProblemFromImage', () => {
  it('success: provider returns extract envelope với text high confidence', async () => {
    const provider = makeProvider({
      extractText: jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'extract', text: 'Cho tam giác ABC', confidence: 'high' },
        usage: { inputTokens: 100, outputTokens: 20 },
      }),
    });
    const r = await extractProblemFromImage(sampleImage, { provider });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).toBe('Cho tam giác ABC');
      expect(r.confidence).toBe('high');
      expect(r.usage.inputTokens).toBe(100);
    }
  });

  it('low-confidence: text < 20 chars OR confidence=low → low confidence', async () => {
    const provider = makeProvider({
      extractText: jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'extract', text: 'ngắn', confidence: 'high' },
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    });
    const r = await extractProblemFromImage(sampleImage, { provider });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.confidence).toBe('low');
  });

  it('post-process: trim + collapse whitespace + strip markdown', async () => {
    const provider = makeProvider({
      extractText: jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'extract', text: '  **Cho**   tam   giác   ABC  ', confidence: 'high' },
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    });
    const r = await extractProblemFromImage(sampleImage, { provider });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toBe('Cho tam giác ABC');
  });

  it('refuse: provider returns decision=refuse → not-math', async () => {
    const provider = makeProvider({
      extractText: jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'refuse', reason: 'Ảnh là truyện Kiều' },
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    });
    const r = await extractProblemFromImage(sampleImage, { provider });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('not-math');
      expect(r.message).toContain('truyện Kiều');
    }
  });

  it('error: provider returns kind=error → unreadable', async () => {
    const provider = makeProvider({
      extractText: jest.fn().mockResolvedValue({
        kind: 'error',
        message: 'Network down',
      }),
    });
    const r = await extractProblemFromImage(sampleImage, { provider });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unreadable');
  });

  it('invalid envelope: data fails schema → empty', async () => {
    const provider = makeProvider({
      extractText: jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'extract' /* missing text */ },
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    });
    const r = await extractProblemFromImage(sampleImage, { provider });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('empty');
  });

  it('passes VisionRequest with images + schema + system prompt to provider', async () => {
    const extractTextSpy = jest.fn().mockResolvedValue({
      kind: 'json',
      data: { decision: 'extract', text: 'Cho tam giác ABC vuông tại A', confidence: 'high' },
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    const provider = makeProvider({ extractText: extractTextSpy });
    await extractProblemFromImage(sampleImage, { provider, visionModel: 'gemma3:12b' });
    const req = extractTextSpy.mock.calls[0][0] as VisionRequest;
    expect(req.images).toHaveLength(1);
    expect(req.images[0]).toEqual(sampleImage);
    expect(req.model).toBe('gemma3:12b');
    expect(req.systemPrompt).toMatch(/đề toán|đề bài/i);
    expect(req.schema).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/ai/vision/__tests__/extractProblem.test.ts`
Expected: FAIL "Cannot find module '../extractProblem'".

- [ ] **Step 3: Implement extractProblem.ts**

Create `src/stamps/geometry-2d/ai/vision/extractProblem.ts`:

```ts
// src/stamps/geometry-2d/ai/vision/extractProblem.ts
//
// Orchestrator vision → text. Gọi provider.extractText() với prompt + envelope
// schema, parse + post-process. Provider-agnostic (Anthropic / Ollama / mock).

import { selectProvider, type SelectProviderOptions } from '../providers';
import type { AIProvider, ImagePart, VisionRequest } from '../providers/types';
import { VisionEnvelopeZ, visionEnvelopeJsonSchema } from './envelope';
import { buildVisionSystemPrompt, VISION_USER_PROMPT } from './prompt';

const MIN_HIGH_CONFIDENCE_CHARS = 20;
const MAX_TEXT_CHARS = 2000;

export interface ExtractProblemOptions extends SelectProviderOptions {
  /** Override model OCR. Priority cao hơn env. */
  visionModel?: string;
  /** Max tokens cho response. Default 1024 (đề bài ngắn). */
  maxTokens?: number;
  /** Env getter override (cho test). */
  env?: Record<string, string | undefined>;
  signal?: AbortSignal;
}

export interface ExtractProblemSuccess {
  ok: true;
  text: string;
  confidence: 'high' | 'low';
  usage: { inputTokens: number; outputTokens: number };
}

export interface ExtractProblemFailure {
  ok: false;
  reason: 'not-math' | 'unreadable' | 'empty' | 'unsupported';
  message: string;
}

export type ExtractProblemOutcome = ExtractProblemSuccess | ExtractProblemFailure;

/** Pick vision model theo priority: opts → env → provider.defaultModel. */
export function pickVisionModel(
  providerDefault: string,
  opts: { visionModel?: string },
  env: Record<string, string | undefined>,
): string {
  return opts.visionModel ?? env.WHITEBOARD_AI_VISION_MODEL ?? providerDefault;
}

export async function extractProblemFromImage(
  image: ImagePart,
  opts: ExtractProblemOptions = {},
): Promise<ExtractProblemOutcome> {
  const provider: AIProvider = opts.provider ?? selectProvider(opts);
  if (!provider.extractText) {
    return {
      ok: false,
      reason: 'unsupported',
      message: `Provider "${provider.name}" không hỗ trợ đọc ảnh.`,
    };
  }

  const env = opts.env ?? readEnv();
  const model = pickVisionModel(provider.defaultModel, opts, env);
  const req: VisionRequest = {
    systemPrompt: buildVisionSystemPrompt(),
    userPrompt: VISION_USER_PROMPT,
    schema: visionEnvelopeJsonSchema(),
    images: [image],
    model,
    maxTokens: opts.maxTokens ?? 1024,
    ...(opts.signal ? { signal: opts.signal } : {}),
  };

  const out = await provider.extractText(req);
  if (out.kind === 'error') {
    return { ok: false, reason: 'unreadable', message: out.message };
  }

  const parsed = VisionEnvelopeZ.safeParse(out.data);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'empty',
      message: 'Không parse được output OCR: ' + parsed.error.message,
    };
  }

  const env_ = parsed.data;
  if (env_.decision === 'refuse') {
    return {
      ok: false,
      reason: 'not-math',
      message: env_.reason ?? 'Ảnh không phải đề toán.',
    };
  }

  // decision === 'extract'
  const rawText = env_.text ?? '';
  const text = postProcess(rawText);
  if (text.length === 0) {
    return { ok: false, reason: 'empty', message: 'OCR không trích được text.' };
  }

  const tooShort = text.length < MIN_HIGH_CONFIDENCE_CHARS;
  const confidence: 'high' | 'low' =
    env_.confidence === 'low' || tooShort ? 'low' : 'high';

  const usage = out.usage ?? { inputTokens: 0, outputTokens: 0 };
  return {
    ok: true,
    text,
    confidence,
    usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
  };
}

function postProcess(raw: string): string {
  let t = raw.trim();
  // Strip markdown wrapper.
  t = t.replace(/\*\*(.+?)\*\*/g, '$1');
  t = t.replace(/\*(.+?)\*/g, '$1');
  t = t.replace(/_(.+?)_/g, '$1');
  t = t.replace(/```[\s\S]*?```/g, '').replace(/`([^`]+)`/g, '$1');
  // Collapse whitespace.
  t = t.replace(/\s+/g, ' ').trim();
  // Normalize Unicode NFC.
  t = t.normalize('NFC');
  // Truncate.
  if (t.length > MAX_TEXT_CHARS) t = t.slice(0, MAX_TEXT_CHARS);
  return t;
}

function readEnv(): Record<string, string | undefined> {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as Record<string, string | undefined>;
  }
  return {};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/ai/vision/__tests__/extractProblem.test.ts`
Expected: PASS (10/10).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/vision/extractProblem.ts \
        src/stamps/geometry-2d/ai/vision/__tests__/extractProblem.test.ts
git commit -m "feat(ai): vision orchestrator extractProblemFromImage()"
```

---

### Task 6: Façade `handleExtractProblem.ts`

**Files:**
- Create: `src/stamps/geometry-2d/ai/handleExtractProblem.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/handleExtractProblem.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-2d/ai/__tests__/handleExtractProblem.test.ts`:

```ts
import { handleExtractProblem } from '../handleExtractProblem';
import type { AIProvider, ImagePart } from '../providers/types';

const sampleImage: ImagePart = { mediaType: 'image/png', base64: 'b64' };

function makeProvider(extractText: AIProvider['extractText']): AIProvider {
  return { name: 'mock', defaultModel: 'm', call: jest.fn(), extractText };
}

describe('handleExtractProblem', () => {
  it('success → kind=success với text', async () => {
    const provider = makeProvider(
      jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'extract', text: 'Cho tam giác ABC vuông tại A', confidence: 'high' },
        usage: { inputTokens: 50, outputTokens: 10 },
      }),
    );
    const r = await handleExtractProblem(sampleImage, { provider });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.text).toBe('Cho tam giác ABC vuông tại A');
      expect(r.usage.inputTokens).toBe(50);
    }
  });

  it('low-confidence → kind=low-confidence + warning', async () => {
    const provider = makeProvider(
      jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'extract', text: 'short', confidence: 'low' },
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    );
    const r = await handleExtractProblem(sampleImage, { provider });
    expect(r.kind).toBe('low-confidence');
    if (r.kind === 'low-confidence') expect(r.warning).toMatch(/kiểm tra|không chính xác/i);
  });

  it('refuse → kind=refused not-math', async () => {
    const provider = makeProvider(
      jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'refuse', reason: 'không phải đề toán' },
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    );
    const r = await handleExtractProblem(sampleImage, { provider });
    expect(r.kind).toBe('refused');
    if (r.kind === 'refused') expect(r.reason).toBe('not-math');
  });

  it('extractText undefined → kind=error code=unsupported', async () => {
    const provider: AIProvider = { name: 'mock', defaultModel: 'm', call: jest.fn() };
    const r = await handleExtractProblem(sampleImage, { provider });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.code).toBe('unsupported');
  });

  it('provider returns kind=error → kind=error code=network', async () => {
    const provider = makeProvider(jest.fn().mockResolvedValue({ kind: 'error', message: 'down' }));
    const r = await handleExtractProblem(sampleImage, { provider });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.code).toBe('network');
  });

  it('provider throws → kind=error code=unexpected', async () => {
    const provider = makeProvider(jest.fn().mockRejectedValue(new Error('boom')));
    const r = await handleExtractProblem(sampleImage, { provider });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.code).toBe('unexpected');
      expect(r.message).toContain('boom');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/handleExtractProblem.test.ts`
Expected: FAIL "Cannot find module '../handleExtractProblem'".

- [ ] **Step 3: Implement handleExtractProblem.ts**

Create `src/stamps/geometry-2d/ai/handleExtractProblem.ts`:

```ts
// src/stamps/geometry-2d/ai/handleExtractProblem.ts
//
// Façade UI-friendly cho extractProblemFromImage. Map outcome → UI result kind.

import {
  extractProblemFromImage,
  type ExtractProblemOptions,
} from './vision/extractProblem';
import type { ImagePart } from './providers/types';

export interface HandleExtractProblemOptions extends ExtractProblemOptions {}

export type ExtractUiResult =
  | {
      kind: 'success';
      text: string;
      usage: { inputTokens: number; outputTokens: number };
    }
  | {
      kind: 'low-confidence';
      text: string;
      warning: string;
      usage: { inputTokens: number; outputTokens: number };
    }
  | {
      kind: 'refused';
      reason: 'not-math';
      message: string;
    }
  | {
      kind: 'error';
      code: 'network' | 'unsupported' | 'unexpected' | 'empty';
      message: string;
    };

export async function handleExtractProblem(
  image: ImagePart,
  opts: HandleExtractProblemOptions = {},
): Promise<ExtractUiResult> {
  try {
    const r = await extractProblemFromImage(image, opts);
    if (r.ok) {
      if (r.confidence === 'low') {
        return {
          kind: 'low-confidence',
          text: r.text,
          warning: 'OCR có thể không chính xác, kiểm tra trước khi vẽ.',
          usage: r.usage,
        };
      }
      return { kind: 'success', text: r.text, usage: r.usage };
    }
    if (r.reason === 'not-math') {
      return { kind: 'refused', reason: 'not-math', message: r.message };
    }
    if (r.reason === 'unsupported') {
      return { kind: 'error', code: 'unsupported', message: r.message };
    }
    if (r.reason === 'unreadable') {
      return { kind: 'error', code: 'network', message: r.message };
    }
    return { kind: 'error', code: 'empty', message: r.message };
  } catch (e) {
    return {
      kind: 'error',
      code: 'unexpected',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/handleExtractProblem.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/handleExtractProblem.ts \
        src/stamps/geometry-2d/ai/__tests__/handleExtractProblem.test.ts
git commit -m "feat(ai): handleExtractProblem façade — map vision outcome → UI result"
```

---

## Phase 3 — Provider implementations

### Task 7: `AnthropicProvider.extractText` impl

**Files:**
- Modify: `src/stamps/geometry-2d/ai/providers/anthropic.ts`
- Test: `src/stamps/geometry-2d/ai/providers/__tests__/anthropic-vision.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-2d/ai/providers/__tests__/anthropic-vision.test.ts`:

```ts
import { AnthropicProvider } from '../anthropic';
import type { VisionRequest } from '../types';

// Mock @anthropic-ai/sdk constructor + messages.create
const messagesCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: messagesCreate },
  }));
});

const sampleVisionReq: VisionRequest = {
  systemPrompt: 'sys',
  userPrompt: 'đọc ảnh',
  schema: { type: 'object' },
  images: [{ mediaType: 'image/png', base64: 'BASE64DATA' }],
  model: 'claude-opus-4-7',
  maxTokens: 512,
};

describe('AnthropicProvider.extractText', () => {
  beforeEach(() => messagesCreate.mockReset());

  it('exposes extractText method', () => {
    const p = new AnthropicProvider({ apiKey: 'k' });
    expect(typeof p.extractText).toBe('function');
  });

  it('sends content with image source.base64 + text user prompt', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'tool_use',
          name: 'extract_problem_envelope',
          input: { decision: 'extract', text: 'Cho ABC', confidence: 'high' },
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: 'tool_use',
    });
    const p = new AnthropicProvider({ apiKey: 'k' });
    const out = await p.extractText!(sampleVisionReq);

    expect(out.kind).toBe('json');
    const callArgs = messagesCreate.mock.calls[0][0];
    const userContent = callArgs.messages[0].content;
    expect(Array.isArray(userContent)).toBe(true);
    expect(userContent[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: 'BASE64DATA' },
    });
    expect(userContent[1]).toEqual({ type: 'text', text: 'đọc ảnh' });
    expect(callArgs.tools[0].name).toBe('extract_problem_envelope');
    expect(callArgs.tool_choice).toEqual({ type: 'tool', name: 'extract_problem_envelope' });
  });

  it('maps tool_use response → kind=json with envelope data', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'tool_use',
          name: 'extract_problem_envelope',
          input: { decision: 'extract', text: 'abc', confidence: 'high' },
        },
      ],
      usage: { input_tokens: 1, output_tokens: 1 },
      stop_reason: 'tool_use',
    });
    const p = new AnthropicProvider({ apiKey: 'k' });
    const out = await p.extractText!(sampleVisionReq);
    expect(out.kind).toBe('json');
    if (out.kind === 'json') {
      expect(out.data).toEqual({ decision: 'extract', text: 'abc', confidence: 'high' });
    }
  });

  it('maps API throw → kind=error', async () => {
    messagesCreate.mockRejectedValueOnce({ message: 'rate limit', status: 429 });
    const p = new AnthropicProvider({ apiKey: 'k' });
    const out = await p.extractText!(sampleVisionReq);
    expect(out.kind).toBe('error');
    if (out.kind === 'error') {
      expect(out.message).toContain('rate limit');
      expect(out.status).toBe(429);
    }
  });

  it('falls back to defaultModel khi req.model omitted', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'tool_use',
          name: 'extract_problem_envelope',
          input: { decision: 'extract', text: 'abc', confidence: 'high' },
        },
      ],
      usage: { input_tokens: 1, output_tokens: 1 },
      stop_reason: 'tool_use',
    });
    const p = new AnthropicProvider({ apiKey: 'k' });
    const req = { ...sampleVisionReq };
    delete (req as { model?: string }).model;
    await p.extractText!(req);
    expect(messagesCreate.mock.calls[0][0].model).toBe('claude-opus-4-7');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/anthropic-vision.test.ts`
Expected: FAIL "p.extractText is not a function".

- [ ] **Step 3: Add `extractText` method to AnthropicProvider**

Modify `src/stamps/geometry-2d/ai/providers/anthropic.ts`. Add import + new method on class:

Add to imports near top (sau `import Anthropic from '@anthropic-ai/sdk';`):

```ts
import type { AIProvider, ImagePart, ProviderOutput, ProviderRequest, ProviderTokenUsage, VisionRequest } from './types';
```

Replace existing `import type { ... } from './types';` line với line trên (combine).

Add constant near `const TOOL_NAME`:

```ts
const VISION_TOOL_NAME = 'extract_problem_envelope';
```

Add method to class `AnthropicProvider` (after existing `call()` method):

```ts
async extractText(req: VisionRequest): Promise<ProviderOutput> {
  const model = req.model ?? this.defaultModel;
  const enableCaching = this.opts.enableCaching !== false;
  const systemBlock = enableCaching
    ? { type: 'text' as const, text: req.systemPrompt, cache_control: { type: 'ephemeral' as const } }
    : { type: 'text' as const, text: req.systemPrompt };

  const tool = {
    name: VISION_TOOL_NAME,
    description: 'Trích đề bài hình học từ ảnh, hoặc từ chối nếu không phải đề toán.',
    input_schema: req.schema,
  };

  const imageBlocks = req.images.map((img: ImagePart) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: img.mediaType,
      data: img.base64,
    },
  }));

  const client = new Anthropic({ apiKey: this.opts.apiKey });
  let resp: Anthropic.Messages.Message;
  try {
    resp = await client.messages.create(
      {
        model,
        max_tokens: req.maxTokens,
        system: [systemBlock],
        tools: [tool as never],
        tool_choice: { type: 'tool', name: VISION_TOOL_NAME },
        messages: [
          {
            role: 'user',
            content: [...imageBlocks, { type: 'text', text: req.userPrompt }],
          },
        ],
      },
      req.signal ? { signal: req.signal } : undefined,
    );
  } catch (e) {
    const err = e as { message?: string; status?: number };
    return {
      kind: 'error',
      message: err.message ?? 'Lỗi gọi Anthropic Vision API',
      ...(err.status !== undefined ? { status: err.status } : {}),
    };
  }

  const usage = toUsage(resp.usage);
  const toolUse = resp.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    return { kind: 'error', message: 'Claude không gọi vision tool. stop_reason=' + resp.stop_reason };
  }
  if (toolUse.name !== VISION_TOOL_NAME) {
    return { kind: 'error', message: `Claude gọi sai tool: ${toolUse.name}` };
  }
  return { kind: 'json', data: toolUse.input, usage };
}
```

> `toUsage()` đã tồn tại trong file (helper cho `call()`). Reuse.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/anthropic-vision.test.ts`
Expected: PASS (5/5).

Verify existing tests vẫn pass: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/anthropic.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/providers/anthropic.ts \
        src/stamps/geometry-2d/ai/providers/__tests__/anthropic-vision.test.ts
git commit -m "feat(ai): AnthropicProvider.extractText() — Claude 4.x vision content blocks"
```

---

### Task 8: `OllamaProvider.extractText` impl

**Files:**
- Modify: `src/stamps/geometry-2d/ai/providers/ollama.ts`
- Test: `src/stamps/geometry-2d/ai/providers/__tests__/ollama-vision.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-2d/ai/providers/__tests__/ollama-vision.test.ts`:

```ts
import { OllamaProvider } from '../ollama';
import type { VisionRequest } from '../types';

const sampleReq: VisionRequest = {
  systemPrompt: 'sys',
  userPrompt: 'đọc',
  schema: { type: 'object' },
  images: [{ mediaType: 'image/png', base64: 'BASE64' }],
  model: 'gemma3:4b',
  maxTokens: 512,
};

function mockFetchOk(content: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      message: { role: 'assistant', content: JSON.stringify(content) },
      prompt_eval_count: 50,
      eval_count: 10,
      done: true,
      model: 'gemma3:4b',
    }),
  }) as unknown as typeof fetch;
}

describe('OllamaProvider.extractText', () => {
  it('exposes extractText method', () => {
    const p = new OllamaProvider();
    expect(typeof p.extractText).toBe('function');
  });

  it('sends POST /api/chat with images[] in messages[0]', async () => {
    const f = mockFetchOk({ decision: 'extract', text: 'abc', confidence: 'high' });
    const p = new OllamaProvider({ fetchImpl: f });
    await p.extractText!(sampleReq);

    const [url, init] = (f as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:11434/api/chat');
    const body = JSON.parse((init.body as string));
    expect(body.model).toBe('gemma3:4b');
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: 'sys',
    });
    expect(body.messages[1]).toMatchObject({
      role: 'user',
      content: 'đọc',
      images: ['BASE64'],
    });
    expect(body.format).toEqual({ type: 'object' });
    expect(body.stream).toBe(false);
  });

  it('parses JSON response → kind=json with envelope data', async () => {
    const f = mockFetchOk({ decision: 'extract', text: 'tam giác', confidence: 'high' });
    const p = new OllamaProvider({ fetchImpl: f });
    const out = await p.extractText!(sampleReq);
    expect(out.kind).toBe('json');
    if (out.kind === 'json') {
      expect(out.data).toEqual({ decision: 'extract', text: 'tam giác', confidence: 'high' });
      expect(out.usage?.inputTokens).toBe(50);
    }
  });

  it('falls back to defaultModel khi req.model omitted', async () => {
    const f = mockFetchOk({ decision: 'extract', text: 'abc', confidence: 'high' });
    const p = new OllamaProvider({ fetchImpl: f, defaultModel: 'gemma3:12b' });
    const req = { ...sampleReq };
    delete (req as { model?: string }).model;
    await p.extractText!(req);
    const body = JSON.parse(((f as jest.Mock).mock.calls[0][1] as { body: string }).body);
    expect(body.model).toBe('gemma3:12b');
  });

  it('maps HTTP 5xx → kind=error', async () => {
    const f = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal',
      text: async () => 'server crash',
    }) as unknown as typeof fetch;
    const p = new OllamaProvider({ fetchImpl: f });
    const out = await p.extractText!(sampleReq);
    expect(out.kind).toBe('error');
    if (out.kind === 'error') expect(out.status).toBe(500);
  });

  it('maps fetch throw → kind=error', async () => {
    const f = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
    const p = new OllamaProvider({ fetchImpl: f });
    const out = await p.extractText!(sampleReq);
    expect(out.kind).toBe('error');
    if (out.kind === 'error') expect(out.message).toContain('ECONNREFUSED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/ollama-vision.test.ts`
Expected: FAIL "p.extractText is not a function".

- [ ] **Step 3: Add `extractText` method to OllamaProvider**

Modify `src/stamps/geometry-2d/ai/providers/ollama.ts`. Update import:

```ts
import type {
  AIProvider,
  ProviderOutput,
  ProviderRequest,
  ProviderTokenUsage,
  VisionRequest,
} from './types';
```

Add method to `OllamaProvider` class (after `call()`):

```ts
async extractText(req: VisionRequest): Promise<ProviderOutput> {
  const model = req.model ?? this.defaultModel;
  const body = {
    model,
    messages: [
      { role: 'system', content: req.systemPrompt },
      {
        role: 'user',
        content: req.userPrompt,
        images: req.images.map((i) => i.base64),
      },
    ],
    format: req.schema,
    stream: false,
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

  if (!resp.ok) {
    let detail = '';
    try { detail = await resp.text(); } catch { /* ignore */ }
    return {
      kind: 'error',
      message: `Ollama Vision HTTP ${resp.status}: ${detail || resp.statusText}`,
      status: resp.status,
    };
  }

  let json: OllamaChatResponse;
  try {
    json = (await resp.json()) as OllamaChatResponse;
  } catch (e) {
    return { kind: 'error', message: 'Ollama vision response không phải JSON: ' + ((e as { message?: string }).message ?? '?') };
  }

  const content = json.message?.content?.trim();
  if (!content) return { kind: 'error', message: 'Ollama vision trả content rỗng' };

  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch (e) {
    return { kind: 'error', message: 'Ollama vision content không parse JSON: ' + ((e as { message?: string }).message ?? '?') };
  }

  const usage: ProviderTokenUsage = {
    inputTokens: json.prompt_eval_count ?? 0,
    outputTokens: json.eval_count ?? 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
  };
  return { kind: 'json', data, usage };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/ollama-vision.test.ts`
Expected: PASS (6/6).

Verify existing: `npx jest src/stamps/geometry-2d/ai/providers/__tests__/ollama.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/providers/ollama.ts \
        src/stamps/geometry-2d/ai/providers/__tests__/ollama-vision.test.ts
git commit -m "feat(ai): OllamaProvider.extractText() — Gemma 3 multimodal images[] field"
```

---

### Task 9: Vision barrel + ai/index re-exports

**Files:**
- Create: `src/stamps/geometry-2d/ai/vision/index.ts`
- Modify: `src/stamps/geometry-2d/ai/index.ts`
- Test: `src/stamps/geometry-2d/ai/__tests__/public-api-vision.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-2d/ai/__tests__/public-api-vision.test.ts`:

```ts
describe('AI public API — vision exports', () => {
  it('exports handleExtractProblem + types', async () => {
    const mod = await import('../index');
    expect(typeof mod.handleExtractProblem).toBe('function');
  });

  it('exports VisionEnvelopeZ + visionEnvelopeJsonSchema', async () => {
    const mod = await import('../index');
    expect(mod.VisionEnvelopeZ).toBeDefined();
    expect(typeof mod.visionEnvelopeJsonSchema).toBe('function');
  });

  it('exports extractProblemFromImage from vision barrel', async () => {
    const mod = await import('../vision');
    expect(typeof mod.extractProblemFromImage).toBe('function');
    expect(typeof mod.pickVisionModel).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/public-api-vision.test.ts`
Expected: FAIL — `handleExtractProblem` not exported.

- [ ] **Step 3: Create vision/index.ts barrel**

Create `src/stamps/geometry-2d/ai/vision/index.ts`:

```ts
// src/stamps/geometry-2d/ai/vision/index.ts
export {
  extractProblemFromImage,
  pickVisionModel,
  type ExtractProblemOptions,
  type ExtractProblemSuccess,
  type ExtractProblemFailure,
  type ExtractProblemOutcome,
} from './extractProblem';
export { buildVisionSystemPrompt, VISION_USER_PROMPT } from './prompt';
export {
  VisionEnvelopeZ,
  visionEnvelopeJsonSchema,
  type VisionEnvelopeT,
} from './envelope';
export {
  fileToImagePart,
  inferMediaType,
  validateFile,
  MAX_EDGE_PX,
  MAX_RAW_BYTES,
  MAX_ENCODED_BYTES,
  type ValidationResult,
} from './preprocess';
```

Modify `src/stamps/geometry-2d/ai/index.ts` — append at the end:

```ts
// Vision / OCR API (image → text).
export {
  handleExtractProblem,
  type HandleExtractProblemOptions,
  type ExtractUiResult,
} from './handleExtractProblem';
export {
  extractProblemFromImage,
  pickVisionModel,
  buildVisionSystemPrompt,
  VISION_USER_PROMPT,
  VisionEnvelopeZ,
  visionEnvelopeJsonSchema,
  fileToImagePart,
  inferMediaType,
  validateFile,
  MAX_EDGE_PX,
  MAX_RAW_BYTES,
  MAX_ENCODED_BYTES,
  type ExtractProblemOptions,
  type ExtractProblemSuccess,
  type ExtractProblemFailure,
  type ExtractProblemOutcome,
  type VisionEnvelopeT,
  type ValidationResult,
} from './vision';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/ai/__tests__/public-api-vision.test.ts`
Expected: PASS (3/3).

Run full ai suite: `npx jest src/stamps/geometry-2d/ai/`
Expected: ALL PASS.

Run typecheck: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/vision/index.ts \
        src/stamps/geometry-2d/ai/index.ts \
        src/stamps/geometry-2d/ai/__tests__/public-api-vision.test.ts
git commit -m "feat(ai): export vision API qua ai/index.ts + vision/index.ts barrel"
```

---

## Phase 4 — UI integration

### Task 10: `ImageDropZone` component

**Files:**
- Create: `src/stamps/geometry-2d/editor/ImageDropZone.tsx`
- Test: `src/stamps/geometry-2d/editor/__tests__/ImageDropZone.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-2d/editor/__tests__/ImageDropZone.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageDropZone } from '../ImageDropZone';

// Mock fileToImagePart since createImageBitmap isn't available in jsdom
jest.mock('../../ai/vision/preprocess', () => ({
  ...jest.requireActual('../../ai/vision/preprocess'),
  fileToImagePart: jest.fn(async (file: File) => ({
    mediaType: file.type,
    base64: 'MOCKBASE64',
  })),
}));

describe('ImageDropZone', () => {
  it('renders idle state với placeholder text', () => {
    render(<ImageDropZone value={null} onChange={jest.fn()} />);
    expect(screen.getByText(/kéo thả|chọn ảnh|paste/i)).toBeInTheDocument();
  });

  it('renders image-ready state với thumbnail + remove button', () => {
    render(
      <ImageDropZone
        value={{ mediaType: 'image/png', base64: 'AAA' }}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByRole('img', { name: /ảnh đề bài/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /xoá|remove/i })).toBeInTheDocument();
  });

  it('calls onChange(null) khi click remove', () => {
    const onChange = jest.fn();
    render(
      <ImageDropZone
        value={{ mediaType: 'image/png', base64: 'AAA' }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /xoá|remove/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('calls onChange với ImagePart khi file input changes', async () => {
    const onChange = jest.fn();
    render(<ImageDropZone value={null} onChange={onChange} />);
    const file = new File([new Uint8Array([0x89, 0x50])], 'a.png', { type: 'image/png' });
    const input = screen.getByLabelText(/chọn ảnh/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    // wait microtask for fileToImagePart promise
    await new Promise((r) => setTimeout(r, 0));
    expect(onChange).toHaveBeenCalledWith({ mediaType: 'image/png', base64: 'MOCKBASE64' });
  });

  it('rejects unsupported file type via toast/onError', async () => {
    const onError = jest.fn();
    render(<ImageDropZone value={null} onChange={jest.fn()} onError={onError} />);
    const heic = new File([new Uint8Array()], 'a.heic', { type: 'image/heic' });
    const input = screen.getByLabelText(/chọn ảnh/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [heic] } });
    await new Promise((r) => setTimeout(r, 0));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'invalid-format' }));
  });

  it('disabled state: input + remove disabled', () => {
    render(
      <ImageDropZone
        value={{ mediaType: 'image/png', base64: 'AAA' }}
        onChange={jest.fn()}
        disabled
      />,
    );
    expect(screen.getByRole('button', { name: /xoá|remove/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/editor/__tests__/ImageDropZone.test.tsx`
Expected: FAIL "Cannot find module '../ImageDropZone'".

- [ ] **Step 3: Implement ImageDropZone.tsx**

Create `src/stamps/geometry-2d/editor/ImageDropZone.tsx`:

```tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  fileToImagePart,
  validateFile,
} from '../ai/vision/preprocess';
import type { ImagePart } from '../ai/providers/types';

export interface ImageDropZoneError {
  code: 'invalid-format' | 'too-large' | 'decode-fail';
  message: string;
}

export interface ImageDropZoneProps {
  value: ImagePart | null;
  onChange: (image: ImagePart | null) => void;
  onError?: (err: ImageDropZoneError) => void;
  disabled?: boolean;
}

export function ImageDropZone({ value, onChange, onError, disabled }: ImageDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputId = 'image-drop-zone-input';

  // Build preview data URL from base64.
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(`data:${value.mediaType};base64,${value.base64}`);
  }, [value]);

  const handleFile = useCallback(
    async (file: File) => {
      if (disabled) return;
      const v = validateFile(file);
      if (!v.ok) {
        onError?.({ code: v.code, message: v.message });
        return;
      }
      try {
        const part = await fileToImagePart(file);
        onChange(part);
      } catch (e) {
        onError?.({
          code: 'decode-fail',
          message: e instanceof Error ? e.message : 'Không decode được ảnh',
        });
      }
    },
    [disabled, onChange, onError],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = Array.from(e.clipboardData.items);
      const imgItem = items.find((it) => it.kind === 'file' && it.type.startsWith('image/'));
      if (!imgItem) return;
      const file = imgItem.getAsFile();
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onRemove = useCallback(() => onChange(null), [onChange]);

  if (value) {
    return (
      <div className="flex items-start gap-2 rounded border border-slate-300 bg-slate-50 p-2">
        <img
          src={previewUrl ?? ''}
          alt="Ảnh đề bài"
          className="h-20 w-20 rounded border border-slate-200 object-cover"
        />
        <div className="flex-1 text-xs text-slate-600">
          <div>Ảnh đề bài đã chọn</div>
          <div className="text-[10px] text-slate-500">{value.mediaType}</div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Xoá ảnh"
          className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-300 disabled:opacity-50"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Khu vực kéo thả ảnh"
      tabIndex={0}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      className={
        'flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed px-3 py-4 text-xs ' +
        (isDragOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50') +
        (disabled ? ' opacity-50' : '')
      }
    >
      <p className="text-slate-600">Kéo thả ảnh đề bài vào đây, hoặc paste (Ctrl+V)</p>
      <label
        htmlFor={inputId}
        className="cursor-pointer rounded bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
      >
        Chọn ảnh
      </label>
      <input
        id={inputId}
        ref={undefined}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={onFileChange}
        disabled={disabled}
        aria-label="Chọn ảnh đề bài"
      />
      <p className="text-[10px] text-slate-500">PNG, JPEG, WEBP (tối đa 10 MB)</p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/editor/__tests__/ImageDropZone.test.tsx`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/editor/ImageDropZone.tsx \
        src/stamps/geometry-2d/editor/__tests__/ImageDropZone.test.tsx
git commit -m "feat(ui): ImageDropZone — file picker + paste + drag-drop với preview"
```

---

### Task 11: Integrate `ImageDropZone` vào `AiFigurePrompt` + OCR action

**Files:**
- Modify: `src/stamps/geometry-2d/editor/AiFigurePrompt.tsx`
- Test: `src/stamps/geometry-2d/editor/__tests__/AiFigurePrompt.vision.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/stamps/geometry-2d/editor/__tests__/AiFigurePrompt.vision.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiFigurePrompt } from '../AiFigurePrompt';
import type { GenerateGeometryFigure } from '../../shared/types';

// Mock handleExtractProblem
const extractMock = jest.fn();
jest.mock('../../ai/handleExtractProblem', () => ({
  handleExtractProblem: (...args: unknown[]) => extractMock(...args),
}));

// Mock useAiFigure hook to expose minimal state
jest.mock('../useAiFigure', () => ({
  useAiFigure: () => ({
    prompt: '',
    setPrompt: jest.fn(),
    isLoading: false,
    error: null,
    submit: jest.fn(),
    cancel: jest.fn(),
    tokens: null,
    mode: 'build',
    setMode: jest.fn(),
    entityCount: 0,
    hasUnsupported: false,
  }),
}));

const noopGenerator: GenerateGeometryFigure = jest.fn();

describe('AiFigurePrompt — vision/image upload', () => {
  beforeEach(() => extractMock.mockReset());

  it('shows toggle button "Đọc đề từ ảnh" when no image', () => {
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    expect(screen.getByRole('button', { name: /đọc đề từ ảnh|ảnh đề/i })).toBeInTheDocument();
  });

  it('shows ImageDropZone after clicking toggle', () => {
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /đọc đề từ ảnh|ảnh đề/i }));
    expect(screen.getByRole('region', { name: /khu vực kéo thả/i })).toBeInTheDocument();
  });

  it('OCR success → fills textarea với extracted text', async () => {
    extractMock.mockResolvedValueOnce({
      kind: 'success',
      text: 'Cho tam giác ABC vuông tại A',
      usage: { inputTokens: 50, outputTokens: 10 },
    });

    // Stub setPrompt to capture state change.
    const setPromptSpy = jest.fn();
    jest.requireMock('../useAiFigure').useAiFigure = () => ({
      prompt: '',
      setPrompt: setPromptSpy,
      isLoading: false,
      error: null,
      submit: jest.fn(),
      cancel: jest.fn(),
      tokens: null,
      mode: 'build',
      setMode: jest.fn(),
      entityCount: 0,
      hasUnsupported: false,
    });

    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /đọc đề từ ảnh|ảnh đề/i }));

    // Inject image via file input.
    const file = new File([new Uint8Array([0x89, 0x50])], 'a.png', { type: 'image/png' });
    const input = screen.getByLabelText(/chọn ảnh/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => screen.getByRole('button', { name: /đọc đề bài|^đọc đề$/i }));

    // Trigger OCR.
    fireEvent.click(screen.getByRole('button', { name: /đọc đề bài|^đọc đề$/i }));

    await waitFor(() => expect(setPromptSpy).toHaveBeenCalledWith('Cho tam giác ABC vuông tại A'));
  });

  it('OCR refused → shows toast/error message', async () => {
    extractMock.mockResolvedValueOnce({
      kind: 'refused',
      reason: 'not-math',
      message: 'Ảnh không phải đề toán',
    });
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /đọc đề từ ảnh|ảnh đề/i }));
    const file = new File([new Uint8Array([0x89])], 'a.png', { type: 'image/png' });
    const input = screen.getByLabelText(/chọn ảnh/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => screen.getByRole('button', { name: /đọc đề bài|^đọc đề$/i }));
    fireEvent.click(screen.getByRole('button', { name: /đọc đề bài|^đọc đề$/i }));

    await waitFor(() =>
      expect(screen.getByText(/không phải đề toán/i)).toBeInTheDocument(),
    );
  });

  it('OCR low-confidence → shows warning banner', async () => {
    extractMock.mockResolvedValueOnce({
      kind: 'low-confidence',
      text: 'short',
      warning: 'OCR có thể không chính xác, kiểm tra trước khi vẽ.',
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /đọc đề từ ảnh|ảnh đề/i }));
    const file = new File([new Uint8Array([0x89])], 'a.png', { type: 'image/png' });
    const input = screen.getByLabelText(/chọn ảnh/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => screen.getByRole('button', { name: /đọc đề bài|^đọc đề$/i }));
    fireEvent.click(screen.getByRole('button', { name: /đọc đề bài|^đọc đề$/i }));

    await waitFor(() =>
      expect(screen.getByText(/không chính xác|kiểm tra/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/stamps/geometry-2d/editor/__tests__/AiFigurePrompt.vision.test.tsx`
Expected: FAIL — toggle button not rendered.

- [ ] **Step 3: Modify AiFigurePrompt.tsx**

Add imports at top of `src/stamps/geometry-2d/editor/AiFigurePrompt.tsx`:

```tsx
import { ImageDropZone, type ImageDropZoneError } from './ImageDropZone';
import { handleExtractProblem } from '../ai/handleExtractProblem';
import type { ImagePart } from '../ai/providers/types';
```

Inside the `AiFigurePrompt` function body, after existing `useAiFigure` destructuring and `useEffect` for elapsed timer, add state + handlers:

```tsx
// Vision/OCR state.
const [showImageZone, setShowImageZone] = useState(false);
const [image, setImage] = useState<ImagePart | null>(null);
const [ocrLoading, setOcrLoading] = useState(false);
const [ocrError, setOcrError] = useState<string | null>(null);
const [ocrWarning, setOcrWarning] = useState<string | null>(null);

const handleImageError = useCallback((err: ImageDropZoneError) => {
  setOcrError(err.message);
}, []);

const handleRunOcr = useCallback(async () => {
  if (!image) return;
  setOcrLoading(true);
  setOcrError(null);
  setOcrWarning(null);
  try {
    const r = await handleExtractProblem(image);
    if (r.kind === 'success') {
      setPrompt(r.text);
    } else if (r.kind === 'low-confidence') {
      setPrompt(r.text);
      setOcrWarning(r.warning);
    } else if (r.kind === 'refused') {
      setOcrError(r.message);
    } else {
      setOcrError(r.message);
    }
  } finally {
    setOcrLoading(false);
  }
}, [image, setPrompt]);

const toggleImageZone = useCallback(() => {
  setShowImageZone((s) => !s);
  if (showImageZone) {
    // closing: keep image but hide
  }
}, [showImageZone]);
```

In the JSX render, **before** the existing `<div className="flex items-start gap-2">` (which wraps textarea + submit button), insert:

```tsx
<div className="mb-2 flex flex-col gap-2">
  <button
    type="button"
    onClick={toggleImageZone}
    className="self-start rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
  >
    📷 {showImageZone ? 'Đóng ảnh' : 'Đọc đề từ ảnh'}
  </button>

  {showImageZone && (
    <>
      <ImageDropZone
        value={image}
        onChange={setImage}
        onError={handleImageError}
        disabled={ocrLoading || isLoading}
      />
      {image && (
        <button
          type="button"
          onClick={handleRunOcr}
          disabled={ocrLoading}
          className="self-start rounded bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {ocrLoading ? 'Đang đọc…' : 'Đọc đề bài'}
        </button>
      )}
      {ocrError && (
        <p role="alert" className="text-xs text-red-600">
          {ocrError}
        </p>
      )}
      {ocrWarning && (
        <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
          {ocrWarning}
        </p>
      )}
    </>
  )}
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/stamps/geometry-2d/editor/__tests__/AiFigurePrompt.vision.test.tsx`
Expected: PASS (5/5).

Run full editor suite: `npx jest src/stamps/geometry-2d/editor/`
Expected: ALL PASS (existing AiFigurePrompt test cũ vẫn xanh — chỉ thêm UI, không đổi prop).

Run typecheck: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/editor/AiFigurePrompt.tsx \
        src/stamps/geometry-2d/editor/__tests__/AiFigurePrompt.vision.test.tsx
git commit -m "feat(ui): AiFigurePrompt — toggle image upload + OCR action + state machine"
```

---

## Phase 5 — Public API + docs + release

### Task 12: Re-export public types từ `src/index.ts`

**Files:**
- Modify: `src/index.ts`
- Test: `src/__tests__/public-api-vision.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/public-api-vision.test.ts`:

```ts
describe('@xom11/whiteboard public API — vision', () => {
  it('exports handleExtractProblem từ root', async () => {
    const mod = await import('../index');
    expect(typeof (mod as { handleExtractProblem?: unknown }).handleExtractProblem).toBe('function');
  });

  it('exports ImagePart + ExtractUiResult types', () => {
    // Type-level test: ensure types compile when imported.
    type _Test = {
      img: import('../index').ImagePart;
      res: import('../index').ExtractUiResult;
    };
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/public-api-vision.test.ts`
Expected: FAIL — `handleExtractProblem` not exported.

- [ ] **Step 3: Modify src/index.ts**

Append to `src/index.ts`:

```ts
// Vision / OCR public API.
export {
  handleExtractProblem,
  type HandleExtractProblemOptions,
  type ExtractUiResult,
} from './stamps/geometry-2d/ai/handleExtractProblem';
export {
  type ImagePart,
  type VisionRequest,
} from './stamps/geometry-2d/ai/providers/types';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/public-api-vision.test.ts`
Expected: PASS (2/2).

Run: `npm run typecheck` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts src/__tests__/public-api-vision.test.ts
git commit -m "feat: export vision API từ @xom11/whiteboard public surface"
```

---

### Task 13: Eval script + fixtures structure

**Files:**
- Create: `scripts/eval-vision.ts`
- Create: `scripts/vision-fixtures/README.md`
- Create: `scripts/vision-fixtures/.gitkeep` (placeholder cho fixture dir)

- [ ] **Step 1: Write the failing test**

> **Note:** Eval script không có unit test — verify bằng dry-run với mock. Skip TDD bước test, đi thẳng impl + smoke run.

- [ ] **Step 2: Create eval script**

Create `scripts/eval-vision.ts`:

```ts
#!/usr/bin/env tsx
// scripts/eval-vision.ts
//
// Eval OCR vision pipeline trên 10 fixture ảnh.
// Usage:
//   npx tsx scripts/eval-vision.ts gemma3:4b
//   npx tsx scripts/eval-vision.ts gemma3:12b
//   npx tsx scripts/eval-vision.ts claude-opus-4-7
//
// Output: F1 character-level + recall ký hiệu toán + refusal accuracy.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { handleExtractProblem } from '../src/stamps/geometry-2d/ai/handleExtractProblem';
import type { ImagePart } from '../src/stamps/geometry-2d/ai/providers/types';

interface Fixture {
  imagePath: string;
  expected: { text: string; expectRefuse?: boolean };
}

const MATH_SYMBOLS = ['Δ', '⊥', '∥', '°', '⊙'];

async function loadFixtures(dir: string): Promise<Fixture[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: Fixture[] = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!/\.(png|jpe?g|webp)$/i.test(e.name)) continue;
    const base = e.name.replace(/\.[^.]+$/, '');
    const expectedPath = path.join(dir, `${base}.expected.json`);
    try {
      const expected = JSON.parse(await fs.readFile(expectedPath, 'utf8'));
      out.push({ imagePath: path.join(dir, e.name), expected });
    } catch {
      console.warn(`⚠️  Missing ${expectedPath} — skipping`);
    }
  }
  return out;
}

async function imageToPart(imagePath: string): Promise<ImagePart> {
  const data = await fs.readFile(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mediaType =
    ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return { mediaType, base64: data.toString('base64') };
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').normalize('NFC').toLowerCase();
}

function charF1(a: string, b: string): number {
  const A = new Set(normalize(a).split(''));
  const B = new Set(normalize(b).split(''));
  const inter = [...A].filter((c) => B.has(c)).length;
  if (inter === 0) return 0;
  const precision = inter / B.size;
  const recall = inter / A.size;
  return (2 * precision * recall) / (precision + recall);
}

function symbolRecall(actual: string, expected: string): number {
  const expectedSyms = MATH_SYMBOLS.filter((s) => expected.includes(s));
  if (expectedSyms.length === 0) return 1;
  const hit = expectedSyms.filter((s) => actual.includes(s)).length;
  return hit / expectedSyms.length;
}

async function main() {
  const model = process.argv[2];
  if (!model) {
    console.error('Usage: npx tsx scripts/eval-vision.ts <model>');
    process.exit(1);
  }
  const fixtureDir = path.join(process.cwd(), 'scripts', 'vision-fixtures');
  const fixtures = await loadFixtures(fixtureDir);
  if (fixtures.length === 0) {
    console.error(`Không tìm thấy fixture trong ${fixtureDir}.`);
    process.exit(1);
  }

  console.log(`📷 Eval vision OCR — model=${model}, n=${fixtures.length}`);
  const results: { name: string; f1: number; symRecall: number; refused: boolean; expectRefuse: boolean }[] = [];

  for (const f of fixtures) {
    const img = await imageToPart(f.imagePath);
    const r = await handleExtractProblem(img, { visionModel: model });
    const name = path.basename(f.imagePath);
    if (f.expected.expectRefuse) {
      const refused = r.kind === 'refused';
      results.push({ name, f1: 0, symRecall: 0, refused, expectRefuse: true });
      console.log(`  ${refused ? '✅' : '❌'} ${name} — expected refuse, got ${r.kind}`);
      continue;
    }
    if (r.kind !== 'success' && r.kind !== 'low-confidence') {
      results.push({ name, f1: 0, symRecall: 0, refused: false, expectRefuse: false });
      console.log(`  ❌ ${name} — ${r.kind}: ${'message' in r ? r.message : 'no text'}`);
      continue;
    }
    const f1 = charF1(f.expected.text, r.text);
    const sym = symbolRecall(r.text, f.expected.text);
    results.push({ name, f1, symRecall: sym, refused: false, expectRefuse: false });
    console.log(`  ${f1 >= 0.8 ? '✅' : '⚠️ '} ${name} — F1=${f1.toFixed(3)} sym=${sym.toFixed(2)}`);
  }

  const extractResults = results.filter((r) => !r.expectRefuse);
  const refuseResults = results.filter((r) => r.expectRefuse);
  const avgF1 = extractResults.reduce((s, r) => s + r.f1, 0) / Math.max(extractResults.length, 1);
  const avgSym = extractResults.reduce((s, r) => s + r.symRecall, 0) / Math.max(extractResults.length, 1);
  const refusalAcc = refuseResults.length === 0
    ? 1
    : refuseResults.filter((r) => r.refused).length / refuseResults.length;

  console.log(`\n📊 Summary model=${model}`);
  console.log(`   F1 trung bình:        ${avgF1.toFixed(3)}`);
  console.log(`   Symbol recall:        ${avgSym.toFixed(3)}`);
  console.log(`   Refusal accuracy:     ${refusalAcc.toFixed(3)} (${refuseResults.length} control)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Create `scripts/vision-fixtures/README.md`:

```markdown
# Vision OCR Fixtures

Mỗi ảnh đề bài cần file `<basename>.expected.json` cùng folder:

```json
{
  "text": "Cho tam giác ABC vuông tại A. Kẻ đường cao AH ⊥ BC.",
  "expectRefuse": false
}
```

Đối với fixture control (ảnh KHÔNG phải đề toán, dùng để test refusal):

```json
{
  "text": "",
  "expectRefuse": true
}
```

Recommended fixtures v1 (10 đề + 2 control):
- `01-tam-giac-vuong-print.png` — đề in scan
- `02-duong-tron-noi-tiep-print.png`
- `03-hinh-thoi-print.jpg`
- `04-tiep-tuyen-screenshot.png`
- ...
- `99-control-truyen-kieu.png` — `expectRefuse: true`
- `99-control-meme.png` — `expectRefuse: true`
```

Create empty `scripts/vision-fixtures/.gitkeep`.

- [ ] **Step 3: Smoke run script (mock mode — không cần ảnh thật)**

Verify script syntax:

```bash
npx tsx scripts/eval-vision.ts gemma3:4b 2>&1 | head -3
```

Expected output:
```
Không tìm thấy fixture trong .../scripts/vision-fixtures.
```

Đó là expected — chưa add ảnh thật. Confirms script chạy + lỗi gracefully khi không có fixture.

- [ ] **Step 4: Verify**

Run typecheck: `npm run typecheck` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/eval-vision.ts scripts/vision-fixtures/README.md scripts/vision-fixtures/.gitkeep
git commit -m "feat(eval): vision OCR eval script + fixture structure"
```

---

### Task 14: CLAUDE.md gotchas + bump version 0.26.0

**Files:**
- Modify: `CLAUDE.md`
- Modify: `package.json` (qua `npm version minor`)

- [ ] **Step 1: Update CLAUDE.md "Gotchas" section**

Open `CLAUDE.md` và locate `## Gotchas` section. Append entries:

```markdown
- **Vision OCR (0.26.0+)**: `handleExtractProblem(image)` đọc đề từ ảnh qua AI multimodal. Browser cần `createImageBitmap` + `<canvas>.toBlob` (jsdom test environment không support — preprocess là smoke test only).
- **Vision model**: `WHITEBOARD_AI_VISION_MODEL` env override; mặc định cùng model với DSL gen (Ollama `gemma3:4b` multimodal native, Anthropic `claude-opus-4-7` vision native).
- **Image cap**: client downscale max edge 2048px + cap encoded 4MB (Anthropic limit 5MB, buffer 1MB). HEIC iPhone không decode được browser → reject với hint convert JPEG.
- **Anthropic vision cost**: ~70đ/ảnh (1500 input tokens) — không rate-limit v1, doc qua env nếu cần cap.
```

- [ ] **Step 2: Bump version**

Run:

```bash
npm version minor   # 0.25.1 → 0.26.0
```

This tự tạo commit + tag.

- [ ] **Step 3: Verify full test + build**

```bash
npm test
npm run typecheck
npm run build
```

All expected: PASS / 0 errors / build success.

- [ ] **Step 4: Smoke test dist**

```bash
ls dist/index.js dist/index.mjs
grep -l "handleExtractProblem" dist/*.js dist/*.mjs
```

Expected: files exist, `handleExtractProblem` xuất hiện trong cả ESM và CJS bundles.

- [ ] **Step 5: Final commit (CLAUDE.md only — version bump đã commit ở step 2)**

```bash
git add CLAUDE.md
git commit -m "docs: vision OCR gotchas — preprocess limits + cost notes"
git push --follow-tags
```

> Push tag để release 0.26.0. `npm publish --access public` sau khi user verify trên consumer.

---

## Spec Coverage Checklist

Skim spec `docs/superpowers/specs/2026-06-02-image-to-figure-design.md`:

- [x] Architecture flow (image → OCR → text → DSL): Tasks 5, 6, 11
- [x] Module layout (vision/, ImageDropZone): Tasks 2-6, 10
- [x] Provider abstraction extension (optional extractText): Task 1
- [x] Anthropic vision impl: Task 7
- [x] Ollama vision impl: Task 8
- [x] Vision orchestrator: Task 5
- [x] Façade handleExtractProblem: Task 6
- [x] ImageDropZone (file/paste/drop): Task 10
- [x] State machine AiFigurePrompt: Task 11
- [x] Preprocess (validate, downscale, base64): Task 4
- [x] Error handling 3 layers: Tasks 4, 5, 6, 10, 11
- [x] OCR prompt strategy: Task 3
- [x] Eval script + fixtures: Task 13
- [x] Env config `WHITEBOARD_AI_VISION_MODEL`: Task 5 (pickVisionModel)
- [x] Backwards compatibility (optional method): Task 1
- [x] CLAUDE.md gotchas: Task 14
- [x] Public API: Task 12
- [x] Release 0.26.0: Task 14

## Type Consistency Check

- `ImagePart`: defined Task 1 → used Tasks 4, 5, 6, 7, 8, 10, 11, 12 ✓
- `VisionRequest`: defined Task 1 → used Tasks 5, 7, 8 ✓
- `ExtractUiResult`: defined Task 6 → used Tasks 11, 12 ✓
- `ExtractProblemOutcome`: defined Task 5 → used Task 6 ✓
- `VisionEnvelopeZ`: defined Task 2 → used Task 5 ✓
- `AIProvider.extractText`: defined Task 1 → implemented Tasks 7, 8 → checked Task 5 ✓
- `pickVisionModel`: defined Task 5 → used internally Task 5 ✓
- `handleExtractProblem`: defined Task 6 → exported Tasks 9, 12 → consumed Task 11 ✓
- `fileToImagePart` / `validateFile` / `inferMediaType`: defined Task 4 → used Task 10 ✓
