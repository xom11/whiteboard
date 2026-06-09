// src/stamps/geometry-2d/ai/vision/extractProblem.ts
//
// Orchestrator vision → text. Engine duy nhất: Tesseract.js client-side OCR,
// offline, không cần network / LLM / API key. (Engine 'llm' cũ đã gỡ.)

import { runTesseractOcr } from './tesseract';
import type { ImagePart } from './types';

// Ngưỡng: text ngắn hơn thì force confidence=low bất kể engine report gì.
const MIN_HIGH_CONFIDENCE_CHARS = 10;
const MAX_TEXT_CHARS = 2000;
// Tesseract confidence (0-100): ≥ ngưỡng này coi như high.
const TESSERACT_HIGH_CONFIDENCE_THRESHOLD = 70;

export interface ExtractProblemOptions {
  /** Tesseract language. Default 'vie+eng' cho đề toán VN. */
  tesseractLang?: string;
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

export async function extractProblemFromImage(
  image: ImagePart,
  opts: ExtractProblemOptions = {},
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
