import { cevianRule } from '../cevian';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return cevianRule.match({ problem, clauses: segmentClauses(problem) });
}

/** Lấy RuleMatch đầu tiên có add-point với kind cho trước. */
function findByKind(matches: ReturnType<typeof run>, kind: string) {
  return matches.find((m) =>
    m.intents.some((i) => (i as any).op === 'add-point' && (i as any).constraint.kind === kind),
  );
}

describe('cevianRule', () => {
  it('"đường cao AH" → perpFoot(from A, onLine BC) + connect A-H segment', () => {
    const m = run('Cho tam giác ABC. Kẻ đường cao AH.');
    expect(m.length).toBe(1);
    const [pt, con] = m[0].intents as any[];
    expect(pt.op).toBe('add-point');
    expect(pt.name).toBe('H');
    expect(pt.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
    expect(con.op).toBe('connect');
    expect(con.from).toBe('A');
    expect(con.to).toBe('H');
    expect(con.style).toBe('segment');
  });

  it('"AH là đường cao" (tên trước) → perpFoot H', () => {
    const m = run('Cho tam giác ABC, AH là đường cao.');
    const match = findByKind(m, 'perpFoot');
    expect(match).toBeTruthy();
    const pt = match!.intents[0] as any;
    expect(pt.name).toBe('H');
    expect(pt.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
  });

  it('"trung tuyến AM" → midpoint(of BC) + connect A-M', () => {
    const m = run('Cho tam giác ABC. Vẽ trung tuyến AM.');
    expect(m.length).toBe(1);
    const [pt, con] = m[0].intents as any[];
    expect(pt.name).toBe('M');
    expect(pt.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
    expect(con.from).toBe('A');
    expect(con.to).toBe('M');
    expect(con.style).toBe('segment');
  });

  it('"AM là trung tuyến" (tên trước) → midpoint M', () => {
    const m = run('Cho tam giác ABC, AM là trung tuyến.');
    const match = findByKind(m, 'midpoint');
    expect(match).toBeTruthy();
    const pt = match!.intents[0] as any;
    expect(pt.name).toBe('M');
    expect(pt.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
  });

  it('"đường phân giác AD" → angleBisectorFoot(from A, onLine BC) + connect A-D', () => {
    const m = run('Cho tam giác ABC. Dựng đường phân giác AD.');
    expect(m.length).toBe(1);
    const [pt, con] = m[0].intents as any[];
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
    expect(con.from).toBe('A');
    expect(con.to).toBe('D');
  });

  it('"tia phân giác BD" → angleBisectorFoot(from B, onLine AC) — cạnh đối B', () => {
    const m = run('Cho tam giác ABC. Vẽ tia phân giác BD.');
    const match = findByKind(m, 'angleBisectorFoot');
    expect(match).toBeTruthy();
    const pt = match!.intents[0] as any;
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'B', onLine: 'AC' });
  });

  it('nhiều cevian trong 1 đề → mỗi cevian 1 RuleMatch', () => {
    const m = run('Cho tam giác ABC. Kẻ đường cao AH và trung tuyến BM.');
    expect(findByKind(m, 'perpFoot')).toBeTruthy();
    const median = findByKind(m, 'midpoint');
    expect(median).toBeTruthy();
    const pt = median!.intents[0] as any;
    expect(pt.name).toBe('M');
    expect(pt.constraint).toEqual({ kind: 'midpoint', of: 'AC' });
  });

  it('không có tam giác → escalate (rỗng)', () => {
    const m = run('Vẽ đường cao AH của hình.');
    expect(m).toEqual([]);
  });

  it('apex ngoài tam giác → bỏ qua clause', () => {
    // "PQ" — P không phải đỉnh tam giác ABC → không claim.
    const m = run('Cho tam giác ABC. Kẻ đường cao PQ.');
    expect(m).toEqual([]);
  });
});
