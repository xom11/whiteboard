// src/stamps/geometry-2d/dsl/kinds/lines/perpendicular.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'perpendicular' }>;

export const perpendicularModule: DslKindModule<'perpendicular', Input> = {
  kind: 'perpendicular',
  role: 'lineConstruction',
  category: 'lines',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('perpendicular'),
    throughPoint: NameZ,
    toLine: NameZ,
  }),
  collectRefs: (e) => [e.throughPoint, e.toLine],
  emit: () => {
    throw new Error('perpendicular.emit: not yet migrated (Phase 5 / Task 9)');
  },
};
