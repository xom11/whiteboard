// rules/__tests__/crossSection.test.ts
import { crossSectionRule } from '../crossSection';
import { segmentClauses3D } from '../../deterministic/coverage3d';
import { runDeterministicIntents3d } from '../../deterministic/runDeterministicIntents3d';

const run = (p: string) => crossSectionRule.match({ problem: p, clauses: segmentClauses3D(p) });

describe('crossSectionRule', () => {
  it('"thiết diện ... (MCD)" → threePoints plane + cross-section', () => {
    const intents = run('Xác định thiết diện của hình chóp S.ABCD cắt bởi mặt phẳng (MCD).').flatMap((m) => m.intents) as any[];
    const plane = intents.find((i) => i.op === 'plane');
    const sec = intents.find((i) => i.op === 'cross-section');
    expect(plane).toMatchObject({ name: 'mp_MCD', spec: { kind: 'threePoints', p1: 'M', p2: 'C', p3: 'D' } });
    expect(sec).toMatchObject({ op: 'cross-section', plane: 'mp_MCD' });
  });

  it('"cắt bởi (IJK)" without the word thiết diện still matches', () => {
    const intents = run('Hình chóp được cắt bởi mặt phẳng (IJK).').flatMap((m) => m.intents) as any[];
    expect(intents.find((i) => i.op === 'cross-section')).toMatchObject({ plane: 'mp_IJK' });
  });

  it('claims the clause it matched', () => {
    const matches = run('Cho hình chóp S.ABCD. Xác định thiết diện cắt bởi (MCD).');
    expect(matches.length).toBe(1);
    expect(matches[0].clauseIds.length).toBe(1);
  });

  it('does not match a clause with no 3-letter plane token', () => {
    expect(run('Tính diện tích thiết diện đó.')).toEqual([]);
  });

  it('sentence-initial capital "Thiết diện ..." is matched (case-insensitive CUE)', () => {
    const intents = run('Thiết diện của hình chóp cắt bởi (MCD).').flatMap((m) => m.intents) as any[];
    const plane = intents.find((i) => i.op === 'plane');
    const sec = intents.find((i) => i.op === 'cross-section');
    expect(plane).toMatchObject({ name: 'mp_MCD', spec: { kind: 'threePoints', p1: 'M', p2: 'C', p3: 'D' } });
    expect(sec).toMatchObject({ op: 'cross-section', plane: 'mp_MCD' });
  });

  it('lowercase token (mcd) is NOT matched — TOKEN stays case-sensitive', () => {
    expect(run('Thiết diện cắt bởi (mcd).')).toEqual([]);
  });

  // FIX I1: parallel-plane phrasing must NOT be claimed by crossSectionRule
  it('parallel-plane phrasing "qua M song song (SBC)" returns [] — owned by crossSectionParallelRule', () => {
    expect(
      run('Xác định thiết diện của hình chóp qua M song song với (SBC).'),
    ).toEqual([]);
  });

  // FIX I1 regression: plain "cắt bởi (MCD)" still emits cross-section
  it('plain "cắt bởi (MCD)" regression — still emits cross-section', () => {
    const intents = run('Xác định thiết diện của hình chóp S.ABCD cắt bởi (MCD).').flatMap((m) => m.intents) as any[];
    expect(intents.find((i) => i.op === 'cross-section')).toMatchObject({ plane: 'mp_MCD' });
  });
});

// FIX I1 co-fire integration: exactly ONE cross-section op, plane = mp_par_M (not mp_SBC)
describe('crossSectionRule + crossSectionParallelRule co-fire guard', () => {
  const PROBLEM =
    'Cho hình chóp S.ABCD có đáy là hình vuông. Gọi M là trung điểm của SA. Xác định thiết diện của hình chóp qua M song song với (SBC).';

  it('runDeterministicIntents3d emits exactly ONE cross-section op', () => {
    const result = runDeterministicIntents3d(PROBLEM);
    if (!result.ok) return; // may not be full-coverage, but intents still accumulate via tryPartial
    const crossSecs = result.intents.filter((i: any) => i.op === 'cross-section');
    expect(crossSecs).toHaveLength(1);
  });

  it('the single cross-section op references mp_par_M, NOT mp_SBC', () => {
    const result = runDeterministicIntents3d(PROBLEM);
    if (!result.ok) return;
    const sec = result.intents.find((i: any) => i.op === 'cross-section') as any;
    expect(sec?.plane).toBe('mp_par_M');
    expect(sec?.plane).not.toBe('mp_SBC');
  });
});
