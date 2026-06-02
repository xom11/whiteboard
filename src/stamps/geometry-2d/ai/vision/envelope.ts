// src/stamps/geometry-2d/ai/vision/envelope.ts
//
// Envelope schema cho OCR output. AI vision luôn emit:
//   { decision: 'extract', text: '...', confidence?: 'high'|'low' }
//   { decision: 'refuse',  reason: '...' }
//
// Schema flatten được pass cho cả Anthropic tool input_schema + Ollama format.

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const VisionEnvelopeZ = z
  .object({
    decision: z.enum(['extract', 'refuse']),
    text: z.string().optional(),
    confidence: z.enum(['high', 'low']).optional(),
    reason: z.string().optional(),
  })
  .refine(
    (e) =>
      e.decision === 'extract'
        ? e.text != null && e.text.length > 0
        : e.reason != null && e.reason.length > 0,
    { message: 'extract cần text không rỗng; refuse cần reason không rỗng' },
  );

export type VisionEnvelopeT = z.infer<typeof VisionEnvelopeZ>;

export function visionEnvelopeJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(VisionEnvelopeZ, {
    $refStrategy: 'none',
    target: 'jsonSchema7',
  }) as Record<string, unknown>;
}
