// rules/__tests__/metricCofire.test.ts
//
// Co-firing integration test: verifies that the 4 metric rules (projectionFoot,
// perpLineToPlane, perpPlaneToLine, angleLinePlane) do NOT fire simultaneously on
// the same clause — the co-fire guards (OWNED_BY_FOOT in perp* rules, LINE_TARGET
// in perpLineToPlane) must keep intent counts exact-1 / exact-0, not just ≥ checks.
//
// RED→GREEN sentinel: removing any co-fire guard would break these assertions
// because the exact-0 counts would become 1 (double-fire).
import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const ops = (p: string) =>
  runRules3D({ problem: p, clauses: segmentClauses3D(p) }).flatMap((m) => m.intents);

describe('metric rule co-firing', () => {
  it('"đường thẳng qua A vuông góc (SBC)" → exactly ONE perpToPlane line, ZERO perpToLine plane', () => {
    const I = ops('Cho hình chóp S.ABCD. Kẻ đường thẳng qua A vuông góc với (SBC).');
    expect(I.filter((i: any) => i.op === 'line' && i.kind === 'perpToPlane').length).toBe(1);
    expect(I.filter((i: any) => i.op === 'plane' && i.spec?.kind === 'perpToLine').length).toBe(0);
  });

  it('"mặt phẳng qua A vuông góc BC" → exactly ONE perpToLine plane, ZERO perpToPlane line', () => {
    const I = ops('Cho hình chóp S.ABCD. Dựng mặt phẳng qua A vuông góc với BC.');
    expect(I.filter((i: any) => i.op === 'plane' && i.spec?.kind === 'perpToLine').length).toBe(1);
    expect(I.filter((i: any) => i.op === 'line' && i.kind === 'perpToPlane').length).toBe(0);
  });

  it('"Gọi H là hình chiếu của A trên (SBC)" → ONE perpFootPlane, ZERO perp line/plane construct', () => {
    const I = ops('Cho hình chóp S.ABCD. Gọi H là hình chiếu vuông góc của A trên (SBC).');
    expect(I.filter((i: any) => i.op === 'add-point-3d' && i.constraint?.kind === 'perpFootPlane').length).toBe(1);
    expect(I.filter((i: any) => i.op === 'line' && i.kind === 'perpToPlane').length).toBe(0);
    expect(I.filter((i: any) => i.op === 'plane' && i.spec?.kind === 'perpToLine').length).toBe(0);
  });
});
