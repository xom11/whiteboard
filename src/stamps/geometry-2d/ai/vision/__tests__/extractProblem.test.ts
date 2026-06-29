import { extractProblemFromImage } from '../extractProblem';
import type { ImagePart } from '../types';

// Mock tesseract.js (jsdom không chạy Web Worker)
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

const sampleImage: ImagePart = { mediaType: 'image/png', base64: 'iVBOR...' };

describe('extractProblemFromImage — Tesseract', () => {
  it('default → dùng Tesseract worker', async () => {
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
    const r = await extractProblemFromImage(sampleImage);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.confidence).toBe('low');
  });

  it('confidence ≥ 70 nhưng text quá ngắn (< 10 chars) → low', async () => {
    setupTesseractWorker({ text: 'ngắn', confidence: 90 });
    const r = await extractProblemFromImage(sampleImage);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.confidence).toBe('low');
  });

  it('post-process: trim + collapse whitespace', async () => {
    setupTesseractWorker({
      text: '  Cho   tam   giác   ABC  \n\n  vuông tại A  ',
      confidence: 90,
    });
    const r = await extractProblemFromImage(sampleImage);
    if (r.ok) expect(r.text).toBe('Cho tam giác ABC vuông tại A');
  });

  it('post-process: áp repairOcrSymbols (vá ⊥ △ (O) trên output OCR thật)', async () => {
    // Chuỗi đo thật từ tesseract.js trên PDF rasterize (tuyen-tap-400).
    setupTesseractWorker({
      text: 'Cho AABC đều nội tiếp (0) Hạ BK | AM tại K',
      confidence: 88,
    });
    const r = await extractProblemFromImage(sampleImage);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).toBe('Cho tam giác ABC đều nội tiếp (O) Hạ BK ⊥ AM tại K');
    }
  });

  it('empty text từ Tesseract → reason="empty"', async () => {
    setupTesseractWorker({ text: '   ', confidence: 0 });
    const r = await extractProblemFromImage(sampleImage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('empty');
  });

  it('Tesseract throws → reason="unreadable" với message', async () => {
    setupTesseractWorker({ text: 'x', confidence: 50 });
    mockTesseractRecognize.mockRejectedValueOnce(new Error('Worker crashed'));
    const r = await extractProblemFromImage(sampleImage);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('unreadable');
      expect(r.message).toContain('Worker crashed');
    }
  });

  it('usage = {inputTokens:0, outputTokens:0} (Tesseract không có token concept)', async () => {
    setupTesseractWorker({ text: 'Cho tam giác ABC vuông tại A', confidence: 85 });
    const r = await extractProblemFromImage(sampleImage);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it('tesseractLang option truyền xuống worker', async () => {
    setupTesseractWorker({ text: 'Cho tam giác ABC vuông tại A', confidence: 85 });
    await extractProblemFromImage(sampleImage, { tesseractLang: 'eng' });
    expect(mockTesseractCreateWorker).toHaveBeenCalledWith('eng');
  });
});
