// src/stamps/geometry-2d/dsl/kinds/points/onLine.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslPointT, { kind: 'onLine' }>;

export const onLineModule: DslKindModule<'onLine', Input> = {
  kind: 'onLine',
  role: 'point',
  category: 'points',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('onLine'),
    lineId: NameZ,
    t: z.number().finite(),
  }),
  collectRefs: (e) => [e.lineId],
  emit: () => {
    throw new Error('onLine.emit: not yet migrated (Phase 5 / Task 8)');
  },
};
