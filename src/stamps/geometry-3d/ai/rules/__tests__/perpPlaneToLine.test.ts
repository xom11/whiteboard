// rules/__tests__/perpPlaneToLine.test.ts
import { perpPlaneToLineRule } from '../perpPlaneToLine';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => perpPlaneToLineRule.match({ problem: p, clauses: segmentClauses3D(p) });
const flat = (p: string) => run(p).flatMap((m) => m.intents) as any[];

describe('perpPlaneToLineRule', () => {
  it('"mặt phẳng qua A vuông góc với BC" → perpToLine plane', () => {
    const I = flat('Dựng mặt phẳng qua A vuông góc với BC.');
    expect(I.find((i) => i.op === 'plane')).toMatchObject({ name: 'mp_perp_A', spec: { kind: 'perpToLine', point: 'A', lineA: 'B', lineB: 'C' } });
  });

  it('"mặt phẳng (P) qua O vuông góc SA" → perpToLine plane', () => {
    const I = flat('Cho hình chóp S.ABCD tâm O. Mặt phẳng qua O vuông góc SA.');
    expect(I.find((i) => i.op === 'plane')).toMatchObject({ spec: { kind: 'perpToLine', point: 'O', lineA: 'S', lineB: 'A' } });
  });

  it('does NOT fire when target is a plane (perpLineToPlane owns it)', () => {
    expect(run('Đường thẳng qua A vuông góc với (SBC).')).toEqual([]);
  });

  it('co-fire guard: does NOT fire on a "hình chiếu" clause', () => {
    expect(run('Hình chiếu của S trên (ABC).')).toEqual([]);
  });
});
