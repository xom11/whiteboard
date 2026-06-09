import { runTesseractOcr } from '../tesseract';
import type { ImagePart } from '../types';

// Mock tesseract.js trước import test (jsdom không chạy Web Worker)
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

  it('passes data URL (mediaType + base64) vào worker.recognize', async () => {
    setupWorker({ text: 'x', confidence: 50 });
    await runTesseractOcr(sampleImage);
    expect(mockRecognize).toHaveBeenCalledWith(
      'data:image/png;base64,iVBORw0AA==',
    );
  });

  it('default lang = vie+eng', async () => {
    setupWorker({ text: 'x', confidence: 50 });
    await runTesseractOcr(sampleImage);
    expect(mockCreateWorker).toHaveBeenCalledWith('vie+eng');
  });

  it('lang override truyền xuống createWorker', async () => {
    setupWorker({ text: 'x', confidence: 50 });
    await runTesseractOcr(sampleImage, { lang: 'eng' });
    expect(mockCreateWorker).toHaveBeenCalledWith('eng');
  });

  it('luôn terminate worker kể cả khi recognize throw', async () => {
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
