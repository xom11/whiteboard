// src/stamps/geometry-2d/dsl/kinds/points/pointAtDistance.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule, type RefSpec } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'pointAtDistance' }>;

// scale/offset OPTIONAL (Issue #46 nhóm C): d = scale·base + offset. scale phải
// > 0; offset bất kỳ (âm OK — guard d>0 ở render). Absent → giữ form cũ (additive).
const ScaleOffsetZ = {
  scale: z.number().positive().optional(),
  offset: z.number().optional(),
};
const DistanceZ = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('circleRadius'), circle: NameZ, ...ScaleOffsetZ }),
  z.object({ kind: z.literal('segmentLength'), p1: NameZ, p2: NameZ, ...ScaleOffsetZ }),
  z.object({ kind: z.literal('literal'), value: z.number().positive(), ...ScaleOffsetZ }),
]);

/** Chỉ chèn scale/offset khi có giá trị → object cũ KHÔNG mọc key (additive). */
function withScaleOffset<T extends object>(base: T, d: { scale?: number; offset?: number }): T {
  const out = { ...base } as T & { scale?: number; offset?: number };
  if (d.scale !== undefined) out.scale = d.scale;
  if (d.offset !== undefined) out.offset = d.offset;
  return out;
}

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
  // refSpecs động: distance.{circle,p1,p2} nested validate qua dotted path
  // ('distance.circle' — runSpecs ở transpile/refs.ts đọc bằng reduce theo '.').
  refSpecs: (e) => {
    const base: RefSpec[] = [
      { field: 'from', role: 'point' },
      { field: 'through', role: 'point' },
    ];
    if (e.distance.kind === 'circleRadius') {
      return [...base, { field: 'distance.circle', role: 'circle' }];
    }
    if (e.distance.kind === 'segmentLength') {
      return [
        ...base,
        { field: 'distance.p1', role: 'point' },
        { field: 'distance.p2', role: 'point' },
      ];
    }
    return base;
  },
  emit: (e, ctx) => {
    const d = e.distance;
    const distance = d.kind === 'circleRadius'
      ? withScaleOffset({ kind: 'circleRadius', circle: ctx.resolveId(d.circle) }, d)
      : d.kind === 'segmentLength'
        ? withScaleOffset({ kind: 'segmentLength', p1: ctx.resolveId(d.p1), p2: ctx.resolveId(d.p2) }, d)
        : withScaleOffset({ kind: 'literal', value: d.value }, d);
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
