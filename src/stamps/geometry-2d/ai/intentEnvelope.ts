// src/stamps/geometry-2d/ai/intentEnvelope.ts
//
// JSON Schema helper cho Intent envelope (giữ cho advanced consumer cần
// schema constraint). Refine() check ở Zod runtime; JSON Schema không representable.

import { zodToJsonSchema } from 'zod-to-json-schema';
import { IntentEnvelopeZ, type IntentEnvelopeT } from './intent';
import type { IntentT } from './intent';

export function intentEnvelopeJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(IntentEnvelopeZ, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }) as Record<string, unknown>;
}

export function envelopeIntentList(env: IntentEnvelopeT): readonly IntentT[] {
  if (env.decision !== 'build' || env.intents == null) {
    throw new Error(
      'envelopeIntentList: envelope không phải decision=build hoặc thiếu intents',
    );
  }
  return env.intents;
}
