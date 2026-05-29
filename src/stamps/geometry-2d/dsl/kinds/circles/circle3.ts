// src/stamps/geometry-2d/dsl/kinds/circles/circle3.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'circle3' }>;

export const circle3Module = defineModule<'circle3', Input>({
  kind: 'circle3',
  role: 'circle',
  category: 'circles',
  prefix: 'c',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circle3'),
    p1: NameZ,
    p2: NameZ,
    p3: NameZ,
  }),
  collectRefs: (e) => [e.p1, e.p2, e.p3],
  emit: () => {
    throw new Error('circle3.emit: not yet migrated (Phase 5 / Task 9)');
  },
});
