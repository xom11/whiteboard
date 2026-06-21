import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function ctxOf(problem: string) {
  const clauses = segmentClauses3D(problem).filter((c) => c.hasGeometry);
  return { problem, clauses };
}
const count = (problem: string, op: string) =>
  runRules3D(ctxOf(problem)).flatMap((m) => m.intents).filter((i: any) => i.op === op).length;

describe('solids co-firing', () => {
  it('mặt cầu ngoại tiếp tứ diện: đúng 1 sphere, không cone/cylinder', () => {
    const p = 'Cho tứ diện ABCD. Mặt cầu ngoại tiếp tứ diện ABCD.';
    expect(count(p, 'sphere')).toBe(1);
    expect(count(p, 'cone')).toBe(0);
    expect(count(p, 'cylinder')).toBe(0);
  });

  it('hình nón standalone: 1 cone, 0 sphere/cylinder', () => {
    const p = 'Cho hình nón đỉnh S có chiều cao h.';
    expect(count(p, 'cone')).toBe(1);
    expect(count(p, 'sphere')).toBe(0);
    expect(count(p, 'cylinder')).toBe(0);
  });

  it('hình trụ standalone: 1 cylinder, 0 cone', () => {
    const p = 'Cho hình trụ có thiết diện qua trục là hình vuông.';
    expect(count(p, 'cylinder')).toBe(1);
    expect(count(p, 'cone')).toBe(0);
  });

  it('chóp + nón nội tiếp: solid fires, cone KHÔNG (compound deferred)', () => {
    const p = 'Cho hình chóp S.ABCD. Khối nón đỉnh S đáy nội tiếp ABCD.';
    expect(count(p, 'cone')).toBe(0);
    expect(count(p, 'solid')).toBe(1);
  });
});
