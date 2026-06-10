// src/stamps/geometry-2d/ai/handleGenerateFigureIntent.ts
//
// Façade cho HTTP transport — wrap generateFigureIntent với error mapping
// tới AiFigureIntentUiResult (pattern giống handleGenerateFigure cũ).

import { generateFigureIntent, type GenerateIntentOptions } from './buildFigureIntent';
import type { IntentT } from './intent';
import type { DslInputT } from '../dsl/schema';

export interface HandleGenerateFigureIntentOptions extends GenerateIntentOptions {}

export interface HandleGenerateFigureIntentInput {
  problem: string;
}

export type AiFigureIntentUiResult =
  | {
      kind: 'success';
      dsl: DslInputT;
      intents: readonly IntentT[];
      svg?: string;
      usage: { inputTokens: number; outputTokens: number };
      /** Có mặt khi partial render: `message` là to-do list cho user tự dựng nốt. */
      partial?: { message: string };
    }
  | {
      kind: 'refused';
      message: string;
    }
  | {
      kind: 'error';
      code: string;
      message: string;
    };

export async function handleGenerateFigureIntent(
  problem: string,
  opts: HandleGenerateFigureIntentOptions = {},
): Promise<AiFigureIntentUiResult> {
  try {
    const r = await generateFigureIntent(problem, opts);
    if (r.ok) {
      return {
        kind: 'success',
        dsl: r.dsl,
        intents: r.intents,
        usage: {
          inputTokens: r.usage.inputTokens,
          outputTokens: r.usage.outputTokens,
        },
        ...(r.partial ? { partial: r.partial } : {}),
      };
    }
    return { kind: 'error', code: r.reason, message: r.message };
  } catch (e) {
    return {
      kind: 'error',
      code: 'unexpected',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
