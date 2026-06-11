import { diameterEndpointRule } from '../diameterEndpoint';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => diameterEndpointRule.match({ problem: p, clauses: segmentClauses(p) });

describe('diameterEndpointRule', () => {
  it('"Gọi AD là đường kính của (O)" → D = reflectPoint(A, O)', () => {
    const c = (run('Gọi AD là đường kính của (O)')[0].intents[0] as any);
    expect(c.name).toBe('D');
    expect(c.constraint).toEqual({ kind: 'reflectPoint', of: 'A', through: 'O' });
  });
  it('"BD là đường kính đường tròn tâm O"', () => {
    const c = (run('BD là đường kính đường tròn tâm O')[0].intents[0] as any);
    expect(c.constraint).toEqual({ kind: 'reflectPoint', of: 'B', through: 'O' });
  });

  // Dạng ĐỘNG TỪ (vao10): "kẻ/vẽ đường kính AD" — tâm suy từ đề, đầu mút đầu
  // phải là điểm ĐÃ nêu trước đó (đỉnh tam giác…), đầu sau = điểm mới.
  it('"…nội tiếp (O), kẻ đường kính AD cắt BC tại H" → D = reflectPoint(A, O)', () => {
    const m = run('Cho tam giác ABC đều nội tiếp (O) kẻ đường kính AD cắt BC tại H');
    const c = (m[0].intents[0] as any);
    expect(c.name).toBe('D');
    expect(c.constraint).toEqual({ kind: 'reflectPoint', of: 'A', through: 'O' });
  });

  it('"vẽ đường kính AK" với "(O;R)" → K = reflectPoint(A, O)', () => {
    const m = run('Cho tam giác ABC nội tiếp đường tròn (O;R). Gọi I là trung điểm BC, vẽ đường kính AK');
    const c = (m[0].intents[0] as any);
    expect(c.name).toBe('K');
    expect(c.constraint).toEqual({ kind: 'reflectPoint', of: 'A', through: 'O' });
  });

  it('"Kẻ đường kính CC\'" → C\' = reflectPoint(C, O) (đầu mút prime)', () => {
    const m = run("Cho tam giác ABC nội tiếp (O). Kẻ đường kính CC'");
    const c = (m[0].intents[0] as any);
    expect(c.name).toBe("C'");
    expect(c.constraint).toEqual({ kind: 'reflectPoint', of: 'C', through: 'O' });
  });

  it('KHÔNG khớp khi đầu mút đầu chưa từng xuất hiện ("Qua I kẻ đường kính MN")', () => {
    const m = run('Cho đường tròn (O) và điểm I. Qua I kẻ đường kính MN');
    expect(m.flatMap((x) => x.intents).some((i: any) => i.name === 'N')).toBe(false);
  });

  it('KHÔNG double-emit với dạng "là đường kính" cũ', () => {
    const m = run('Cho tam giác ABC nội tiếp (O). Gọi AD là đường kính của (O)');
    const ds = m.flatMap((x) => x.intents).filter((i: any) => i.name === 'D');
    expect(ds).toHaveLength(1);
  });
});
