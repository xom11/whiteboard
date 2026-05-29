// src/stamps/geometry-2d/dsl/kinds/lines/perpBisector.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'perpBisector' }>;

export const perpBisectorModule = defineModule<'perpBisector', Input>({
  kind: 'perpBisector',
  role: 'lineConstruction',
  category: 'lines',
  prefix: 'l',
  schema: z.object({
    name: NameZ,
    kind: z.literal('perpBisector'),
    p1: NameZ,
    p2: NameZ,
  }),
  collectRefs: (e) => [e.p1, e.p2],
  emit: () => {
    throw new Error('perpBisector.emit: not yet migrated (Phase 5 / Task 9)');
  },
});
