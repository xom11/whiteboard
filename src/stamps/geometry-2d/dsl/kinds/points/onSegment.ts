// src/stamps/geometry-2d/dsl/kinds/points/onSegment.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';

type Input = Extract<DslPointT, { kind: 'onSegment' }>;

export const onSegmentModule = defineModule<'onSegment', Input>({
  kind: 'onSegment',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('onSegment'),
    segmentId: NameZ,
    t: z.number().min(0).max(1),
  }),
  collectRefs: (e) => [e.segmentId],
  emit: () => {
    throw new Error('onSegment.emit: not yet migrated (Phase 5 / Task 8)');
  },
});
