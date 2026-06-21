import { midpoint3dRule } from '../midpoint3d';
import { centroid3dRule } from '../centroid3d';
import { intersectionLineRule } from '../intersectionLine';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (r: any, p: string) => r.match({ problem: p, clauses: segmentClauses3D(p) });

describe('derived 3D rules', () => {
  it('midpoint: Gọi M là trung điểm của BC', () => {
    const i = run(midpoint3dRule, 'Gọi M là trung điểm của BC.')[0].intents[0] as any;
    expect(i.constraint).toMatchObject({ kind: 'midpoint', p1: 'B', p2: 'C' });
    expect(i.name).toBe('M');
  });

  it('midpoint distributive: M, N lần lượt là trung điểm AB, CD', () => {
    const intents = run(midpoint3dRule, 'M, N lần lượt là trung điểm AB, CD.').flatMap(
      (m: any) => m.intents,
    ) as any[];
    expect(intents.map((i: any) => i.name).sort()).toEqual(['M', 'N']);
  });

  it('centroid: G là trọng tâm tam giác SBC', () => {
    const i = run(centroid3dRule, 'G là trọng tâm tam giác SBC.')[0].intents[0] as any;
    expect(i.name).toBe('G');
    expect(i.constraint).toMatchObject({ kind: 'centroid', vertices: ['S', 'B', 'C'] });
  });

  it('intersectionLine: giao tuyến của (BCD) và (DMN)', () => {
    const i = run(intersectionLineRule, 'Tìm giao tuyến của (BCD) và (DMN).')[0].intents[0] as any;
    expect(i.refs).toMatchObject({ plane1: 'mp_BCD', plane2: 'mp_DMN' });
  });
});
