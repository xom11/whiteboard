// rules/__tests__/crossSection.test.ts
import { crossSectionRule } from '../crossSection';
import { segmentClauses3D } from '../../deterministic/coverage3d';

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
});
