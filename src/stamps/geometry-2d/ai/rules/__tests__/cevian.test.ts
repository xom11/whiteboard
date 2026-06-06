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

  it('2 cevian KHÁC loại cùng 1 clause, tên chân KHÁC → emit ĐỦ 2', () => {
    // "đường cao AH và trung tuyến BK" — foot H≠K, không xung đột → cả 2 emit.
    const m = run('Cho tam giác ABC. Kẻ đường cao AH và trung tuyến BK.');
    const alt = findByKind(m, 'perpFoot');
    const med = findByKind(m, 'midpoint');
    expect(alt).toBeTruthy();
    expect(med).toBeTruthy();
    expect((alt!.intents[0] as any).name).toBe('H');
    expect((alt!.intents[0] as any).constraint).toEqual({
      kind: 'perpFoot',
      from: 'A',
      onLine: 'BC',
    });
    expect((med!.intents[0] as any).name).toBe('K');
    expect((med!.intents[0] as any).constraint).toEqual({ kind: 'midpoint', of: 'AC' });
  });

  it('2 cevian CÙNG loại cùng 1 clause → emit ĐỦ 2 (matchAll, không drop)', () => {
    // "đường cao AH và đường cao BK" — 2 perpFoot khác chân → cả 2 phải emit.
    const m = run('Cho tam giác ABC. Kẻ đường cao AH và đường cao BK.');
    const perpFeet = m
      .map((rm) => rm.intents[0] as any)
      .filter((p) => p.op === 'add-point' && p.constraint.kind === 'perpFoot')
      .map((p) => p.name)
      .sort();
    expect(perpFeet).toEqual(['H', 'K']);
  });

  it('2 cevian KHÁC nhau ĐẶT CÙNG tên chân → XUNG ĐỘT → escalate (rỗng)', () => {
    // "đường cao AH" (foot=H) + "trung tuyến BH" (foot=H, ràng buộc midpoint AC)
    // mâu thuẫn cùng tên H → KHÔNG claim cả 2 (escalate), tránh mis-render.
    const m = run('Cho tam giác ABC. Kẻ đường cao AH và trung tuyến BH.');
    expect(m).toEqual([]);
  });

  it('foot trùng đỉnh tam giác ("đường cao AB") → SKIP (escalate)', () => {
    const m = run('Cho tam giác ABC. Kẻ đường cao AB.');
    expect(m).toEqual([]);
  });

  it('trung tuyến AC (foot=C trùng đỉnh) → SKIP (escalate)', () => {
    const m = run('Cho tam giác ABC. Vẽ trung tuyến AC.');
    expect(m).toEqual([]);
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

  // ── Mức 2: "phân giác trong AD" (từ "trong" chen) + fail-safe "ngoài" ──

  it('"Vẽ phân giác trong AD" → angleBisectorFoot from A + connect A-D', () => {
    const m = run('Cho tam giác ABC. Vẽ phân giác trong AD.');
    const match = findByKind(m, 'angleBisectorFoot');
    expect(match).toBeTruthy();
    const [pt, con] = match!.intents as any[];
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
    expect(con.from).toBe('A');
    expect(con.to).toBe('D');
  });

  it('"Dựng đường phân giác trong AD" → D from A', () => {
    const m = run('Cho tam giác ABC. Dựng đường phân giác trong AD.');
    const pt = findByKind(m, 'angleBisectorFoot')!.intents[0] as any;
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
  });

  it('"Kẻ tia phân giác trong BD" → D from B onLine AC', () => {
    const m = run('Cho tam giác ABC. Kẻ tia phân giác trong BD.');
    const pt = findByKind(m, 'angleBisectorFoot')!.intents[0] as any;
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'B', onLine: 'AC' });
  });

  it('"AD là phân giác trong" (suffix) → D from A', () => {
    const m = run('Cho tam giác ABC, AD là phân giác trong.');
    const pt = findByKind(m, 'angleBisectorFoot')!.intents[0] as any;
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
  });

  it('FAIL-SAFE: "phân giác ngoài AD" (external, forward) → escalate', () => {
    expect(run('Cho tam giác ABC. Vẽ phân giác ngoài AD.')).toEqual([]);
  });

  it('FAIL-SAFE: "AD là phân giác ngoài" (external, suffix) → escalate', () => {
    // Bug cũ: suffix bắt "AD ... phân giác", bỏ qua "ngoài" → nhận nhầm internal.
    expect(run('Cho tam giác ABC, AD là phân giác ngoài.')).toEqual([]);
  });
});
