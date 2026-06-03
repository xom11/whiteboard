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
