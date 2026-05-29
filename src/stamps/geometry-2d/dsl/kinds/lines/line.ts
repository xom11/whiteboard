// src/stamps/geometry-2d/dsl/kinds/lines/line.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'line' }>;

export const lineModule = defineModule<'line', Input>({
  kind: 'line',
  role: 'line',
  category: 'lines',
  prefix: 'l',
  schema: z.object({
    name: NameZ,
    kind: z.literal('line'),
    p1: NameZ,
    p2: NameZ,
  }),
  collectRefs: (e) => [e.p1, e.p2],
  emit: () => {
    throw new Error('line.emit: not yet migrated (Phase 5 / Task 9)');
  },
});
