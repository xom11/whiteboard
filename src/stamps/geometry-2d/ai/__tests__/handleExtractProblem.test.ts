import { handleExtractProblem } from '../handleExtractProblem';
import type { ImagePart } from '../vision/types';

// Mock tesseract.js — engine duy nhất sau khi gỡ LLM.
const mockRecognize = jest.fn();
const mockTerminate = jest.fn();
const mockCreateWorker = jest.fn();

jest.mock('tesseract.js', () => ({
  createWorker: (...args: unknown[]) => mockCreateWorker(...args),
}));

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

const sampleImage: ImagePart = { mediaType: 'image/png', base64: 'b64' };

describe('handleExtractProblem (Tesseract)', () => {
  it('high confidence → kind=success với text + usage zeros', async () => {
    setupWorker({ text: 'Cho tam giác ABC vuông tại A', confidence: 90 });
    const r = await handleExtractProblem(sampleImage);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.text).toBe('Cho tam giác ABC vuông tại A');
      expect(r.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
    }
  });

  it('low confidence → kind=low-confidence + warning', async () => {
    setupWorker({ text: 'Cho tam giác ABC vuông tại A', confidence: 40 });
    const r = await handleExtractProblem(sampleImage);
    expect(r.kind).toBe('low-confidence');
    if (r.kind === 'low-confidence') {
      expect(r.warning).toMatch(/kiểm tra|không chính xác/i);
    }
  });

  it('empty OCR → kind=error code=empty', async () => {
    setupWorker({ text: '   ', confidence: 0 });
    const r = await handleExtractProblem(sampleImage);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.code).toBe('empty');
  });

  it('worker crash → kind=error code=network', async () => {
    setupWorker({ text: 'x', confidence: 50 });
    mockRecognize.mockRejectedValueOnce(new Error('down'));
    const r = await handleExtractProblem(sampleImage);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.code).toBe('network');
  });
});
