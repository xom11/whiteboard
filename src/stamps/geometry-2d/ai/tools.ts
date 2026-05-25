// src/stamps/geometry-2d/ai/tools.ts
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DslInput } from '../dsl';

export const BUILD_FIGURE_TOOL = {
  name: 'build_figure',
  description: 'Vẽ hình học 2D theo đề bài. Emit DSL JSON mô tả các điểm và hình.',
  input_schema: zodToJsonSchema(DslInput, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }),
} as const;

const RefuseInputZ = z.object({
  reason: z.string().min(1).describe('Lý do không vẽ được (tiếng Việt)'),
});

export const REFUSE_TOOL = {
  name: 'refuse',
  description: 'Từ chối khi không vẽ được hoặc đề ngoài phạm vi (3D, lượng giác, lớp 11+).',
  input_schema: zodToJsonSchema(RefuseInputZ, { target: 'jsonSchema7' }),
} as const;

export const TOOLS = [BUILD_FIGURE_TOOL, REFUSE_TOOL];
