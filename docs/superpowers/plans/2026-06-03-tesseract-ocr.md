# Tesseract.js OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay default OCR engine từ Vision LLM (Ollama/Anthropic) sang Tesseract.js client-side để tránh phụ thuộc network/Ollama setup + chạy 100% browser offline cho use case đề toán đánh máy in.

**Architecture:** Tesseract KHÔNG fit `AIProvider` interface (không emit JSON envelope, không có system/user prompt, không DSL gen). Thay vì gò ép, thêm một path song song trong `extractProblemFromImage` qua option `engine: 'tesseract' | 'llm'`, default `'tesseract'`. LLM path giữ nguyên cho fallback / handwriting / math symbols. Tesseract.js load lazy qua dynamic import — bundle size không thay đổi cho user không gọi OCR.

**Tech Stack:**
- `tesseract.js@^7.0.0` (peerless dep, ~30KB core + lazy CDN worker + 13MB vie traineddata)
- Default language `'vie+eng'` (đề toán VN trộn ký hiệu English)
- Confidence mapping: Tesseract 0–100 → 'high' (≥70) | 'low' (<70)
- Tests dùng `jest.mock('tesseract.js')` (Web Worker không chạy jsdom)

**Non-goals (v1):**
- UI toggle giữa Tesseract / LLM (defer, user override qua prop)
- Worker caching across calls (defer, terminate sau mỗi call)
- Auto-fallback Tesseract → LLM khi confidence thấp (defer, user thấy warning + tự edit)
- Custom `corePath`/`workerPath`/`langPath` override (defer, dùng CDN default)
- Streaming progress callback (defer)

---

## File Structure

**Create:**
- `src/stamps/geometry-2d/ai/vision/tesseract.ts` — `runTesseractOcr()` lazy-import wrapper
- `src/stamps/geometry-2d/ai/vision/__tests__/tesseract.test.ts` — unit tests cho wrapper

**Modify:**
- `src/stamps/geometry-2d/ai/vision/extractProblem.ts` — thêm `engine` option, route `'tesseract'` qua `runTesseractOcr()`, mặc định `'tesseract'`
- `src/stamps/geometry-2d/ai/vision/__tests__/extractProblem.test.ts` — thêm test cho `engine: 'tesseract'` + giữ test LLM path
- `src/stamps/geometry-2d/ai/vision/index.ts` — export `runTesseractOcr` + types
- `src/stamps/geometry-2d/ai/index.ts` — re-export tesseract symbols (nếu cần)
- `package.json` — thêm `tesseract.js` vào `dependencies` (KHÔNG peer, vì lazy-load tích hợp)
- `CLAUDE.md` — update Vision OCR gotcha section

---

## Task 1: Add tesseract.js dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install package**

```bash
npm install tesseract.js@^7.0.0
```

Expected: package.json dependencies có `"tesseract.js": "^7.0.0"`. package-lock.json updated.

- [ ] **Step 2: Verify install + types resolve**

```bash
npm ls tesseract.js
node -e "const t = require('tesseract.js'); console.log(typeof t.createWorker);"
```

Expected: prints `function`.

- [ ] **Step 3: Verify TypeScript types**

```bash
npm run typecheck
```

Expected: PASS (no new errors — tesseract.js v7 ships types).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add tesseract.js ^7.0.0 cho client-side OCR"
```

---

## Task 2: Implement runTesseractOcr() — failing test first

**Files:**
- Create: `src/stamps/geometry-2d/ai/vision/__tests__/tesseract.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/stamps/geometry-2d/ai/vision/__tests__/tesseract.test.ts
import { runTesseractOcr } from '../tesseract';
import type { ImagePart } from '../../providers/types';

// Mock tesseract.js trước import test
const mockRecognize = jest.fn();
const mockTerminate = jest.fn();
const mockCreateWorker = jest.fn();

jest.mock('tesseract.js', () => ({
  createWorker: (...args: unknown[]) => mockCreateWorker(...args),
}));

