import { circumcircleCutsLineRule } from '../circumcircleCutsLine';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => circumcircleCutsLineRule.match({ problem: p, clauses: segmentClauses(p) });

describe('circumcircleCutsLineRule', () => {
  it('Bài 92: "Đường tròn ngoại tiếp tam giác HBC cắt BI tại K khác B"', () => {
    const it = run('Đường tròn ngoại tiếp tam giác HBC cắt BI tại K khác B').flatMap((m) => m.intents) as any[];
    expect(it.find((i) => i.op === 'draw-circle')).toMatchObject({ name: 'wHBC', spec: 'through3', points: ['H', 'B', 'C'] });
    const k = it.find((i) => i.op === 'add-point');
    expect(k.name).toBe('K');
    expect(k.constraint).toEqual({ kind: 'secondIntersection', line: 'BI', circle: 'wHBC', other: 'B' });
  });

  it('điểm chung suy từ đầu mút line ∈ tam giác (không "khác")', () => {
    const it = run('Đường tròn ngoại tiếp tam giác ABE cắt AC tại P').flatMap((m) => m.intents) as any[];
    expect((it.find((i) => i.op === 'add-point') as any).constraint.other).toBe('A');
  });

  it('fail-safe: K trùng đầu mút line → 0 match', () => {
    expect(run('Đường tròn ngoại tiếp tam giác ABE cắt AC tại A')).toEqual([]);
  });

  it('shorthand PAREN "(ABC)" + "điểm thứ 2 là" (vao10:14)', () => {
    const it = run('Đường tròn (ABC) cắt OA tại điểm thứ 2 là I').flatMap((m) => m.intents) as any[];
    expect(it.find((i) => i.op === 'draw-circle')).toMatchObject({ name: 'wABC', spec: 'through3', points: ['A', 'B', 'C'] });
    const k = it.find((i) => i.op === 'add-point');
    expect(k.name).toBe('I');
    expect(k.constraint).toEqual({ kind: 'secondIntersection', line: 'OA', circle: 'wABC', other: 'A' });
  });

  it('set-notation "(BMC) ∩ AC = {C, N}" (C40) → wBMC + N = second(AC, wBMC, C)', () => {
    const it = run('(BMC) ∩ AC = {C, N}').flatMap((m) => m.intents) as any[];
    expect(it.find((i) => i.op === 'draw-circle')).toMatchObject({ name: 'wBMC', spec: 'through3', points: ['B', 'M', 'C'] });
    const k = it.find((i) => i.op === 'add-point');
    expect(k.name).toBe('N');
    expect(k.constraint).toEqual({ kind: 'secondIntersection', line: 'AC', circle: 'wBMC', other: 'C' });
  });

  it('set-notation fail-safe: điểm chung phải nằm trên line (else bỏ)', () => {
    // {D, N}: D KHÔNG nằm trên line AC → không xác định điểm chung → bỏ qua.
    expect(run('(BMC) ∩ AC = {D, N}')).toEqual([]);
  });
});
