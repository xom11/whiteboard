// rules/__tests__/perpLineToPlane.test.ts
import { perpLineToPlaneRule } from '../perpLineToPlane';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => perpLineToPlaneRule.match({ problem: p, clauses: segmentClauses3D(p) });
const flat = (p: string) => run(p).flatMap((m) => m.intents) as any[];

describe('perpLineToPlaneRule', () => {
  it('"đường thẳng qua A vuông góc với (SBC)" → perpToPlane line + ref plane', () => {
    const I = flat('Kẻ đường thẳng qua A vuông góc với mặt phẳng (SBC).');
    expect(I.find((i) => i.op === 'plane')).toMatchObject({ name: 'mp_SBC', spec: { kind: 'threePoints', p1: 'S', p2: 'B', p3: 'C' } });
    expect(I.find((i) => i.op === 'line')).toMatchObject({ kind: 'perpToPlane', refs: { point: 'A', plane: 'mp_SBC' } });
  });

  it('"qua A vuông góc với đáy" → base plane synth', () => {
    const I = flat('Cho hình chóp S.ABCD. Qua A dựng đường thẳng vuông góc với đáy.');
    expect(I.find((i) => i.op === 'line')).toMatchObject({ kind: 'perpToPlane', refs: { point: 'A', plane: 'mp_ABC' } });
  });

  it('co-fire guard: does NOT fire on a "hình chiếu" clause', () => {
    expect(run('Gọi H là hình chiếu vuông góc của A trên (SBC).')).toEqual([]);
  });

  it('does NOT fire when target is a line (perpPlaneToLine owns it)', () => {
    expect(run('Mặt phẳng qua A vuông góc với BC.')).toEqual([]);
  });
});
