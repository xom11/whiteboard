import { extractProblemFromImage, pickVisionModel } from '../extractProblem';
import type { AIProvider, ImagePart, VisionRequest } from '../../providers/types';

// Mock tesseract.js cho tests engine='tesseract' (jsdom không chạy Web Worker)
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

describe('extractProblemFromImage — engine="llm"', () => {
  it('success: provider returns extract envelope với text high confidence', async () => {
    const provider = makeProvider({
      extractText: jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'extract', text: 'Cho tam giác ABC', confidence: 'high' },
        usage: { inputTokens: 100, outputTokens: 20 },
      }),
    });
    const r = await extractProblemFromImage(sampleImage, { engine: 'llm', provider });
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
    const r = await extractProblemFromImage(sampleImage, { engine: 'llm', provider });
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
    const r = await extractProblemFromImage(sampleImage, { engine: 'llm', provider });
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
    const r = await extractProblemFromImage(sampleImage, { engine: 'llm', provider });
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
    const r = await extractProblemFromImage(sampleImage, { engine: 'llm', provider });
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
    const r = await extractProblemFromImage(sampleImage, { engine: 'llm', provider });
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
    await extractProblemFromImage(sampleImage, {
      engine: 'llm',
      provider,
      visionModel: 'gemma3:12b',
    });
    const req = extractTextSpy.mock.calls[0][0] as VisionRequest;
    expect(req.images).toHaveLength(1);
    expect(req.images[0]).toEqual(sampleImage);
    expect(req.model).toBe('gemma3:12b');
    expect(req.systemPrompt).toMatch(/đề toán|đề bài/i);
    expect(req.schema).toBeDefined();
  });
});

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

  it('engine="llm" với provider → skip Tesseract, dùng provider path', async () => {
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
