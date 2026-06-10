import { polygonInscribedCircleRule } from '../polygonInscribedCircle';
import { segmentClauses } from '../../deterministic/coverage';

function run(p: string) {
  return polygonInscribedCircleRule.match({ problem: p, clauses: segmentClauses(p) });
}

describe('polygonInscribedCircleRule', () => {
  it('"hình vuông ABCD nội tiếp đường tròn (O)" → circle O through3 A,B,C', () => {
    const i = run('Cho hình vuông ABCD nội tiếp đường tròn (O)').flatMap((m) => m.intents)[0] as any;
    expect(i.op).toBe('draw-circle');
    expect(i.name).toBe('O');
    expect(i.spec).toBe('through3');
    expect(i.points).toEqual(['A', 'B', 'C']);
  });

  it('"hình chữ nhật MNPQ nội tiếp (I)"', () => {
    const i = run('Cho hình chữ nhật MNPQ nội tiếp (I)').flatMap((m) => m.intents)[0] as any;
    expect(i.name).toBe('I');
    expect(i.points).toEqual(['M', 'N', 'P']);
  });

  it('"tứ giác ABCD nội tiếp (O)" KHÔNG match (không cyclic-by-construction)', () => {
    expect(run('Cho tứ giác ABCD nội tiếp (O)').length).toBe(0);
  });
});
