// src/stamps/geometry-2d/dsl/kinds/lines/angleBisector.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'angleBisector' }>;

export const angleBisectorModule: DslKindModule<'angleBisector', Input> = {
  kind: 'angleBisector',
  role: 'lineConstruction',
  category: 'lines',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('angleBisector'),
    p1: NameZ,
    vertex: NameZ,
    p2: NameZ,
  }),
  collectRefs: (e) => [e.p1, e.vertex, e.p2],
  emit: () => {
    throw new Error('angleBisector.emit: not yet migrated (Phase 5 / Task 9)');
  },
};
