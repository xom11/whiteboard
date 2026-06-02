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
