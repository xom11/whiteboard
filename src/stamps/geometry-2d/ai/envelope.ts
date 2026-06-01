// src/stamps/geometry-2d/ai/envelope.ts
//
// Envelope schema chung cho mọi AI provider. AI luôn emit:
//   { decision: 'build', figure: <DslInput> }
//   { decision: 'refuse', reason: '...' }
//
// Anthropic dùng tool_use với tool đơn ('emit_figure_envelope') input đúng
// schema này. Ollama (Gemma) dùng `format: <schema>` constrained output.
//
// Ưu điểm: 1 schema, 1 prompt, parse + validate ở 1 chỗ. Provider chỉ chịu
// trách nhiệm gửi/nhận; orchestrator (buildFigure) xử lý logic.

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DslInput, type DslInputT } from '../dsl';

export const FigureEnvelopeZ = z
  .object({
    decision: z.enum(['build', 'refuse']),
    // figure: DslInput khi build; null/undefined khi refuse.
    figure: DslInput.optional().nullable(),
    // reason: lý do từ chối (Việt) khi refuse; null/undefined khi build.
    reason: z.string().optional().nullable(),
  })
  .refine(
    (e) => (e.decision === 'build' ? e.figure != null : e.reason != null && e.reason.length > 0),
    {
      message:
        'decision=build cần `figure`; decision=refuse cần `reason` không rỗng',
    },
  );

export type FigureEnvelopeT = z.infer<typeof FigureEnvelopeZ>;

// JSON Schema bản phẳng — pass cho Anthropic tool input_schema + Ollama format.
// Note: refine() chỉ run ở Zod runtime; JSON Schema không representable. Provider
// constraint output ở "any of decision/figure/reason"; orchestrator parse +
// validate qua FigureEnvelopeZ để bắt vi phạm refine.
export function envelopeJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(FigureEnvelopeZ, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }) as Record<string, unknown>;
}

/** Helper: ép envelope build hợp lệ về DslInputT (sau khi đã validate). */
export function envelopeBuildDsl(env: FigureEnvelopeT): DslInputT {
  if (env.decision !== 'build' || env.figure == null) {
    throw new Error('envelopeBuildDsl: envelope không phải decision=build hoặc thiếu figure');
  }
  // Zod infer cho DslInput rộng `{[x: string]: any}[]` (discriminatedUnion từ
  // registry với schemas erased `ZodObject<any>`); runtime parse đã validate,
  // safe widen sang DslInputT (xem comment trong schema.ts).
  return env.figure as unknown as DslInputT;
}
