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

  it('chóp tứ giác đều + nón nội tiếp (Phase 5b): cone nội tiếp + solid fire (inscribedRoundSolid)', () => {
    // Phase 5b GỠ defer: nón/trụ nội-ngoại tiếp mặt → inscribedRoundSolid (coneRule cũ vẫn bail INSCRIBED).
    const p = 'Cho hình chóp tứ giác đều S.ABCD. Khối nón có đỉnh S và đường tròn đáy nội tiếp tứ giác ABCD.';
    expect(count(p, 'cone')).toBe(1);  // inscribedRoundSolid
    expect(count(p, 'solid')).toBe(1); // tự vẽ (solidRule miss "tứ giác đều")
  });
});
