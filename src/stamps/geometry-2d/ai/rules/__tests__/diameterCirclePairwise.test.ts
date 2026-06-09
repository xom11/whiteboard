import { diameterCirclePairwiseRule } from '../diameterCirclePairwise';
import { segmentClauses } from '../../deterministic/coverage';

const PROBLEM =
  'Cho đường tròn (O) và ba dây cung AB, AC, AD bất kì. ' +
  'Các đường tròn đường kính AB, AC, AD đôi một cắt nhau lần thứ hai tại M, N, P.';

function run(problem: string) {
  return diameterCirclePairwiseRule.match({ problem, clauses: segmentClauses(problem) });
}
function intents(problem: string) {
  return run(problem).flatMap((m) => m.intents as any[]);
}

describe('diameterCirclePairwiseRule', () => {
  it('đề chuẩn → (O) + 4 onCircle + 3 dây + 3 đường kính + 3 giao điểm thứ hai', () => {
    const all = intents(PROBLEM);

    // (O): centerRadius tâm O.
    const o = all.find((i) => i.op === 'draw-circle' && i.spec === 'centerRadius');
    expect(o).toMatchObject({ name: 'kO', center: 'O', radius: 4 });

    // 4 điểm trên (O): A (apex) + B,C,D.
    const onC = all.filter((i) => i.op === 'add-point' && i.constraint.kind === 'onCircle');
    expect(onC.map((p) => p.name).sort()).toEqual(['A', 'B', 'C', 'D']);
    for (const p of onC) expect(p.constraint.circle).toBe('kO');

    // 3 dây cung A–B, A–C, A–D.
    const chords = all.filter((i) => i.op === 'connect');
    expect(chords.map((c) => `${c.from}${c.to}`).sort()).toEqual(['AB', 'AC', 'AD']);

    // 3 đường tròn đường kính.
    const dia = all.filter((i) => i.op === 'draw-circle' && i.spec === 'diameter');
    expect(dia.map((d) => d.name).sort()).toEqual(['kAB', 'kAC', 'kAD']);
    expect(dia.find((d) => d.name === 'kAB').endpoints).toEqual(['A', 'B']);

    // 3 giao điểm thứ hai, loại điểm chung A, ghép vòng.
    const sec = all.filter(
      (i) => i.op === 'add-point' && i.constraint.kind === 'circleSecondIntersection',
    );
    expect(sec.map((p) => p.name)).toEqual(['M', 'N', 'P']);
    for (const p of sec) expect(p.constraint.exclude).toBe('A');
    expect(sec[0].constraint).toMatchObject({ c1: 'kAB', c2: 'kAC' });
    expect(sec[1].constraint).toMatchObject({ c1: 'kAC', c2: 'kAD' });
    expect(sec[2].constraint).toMatchObject({ c1: 'kAD', c2: 'kAB' });
  });

  it('claim trọn clause (whole-problem) cho coverage gate', () => {
    const clauses = segmentClauses(PROBLEM);
    const matches = run(PROBLEM);
    expect(matches).toHaveLength(1);
    expect(matches[0].clauseIds.sort()).toEqual(clauses.map((c) => c.id).sort());
  });

  it('thiếu tâm "(O)" → escalate', () => {
    expect(
      run('Các đường tròn đường kính AB, AC, AD đôi một cắt nhau lần thứ hai tại M, N, P.'),
    ).toEqual([]);
  });

  it('chỉ 1 đường kính → escalate', () => {
    expect(
      run('Cho đường tròn (O). Đường tròn đường kính AB cắt nhau tại M.'),
    ).toEqual([]);
  });

  it('số tên kết quả ≠ số đường kính → escalate', () => {
    expect(
      run('Cho (O). Các đường tròn đường kính AB, AC, AD đôi một cắt nhau tại M, N.'),
    ).toEqual([]);
  });

  it('không phải apex chung → escalate', () => {
    expect(
      run('Cho (O). Các đường tròn đường kính AB, CD đôi một cắt nhau tại M, N.'),
    ).toEqual([]);
  });
});
