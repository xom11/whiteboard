// src/stamps/geometry-2d/dsl/kinds/lines/segment.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import type { DslKindModule } from '../_types';

type Input = Extract<DslShapeT, { kind: 'segment' }>;

export const segmentModule: DslKindModule<'segment', Input> = {
  kind: 'segment',
  role: 'segment',
  category: 'lines',
  prefix: '',
  schema: z.object({
    name: NameZ,
    kind: z.literal('segment'),
    p1: NameZ,
    p2: NameZ,
  }),
  collectRefs: (e) => [e.p1, e.p2],
  emit: () => {
    throw new Error('segment.emit: not yet migrated (Phase 5 / Task 9)');
  },
};
