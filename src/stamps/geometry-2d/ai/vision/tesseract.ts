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