const sampleImage: ImagePart = { mediaType: 'image/png', base64: 'iVBORw0AA==' };

function setupWorker(result: { text: string; confidence: number }) {
  mockRecognize.mockReset();
  mockTerminate.mockReset();
  mockCreateWorker.mockReset();
  mockRecognize.mockResolvedValue({ data: result });
  mockCreateWorker.mockResolvedValue({
    recognize: mockRecognize,
    terminate: mockTerminate,
  });
}

describe('runTesseractOcr', () => {
  it('success: returns {text, confidence} từ Tesseract worker', async () => {
    setupWorker({ text: 'Cho tam giác ABC vuông tại A', confidence: 87.5 });
    const r = await runTesseractOcr(sampleImage);
    expect(r.text).toBe('Cho tam giác ABC vuông tại A');
    expect(r.confidence).toBe(87.5);
  });

  it('passes data URL (mediaType + base64) tới worker.recognize', async () => {
    setupWorker({ text: 'x', confidence: 50 });
    await runTesseractOcr(sampleImage);
    expect(mockRecognize).toHaveBeenCalledWith(
      'data:image/png;base64,iVBORw0AA==',
    );
  });

  it('default language = vie+eng', async () => {
    setupWorker({ text: 'x', confidence: 50 });
    await runTesseractOcr(sampleImage);
    expect(mockCreateWorker).toHaveBeenCalledWith('vie+eng');
  });

  it('opts.lang overrides default', async () => {
    setupWorker({ text: 'x', confidence: 50 });
    await runTesseractOcr(sampleImage, { lang: 'eng' });
    expect(mockCreateWorker).toHaveBeenCalledWith('eng');
  });

  it('always terminates worker (cleanup khi success)', async () => {
    setupWorker({ text: 'x', confidence: 50 });
    await runTesseractOcr(sampleImage);
    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });

  it('always terminates worker (cleanup khi recognize throws)', async () => {
    setupWorker({ text: 'x', confidence: 50 });
    mockRecognize.mockRejectedValueOnce(new Error('decode fail'));
    await expect(runTesseractOcr(sampleImage)).rejects.toThrow('decode fail');
    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });

  it('signal.aborted=true trước call → throws AbortError, không createWorker', async () => {
    setupWorker({ text: 'x', confidence: 50 });
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      runTesseractOcr(sampleImage, { signal: ctrl.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(mockCreateWorker).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/stamps/geometry-2d/ai/vision/__tests__/tesseract.test.ts -v
```

Expected: FAIL với `Cannot find module '../tesseract'`.

- [ ] **Step 3: Implement runTesseractOcr**

Create `src/stamps/geometry-2d/ai/vision/tesseract.ts`:

```ts
// src/stamps/geometry-2d/ai/vision/tesseract.ts
//
// Tesseract.js wrapper cho client-side OCR đề toán. Default vie+eng, terminate
// worker sau mỗi call (không cache v1). Lazy import giữ bundle slim.

import type { ImagePart } from '../providers/types';

export interface TesseractOcrOptions {
  /** Tesseract language code. Default 'vie+eng' cho đề toán VN. */
  lang?: string;
  signal?: AbortSignal;
}

export interface TesseractOcrResult {
  text: string;
  /** Confidence 0–100 (Tesseract scale). */
  confidence: number;
}

const DEFAULT_LANG = 'vie+eng';

export async function runTesseractOcr(
  image: ImagePart,
  opts: TesseractOcrOptions = {},
): Promise<TesseractOcrResult> {
  if (opts.signal?.aborted) {
    const err = new Error('Tesseract OCR aborted');
    err.name = 'AbortError';
    throw err;
  }

  const { createWorker } = await import('tesseract.js');
  const lang = opts.lang ?? DEFAULT_LANG;
  const worker = await createWorker(lang);

  try {
    const dataUrl = `data:${image.mediaType};base64,${image.base64}`;
    const { data } = await worker.recognize(dataUrl);
    return { text: data.text, confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/stamps/geometry-2d/ai/vision/__tests__/tesseract.test.ts -v
```

Expected: PASS, 7/7 tests xanh.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/vision/tesseract.ts \
        src/stamps/geometry-2d/ai/vision/__tests__/tesseract.test.ts
git commit -m "feat(ai): runTesseractOcr — client-side OCR wrapper với vie+eng default"
```

---

## Task 3: Add `engine` option vào extractProblemFromImage — failing test first

**Files:**
- Modify: `src/stamps/geometry-2d/ai/vision/__tests__/extractProblem.test.ts`
- Modify: `src/stamps/geometry-2d/ai/vision/extractProblem.ts`

- [ ] **Step 1: Add failing tests cho engine='tesseract'**

Append vào `src/stamps/geometry-2d/ai/vision/__tests__/extractProblem.test.ts` (cuối file, trong cùng describe block hoặc describe mới):

```ts
// Mock tesseract module trước test khác
const mockTesseractRecognize = jest.fn();
const mockTesseractTerminate = jest.fn();
const mockTesseractCreateWorker = jest.fn();

jest.mock('tesseract.js', () => ({
  createWorker: (...args: unknown[]) => mockTesseractCreateWorker(...args),
}));

function setupTesseractWorker(result: { text: string; confidence: number }) {
  mockTesseractRecognize.mockReset();
  mockTesseractTerminate.mockReset();
  mockTesseractCreateWorker.mockReset();
  mockTesseractRecognize.mockResolvedValue({ data: result });
  mockTesseractCreateWorker.mockResolvedValue({
    recognize: mockTesseractRecognize,
    terminate: mockTesseractTerminate,
  });
}

describe('extractProblemFromImage — engine="tesseract"', () => {
  it('default engine = tesseract (không truyền engine vẫn dùng Tesseract)', async () => {
    setupTesseractWorker({ text: 'Cho tam giác ABC vuông tại A', confidence: 85 });
    const r = await extractProblemFromImage(sampleImage);
    expect(mockTesseractCreateWorker).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).toBe('Cho tam giác ABC vuông tại A');
      expect(r.confidence).toBe('high');
    }
  });

  it('confidence < 70 → confidence="low"', async () => {
    setupTesseractWorker({ text: 'Cho tam giác ABC vuông tại A', confidence: 55 });
    const r = await extractProblemFromImage(sampleImage, { engine: 'tesseract' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.confidence).toBe('low');
  });

  it('confidence ≥ 70 nhưng text quá ngắn (< 10 chars) → low', async () => {
    setupTesseractWorker({ text: 'ngắn', confidence: 90 });
    const r = await extractProblemFromImage(sampleImage, { engine: 'tesseract' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.confidence).toBe('low');
  });

  it('post-process: trim + collapse whitespace', async () => {
    setupTesseractWorker({
      text: '  Cho   tam   giác   ABC  \n\n  vuông tại A  ',
      confidence: 90,
    });
    const r = await extractProblemFromImage(sampleImage, { engine: 'tesseract' });
    if (r.ok) expect(r.text).toBe('Cho tam giác ABC vuông tại A');
  });

  it('empty text từ Tesseract → reason="empty"', async () => {
    setupTesseractWorker({ text: '   ', confidence: 0 });
    const r = await extractProblemFromImage(sampleImage, { engine: 'tesseract' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('empty');
  });

  it('Tesseract throws → reason="unreadable" với message', async () => {
    setupTesseractWorker({ text: 'x', confidence: 50 });
    mockTesseractRecognize.mockRejectedValueOnce(new Error('Worker crashed'));
    const r = await extractProblemFromImage(sampleImage, { engine: 'tesseract' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('unreadable');
      expect(r.message).toContain('Worker crashed');
    }
  });

  it('usage = {inputTokens:0, outputTokens:0} (Tesseract không có token concept)', async () => {
    setupTesseractWorker({ text: 'Cho tam giác ABC vuông tại A', confidence: 85 });
    const r = await extractProblemFromImage(sampleImage, { engine: 'tesseract' });
    if (r.ok) {
      expect(r.usage.inputTokens).toBe(0);
      expect(r.usage.outputTokens).toBe(0);
    }
  });
});

describe('extractProblemFromImage — engine="llm" (fallback)', () => {
  it('engine="llm" + provider có extractText → dùng provider path', async () => {
    const provider = makeProvider({
      extractText: jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'extract', text: 'Cho tam giác ABC vuông tại A', confidence: 'high' },
        usage: { inputTokens: 100, outputTokens: 20 },
      }),
    });
    setupTesseractWorker({ text: 'wrong text', confidence: 90 });
    const r = await extractProblemFromImage(sampleImage, { engine: 'llm', provider });
    expect(provider.extractText).toHaveBeenCalled();
    expect(mockTesseractCreateWorker).not.toHaveBeenCalled();
    if (r.ok) expect(r.text).toBe('Cho tam giác ABC vuông tại A');
  });
});
```

Cập nhật existing tests trong file: thêm `engine: 'llm'` vào mọi `extractProblemFromImage(..., { provider })` call hiện tại để chúng vẫn dùng LLM path (không bị default chuyển sang Tesseract). Search & replace `{ provider })` → `{ provider, engine: 'llm' })` trong file test.

- [ ] **Step 2: Run test to verify failures**

```bash
npx jest src/stamps/geometry-2d/ai/vision/__tests__/extractProblem.test.ts -v
```

Expected: 8 test mới FAIL với `engine` chưa được handle (returns LLM path mặc định và `tesseract.js` mock không bị call).

- [ ] **Step 3: Implement engine option trong extractProblemFromImage**

Modify `src/stamps/geometry-2d/ai/vision/extractProblem.ts`. Thay thế toàn bộ file bằng:

```ts
// src/stamps/geometry-2d/ai/vision/extractProblem.ts
//
// Orchestrator vision → text. Hỗ trợ 2 engine:
//   - 'tesseract' (default): client-side OCR, offline, không cần Ollama/API key.
//   - 'llm': Vision LLM qua AIProvider.extractText() (Ollama/Anthropic) — fallback
//            cho handwriting / math symbols.

import { selectProvider, type SelectProviderOptions } from '../providers';
import type { AIProvider, ImagePart, VisionRequest } from '../providers/types';
import { VisionEnvelopeZ, visionEnvelopeJsonSchema } from './envelope';
import { buildVisionSystemPrompt, VISION_USER_PROMPT } from './prompt';
import { runTesseractOcr } from './tesseract';

// Ngưỡng: text ngắn hơn thì force confidence=low bất kể engine report gì.
const MIN_HIGH_CONFIDENCE_CHARS = 10;
const MAX_TEXT_CHARS = 2000;
// Tesseract confidence (0-100): ≥ ngưỡng này coi như high.
const TESSERACT_HIGH_CONFIDENCE_THRESHOLD = 70;

export type VisionEngine = 'tesseract' | 'llm';

export interface ExtractProblemOptions extends SelectProviderOptions {
  /** OCR engine. Default 'tesseract' (client-side, không cần network). */
  engine?: VisionEngine;
  /** Tesseract language (chỉ áp dụng khi engine='tesseract'). Default 'vie+eng'. */
  tesseractLang?: string;
  /** Override model OCR cho LLM path. Priority cao hơn env. */
  visionModel?: string;
  /** Max tokens cho LLM response. Default 1024. */
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
  const engine: VisionEngine = opts.engine ?? 'tesseract';
  if (engine === 'tesseract') {
    return extractViaTesseract(image, opts);
  }
  return extractViaLlm(image, opts);
}

async function extractViaTesseract(
  image: ImagePart,
  opts: ExtractProblemOptions,
): Promise<ExtractProblemOutcome> {
  let raw: { text: string; confidence: number };
  try {
    raw = await runTesseractOcr(image, {
      ...(opts.tesseractLang ? { lang: opts.tesseractLang } : {}),
      ...(opts.signal ? { signal: opts.signal } : {}),
    });
  } catch (e) {
    const err = e as { message?: string };
    return {
      ok: false,
      reason: 'unreadable',
      message: 'Tesseract OCR fail: ' + (err.message ?? '?'),
    };
  }

  const text = postProcess(raw.text);
  if (text.length === 0) {
    return { ok: false, reason: 'empty', message: 'Tesseract không trích được text.' };
  }

  const tooShort = text.length < MIN_HIGH_CONFIDENCE_CHARS;
  const lowConf = raw.confidence < TESSERACT_HIGH_CONFIDENCE_THRESHOLD;
  const confidence: 'high' | 'low' = tooShort || lowConf ? 'low' : 'high';

  return {
    ok: true,
    text,
    confidence,
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

async function extractViaLlm(
  image: ImagePart,
  opts: ExtractProblemOptions,
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
  t = t.replace(/\*\*(.+?)\*\*/g, '$1');
  t = t.replace(/\*(.+?)\*/g, '$1');
  t = t.replace(/_(.+?)_/g, '$1');
  t = t.replace(/```[\s\S]*?```/g, '').replace(/`([^`]+)`/g, '$1');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.normalize('NFC');
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

- [ ] **Step 4: Run all extractProblem tests**

```bash
npx jest src/stamps/geometry-2d/ai/vision/__tests__/extractProblem.test.ts -v
```

Expected: ALL PASS — existing tests dùng `engine: 'llm'` + 8 test mới cho tesseract path.

- [ ] **Step 5: Commit**

```bash
git add src/stamps/geometry-2d/ai/vision/extractProblem.ts \
        src/stamps/geometry-2d/ai/vision/__tests__/extractProblem.test.ts
git commit -m "feat(ai): engine option cho extractProblemFromImage — Tesseract default"
```

---

## Task 4: Export Tesseract API qua vision/index.ts barrel

**Files:**
- Modify: `src/stamps/geometry-2d/ai/vision/index.ts`

- [ ] **Step 1: Update barrel**

Replace `src/stamps/geometry-2d/ai/vision/index.ts` với:

```ts
// src/stamps/geometry-2d/ai/vision/index.ts
export {
  extractProblemFromImage,
  pickVisionModel,
  type VisionEngine,
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
export {
  runTesseractOcr,
  type TesseractOcrOptions,
  type TesseractOcrResult,
} from './tesseract';
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: PASS (không regression).

- [ ] **Step 4: Commit**

```bash
git add src/stamps/geometry-2d/ai/vision/index.ts
git commit -m "feat(ai): export runTesseractOcr + VisionEngine type qua vision barrel"
```

---

## Task 5: Update CLAUDE.md gotchas

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update Vision OCR section**

Tìm dòng:
```markdown
- **Vision OCR (0.26.0+)**: `handleExtractProblem(image)` đọc đề từ ảnh qua AI multimodal. Browser cần `createImageBitmap` + `<canvas>.toBlob` (jsdom test environment không support — preprocess là smoke test only).
```

Replace bằng:
```markdown
- **Vision OCR (0.26.0+)**: `handleExtractProblem(image)` đọc đề từ ảnh. Default engine = **Tesseract.js** (client-side, offline, lazy load ~13MB vie+eng traineddata từ CDN lần đầu). Vision LLM (Ollama/Anthropic) chuyển sang opt-in qua `{ engine: 'llm' }` cho handwriting / math symbols phức tạp. Browser cần `createImageBitmap` + `<canvas>.toBlob`.
- **Tesseract CDN**: tesseract.js v7 mặc định fetch worker + traineddata từ `unpkg.com` + `tessdata.projectnaptha.com`. Offline-first consumer cần self-host (override `corePath`/`langPath` — TODO v0.27+, hiện chưa expose).
```

Tìm dòng:
```markdown
- **Vision model**: `WHITEBOARD_AI_VISION_MODEL` env override; mặc định cùng model với DSL gen (Ollama `gemma3:4b` multimodal native, Anthropic `claude-opus-4-7` vision native).
```

Replace bằng:
```markdown
- **Vision model (LLM path)**: chỉ áp dụng khi `engine: 'llm'`. `WHITEBOARD_AI_VISION_MODEL` env override; mặc định cùng model với DSL gen (Ollama `gemma3:4b` multimodal native, Anthropic `claude-opus-4-7` vision native).
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Tesseract OCR default + LLM fallback gotchas"
```

---

## Task 6: Browser smoke test

**Manual verification step — không có automated test vì jsdom không chạy được Tesseract worker.**

- [ ] **Step 1: Build package**

```bash
npm run build
```

Expected: dist/ rebuild, không có error tsup.

- [ ] **Step 2: Link vào consumer dev app**

User confirm consumer app nào để test (Hoctotbachkhoa hoặc local sandbox). Run:

```bash
# Trong whiteboard repo
npm link

# Trong consumer
cd <consumer-path>
npm link @xom11/whiteboard
npm run dev
```

- [ ] **Step 3: Smoke test trong browser**

1. Mở page có Whiteboard
2. Mở geometry stamp editor → AiFigurePrompt
3. Đính 1 ảnh đề toán đánh máy (PNG/JPEG, ~500KB, có chữ Việt + ký hiệu cơ bản)
4. Bấm nút OCR (nút send khi prompt trống + có ảnh)
5. Đợi ~5–15s (lần đầu tải traineddata)
6. **Expected:** textarea xuất hiện text từ ảnh, có thể có warning "OCR có thể không chính xác" nếu confidence thấp
7. **Expected:** không có console error "Failed to fetch" nữa
8. Edit text nếu cần → bấm Dựng → DSL gen chạy bình thường

Lần thứ 2 OCR ảnh khác: nhanh hơn (~2–5s) vì traineddata đã cache trong IndexedDB.

- [ ] **Step 4: Document kết quả**

Note xuống commit message kết quả qualitative:
- Ảnh đánh máy rõ: accuracy ~? %
- Ảnh in lệch/blur: accuracy ~? %
- Ký hiệu math (∆, ⊥, ∠): có đọc được không?

- [ ] **Step 5: Bump version + publish**

```bash
npm version patch  # 0.26.0 → 0.26.1
git push --follow-tags
npm publish --access public
```

---

## Self-Review

**Spec coverage:**
- ✅ Tesseract.js làm default engine — Task 3 step 3 (`engine: VisionEngine = opts.engine ?? 'tesseract'`)
- ✅ Vietnamese support — Task 2 step 3 (`DEFAULT_LANG = 'vie+eng'`)
- ✅ LLM path fallback — Task 3 step 3 (`extractViaLlm` giữ nguyên logic cũ)
- ✅ Lazy import — Task 2 step 3 (`await import('tesseract.js')`)
- ✅ Tests pass với mock — Task 2 step 1 (mock `tesseract.js` module)
- ✅ Existing tests không break — Task 3 step 1 (thêm `engine: 'llm'` vào existing tests)
- ✅ Browser verification — Task 6 step 3

**Placeholder scan:** None.

**Type consistency:**
- `VisionEngine = 'tesseract' | 'llm'` defined Task 3, exported Task 4.
- `TesseractOcrOptions`/`TesseractOcrResult` defined Task 2, exported Task 4.
- `opts.engine` consistent everywhere.
- `runTesseractOcr` signature consistent giữa Task 2 (define) + Task 3 (consume) + Task 4 (export).

**Risks not covered:**
- Tesseract.js v7 chưa stable trong Next.js 16 Turbopack (chưa verify) — fallback: nếu Turbopack bundle fail, switch sang `next/dynamic` import của AiFigurePrompt.
- Vie traineddata ~13MB download lần đầu — không có loading UI feedback v1. User có thể tưởng app treo. TODO ở v0.27+: add progress callback.
