// src/stamps/geometry-2d/ai/envelope.ts
//
// Envelope schema cho figure build I/O:
//   { decision: 'build', figure: <DslInput> }
//   { decision: 'refuse', reason: '...' }
//
// 1 schema, parse + validate ở 1 chỗ. Giữ cho advanced consumer muốn dùng
// envelope build-side (FigureEnvelopeZ + envelopeBuildDsl) trực tiếp.

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DslInput, type DslInputT } from '../dsl';

export const FigureEnvelopeZ = z
  .object({
    decision: z.enum(['build', 'refuse']),
    // figure: DslInput khi build; bỏ qua khi refuse.
    figure: DslInput.optional(),
    // reason: lý do từ chối (Việt) khi refuse; bỏ qua khi build.
    reason: z.string().optional(),
  })
  .refine(
    (e) => (e.decision === 'build' ? e.figure != null : e.reason != null && e.reason.length > 0),
    {
      message:
        'decision=build cần `figure`; decision=refuse cần `reason` không rỗng',
    },
  );

export type FigureEnvelopeT = z.infer<typeof FigureEnvelopeZ>;

// JSON Schema bản phẳng cho consumer cần schema constraint.
// Note: refine() chỉ run ở Zod runtime; JSON Schema không representable.
// Validate qua FigureEnvelopeZ để bắt vi phạm refine.
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
