// src/stamps/geometry-2d/dsl/kinds/points/pointAtDistance.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'pointAtDistance' }>;

const DistanceZ = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('circleRadius'), circle: NameZ }),
  z.object({ kind: z.literal('segmentLength'), p1: NameZ, p2: NameZ }),
  z.object({ kind: z.literal('literal'), value: z.number().positive() }),
]);

export const pointAtDistanceModule = defineModule<'pointAtDistance', Input>({
  kind: 'pointAtDistance',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('pointAtDistance'),
    from: NameZ,
    through: NameZ,
    distance: DistanceZ,
  }),
  collectRefs: (e) => {
    const d = e.distance;
    const extra = d.kind === 'circleRadius' ? [d.circle]
      : d.kind === 'segmentLength' ? [d.p1, d.p2] : [];
    return [e.from, e.through, ...extra];
  },
  emit: (e, ctx) => {
    const d = e.distance;
    const distance = d.kind === 'circleRadius'
      ? { kind: 'circleRadius', circle: ctx.resolveId(d.circle) }
      : d.kind === 'segmentLength'
        ? { kind: 'segmentLength', p1: ctx.resolveId(d.p1), p2: ctx.resolveId(d.p2) }
        : { kind: 'literal', value: d.value };
    return [{
      role: 'primary',
      object: emitPointObject(ctx.resolveId(e.name), e.name, {
        kind: 'pointAtDistance',
        from: ctx.resolveId(e.from),
        through: ctx.resolveId(e.through),
        distance,
      }),
    }];
  },
});
