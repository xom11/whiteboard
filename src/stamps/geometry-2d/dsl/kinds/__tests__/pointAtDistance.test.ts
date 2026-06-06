import { pointAtDistanceModule } from '../points/pointAtDistance';
import type { EmitContext } from '../_types';

const ctx: EmitContext = { resolveId: (n) => `id_${n}`, hintOf: () => 'point', mintAuxId: () => 'aux' };
const base = { name: 'C', kind: 'pointAtDistance', from: 'A', through: 'B' } as const;

describe('pointAtDistance kind', () => {
  it('parse circleRadius', () => {
    expect(pointAtDistanceModule.schema.safeParse({ ...base, distance: { kind: 'circleRadius', circle: 'k' } }).success).toBe(true);
  });
  it('parse segmentLength', () => {
    expect(pointAtDistanceModule.schema.safeParse({ ...base, distance: { kind: 'segmentLength', p1: 'O', p2: 'A' } }).success).toBe(true);
  });
  it('parse literal', () => {
    expect(pointAtDistanceModule.schema.safeParse({ ...base, distance: { kind: 'literal', value: 2 } }).success).toBe(true);
  });
  it('reject literal âm', () => {
    expect(pointAtDistanceModule.schema.safeParse({ ...base, distance: { kind: 'literal', value: -1 } }).success).toBe(false);
  });
  it('collectRefs circleRadius = [from, through, circle]', () => {
    expect(pointAtDistanceModule.collectRefs({ ...base, distance: { kind: 'circleRadius', circle: 'k' } } as never)).toEqual(['A', 'B', 'k']);
  });
  it('collectRefs segmentLength = [from, through, p1, p2]', () => {
    expect(pointAtDistanceModule.collectRefs({ ...base, distance: { kind: 'segmentLength', p1: 'O', p2: 'A' } } as never)).toEqual(['A', 'B', 'O', 'A']);
  });
  it('collectRefs literal = [from, through]', () => {
    expect(pointAtDistanceModule.collectRefs({ ...base, distance: { kind: 'literal', value: 2 } } as never)).toEqual(['A', 'B']);
  });
  it('emit resolves ids trong distance', () => {
    const out = pointAtDistanceModule.emit({ ...base, distance: { kind: 'segmentLength', p1: 'O', p2: 'A' } } as never, ctx);
    expect(out[0].object.attrs).toMatchObject({
      constraint: { kind: 'pointAtDistance', from: 'id_A', through: 'id_B', distance: { kind: 'segmentLength', p1: 'id_O', p2: 'id_A' } },
    });
  });
});
