// src/stamps/geometry-2d/ai/refineEnvelope.ts
//
// Envelope schema cho multi-step refine. AI emit 1 trong 3:
//   { decision: 'add',     figure: <DSL delta> }
//   { decision: 'replace', figure: <DSL full> }
//   { decision: 'refuse',  reason: '...' }
//
// Tách hẳn khỏi FigureEnvelopeZ (build) — decision space khác (3 thay vì 2),
// semantics khác (delta vs full), prompt khác.

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DslInput } from '../dsl';

export const FigureRefineEnvelopeZ = z
  .object({
    decision: z.enum(['add', 'replace', 'refuse']),
    figure: DslInput.optional(),
    reason: z.string().optional(),
  })
  .refine(
    (e) =>
      e.decision === 'refuse'
        ? e.reason != null && e.reason.length > 0
        : e.figure != null,
    {
      message:
        'decision=add/replace cần `figure`; decision=refuse cần `reason` không rỗng',
    },
  );

export type FigureRefineEnvelopeT = z.infer<typeof FigureRefineEnvelopeZ>;

export function refineEnvelopeJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(FigureRefineEnvelopeZ, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }) as Record<string, unknown>;
}
