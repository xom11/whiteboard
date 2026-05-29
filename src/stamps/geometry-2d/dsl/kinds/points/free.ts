// src/stamps/geometry-2d/dsl/kinds/points/free.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';

type Input = Extract<DslPointT, { kind: 'free' }>;

export const freeModule = defineModule<'free', Input>({
  kind: 'free',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('free'),
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  collectRefs: () => [],
  emit: () => {
    throw new Error('free.emit: not yet migrated (Phase 5 / Task 8)');
  },
});
