import { runRules3D } from '../registry';
import { segmentClauses3D } from '../../deterministic/coverage3d';

function ctxOf(problem: string) { return { problem, clauses: segmentClauses3D(problem).filter((c) => c.hasGeometry) }; }
const count = (p: string, op: string) =>
  runRules3D(ctxOf(p)).flatMap((m) => m.intents).filter((i: any) => i.op === op).length;

describe('inscribedRoundSolid co-firing', () => {
  it('Câu 73 trụ trên mặt nghiêng tứ diện (Phase 6): 1 cylinder (trục ⊥ mặt qua pointAboveFace) + 1 solid(tetra), KHÔNG dup', () => {
    const p = 'Cho tứ diện đều ABCD. Hình trụ có một đường tròn đáy là đường tròn nội tiếp tam giác BCD và chiều cao bằng chiều cao của tứ diện.';
    expect(count(p, 'cylinder')).toBe(1); // inscribedRoundSolid nhánh tetra-face
    expect(count(p, 'solid')).toBe(1);    // solidRule vẽ tứ diện (rule reference, không dup)
  });

  it('Câu 75 trụ nội tiếp lăng trụ (trục đứng): 1 cylinder + 1 solid(prism) + 0 sphere/cone', () => {
    const p = 'Cho hình lăng trụ đều ABC.A′B′C′. Thể tích của hình trụ có hai đáy nội tiếp hình lăng trụ.';
    expect(count(p, 'cylinder')).toBe(1);
    expect(count(p, 'solid')).toBe(1);
    expect(count(p, 'sphere')).toBe(0);
    expect(count(p, 'cone')).toBe(0);
  });

  it('Câu 70 nón nội tiếp chóp tứ giác đều: 1 cone + 1 solid (tự vẽ) + 0 sphere', () => {
    const p = 'Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a. Khối nón có đỉnh S và đường tròn đáy nội tiếp tứ giác ABCD.';
    expect(count(p, 'cone')).toBe(1);
    expect(count(p, 'solid')).toBe(1);
    expect(count(p, 'sphere')).toBe(0);
  });

  it('mặt cầu nội tiếp chóp KHÔNG kích inscribedRoundSolid (chủ-ngữ cầu, không nón/trụ)', () => {
    const p = 'Cho hình chóp tứ giác đều S.ABCD. Mặt cầu nội tiếp hình chóp S.ABCD.';
    expect(count(p, 'cone')).toBe(0);
    expect(count(p, 'cylinder')).toBe(0);
    expect(count(p, 'sphere')).toBe(1); // insphereOfPyramid
  });

  it('standalone Phase 4 nón/trụ KHÔNG kích inscribedRoundSolid', () => {
    expect(count('Cho hình nón đỉnh S có chiều cao h.', 'cone')).toBe(1); // coneRule, không inscribed
    expect(count('Cho hình trụ có thiết diện qua trục là hình vuông.', 'cylinder')).toBe(1);
  });

  it('lập phương + mặt cầu nội tiếp KHÔNG kích inscribedRoundSolid (insphereCube lo)', () => {
    const p = 'Mặt cầu nội tiếp hình lập phương cạnh a.';
    expect(count(p, 'cone')).toBe(0);
    expect(count(p, 'cylinder')).toBe(0);
  });
});
