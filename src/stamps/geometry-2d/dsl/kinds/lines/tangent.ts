// src/stamps/geometry-2d/dsl/kinds/lines/tangent.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'tangent' }>;

export const tangentModule: DslKindModule<'tangent', Input> = {
  kind: 'tangent',
  role: 'lineConstruction',
  category: 'lines',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('tangent'),
    throughPoint: NameZ,
    toCircle: NameZ,
    branch: z.union([z.literal(0), z.literal(1), z.literal('on')]).optional(),
  }),
  collectRefs: (e) => [e.throughPoint, e.toCircle],
  emit: () => {
    throw new Error('tangent.emit: not yet migrated (Phase 5 / Task 9)');
  },
};
