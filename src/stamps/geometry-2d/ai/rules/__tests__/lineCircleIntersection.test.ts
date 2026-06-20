import { lineCircleIntersectionRule } from '../lineCircleIntersection';
import { segmentClauses } from '../../deterministic/coverage';
import { normalizeProblemText } from '../../deterministic/normalizeText';

function run(problem: string) {
  return lineCircleIntersectionRule.match({ problem, clauses: segmentClauses(problem) });
}

function ctxOf(text: string) {
  const problem = normalizeProblemText(text);
  const clauses = segmentClauses(problem).filter((c) => c.hasGeometry);
  return { problem, clauses };
}

describe('lineCircleIntersectionRule', () => {
  it('Bài 1: AD, BE, CF cắt đường tròn (O) lần lượt tại M,N,P', () => {
    const m = run(
      'Các đường cao AD, BE, CF cắt nhau tại H và cắt đường tròn (O) lần lượt tại M, N, P',
    );
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents).toEqual([
      { op: 'add-point', name: 'M', constraint: { kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A' } },
      { op: 'add-point', name: 'N', constraint: { kind: 'secondIntersection', line: 'BE', circle: 'O', other: 'B' } },
      { op: 'add-point', name: 'P', constraint: { kind: 'secondIntersection', line: 'CF', circle: 'O', other: 'C' } },
    ]);
  });

  // vao10:77 — 2 đường cắt đường tròn, "cắt nhau tại H," xen giữa: "BE,CF cắt nhau
  // tại H, cắt đường tròn (O;R) lần lượt tại M và N".
  it('DOUBLE: "BE,CF cắt nhau tại H, cắt đường tròn (O;R) lần lượt tại M và N"', () => {
    const m = run('Các đường cao BE,CF cắt nhau tại H, cắt đường tròn (O;R) lần lượt tại M và N');
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents).toContainEqual({ op: 'add-point', name: 'M', constraint: { kind: 'secondIntersection', line: 'BE', circle: 'O', other: 'B' } });
    expect(intents).toContainEqual({ op: 'add-point', name: 'N', constraint: { kind: 'secondIntersection', line: 'CF', circle: 'O', other: 'C' } });
  });

  it('single: CM cắt (O) tại N → secondIntersection line CM circle O other C', () => {
    const m = run('CM cắt (O) tại N');
    expect(m.flatMap((x) => x.intents)).toEqual([
      { op: 'add-point', name: 'N', constraint: { kind: 'secondIntersection', line: 'CM', circle: 'O', other: 'C' } },
    ]);
  });

  it('không nhận nếu điểm giao trùng đầu mút line', () => {
    expect(run('AB cắt (O) tại A')).toEqual([]);
  });

  // httcd:42 — cắt đường tròn TRẦN (không paren) ở Z: "BN cắt đường tròn ở C".
  it('"BN cắt đường tròn ở C" (circle trần) → C=2nd(BN) other B', () => {
    const intents = run('Cho đường tròn (O) đường kính AB. BN cắt đường tròn ở C').flatMap((x) => x.intents) as any[];
    expect(intents).toContainEqual({ op: 'add-point', name: 'C', constraint: { kind: 'secondIntersection', line: 'BN', circle: 'O', other: 'B' } });
  });

  // vao10:157/166 — đường tròn LÀM CHỦ NGỮ: "(O) cắt AC tại E".
  it('"(O) cắt AC tại E" (circle subject) → E=2nd(AC,O) other A', () => {
    const intents = run('Đường tròn (O) cắt AC tại E').flatMap((x) => x.intents) as any[];
    expect(intents).toContainEqual({ op: 'add-point', name: 'E', constraint: { kind: 'secondIntersection', line: 'AC', circle: 'O', other: 'A' } });
  });

  // julielltv:12 — đường tròn chủ ngữ cắt 2 đường phân phối: "(I) cắt AB,AC tại M,N".
  it('"(I) cắt AB,AC tại M,N" → M=2nd(AB,I) other A, N=2nd(AC,I) other A', () => {
    const intents = run('(I) cắt AB,AC tại M,N').flatMap((x) => x.intents) as any[];
    expect(intents).toContainEqual({ op: 'add-point', name: 'M', constraint: { kind: 'secondIntersection', line: 'AB', circle: 'I', other: 'A' } });
    expect(intents).toContainEqual({ op: 'add-point', name: 'N', constraint: { kind: 'secondIntersection', line: 'AC', circle: 'I', other: 'A' } });
  });

  // julielltv:1 — 1 đường cắt 2 circumcircle paren-3-chữ, zip; other = đỉnh ∈ line.
  it('"CM cắt (CDE),(ABC) tại điểm thứ hai là P,Q" → wCDE/wABC + P,Q', () => {
    const intents = run('CM theo thứ tự cắt (CDE),(ABC) tại điểm thứ hai là P,Q').flatMap((x) => x.intents) as any[];
    expect(intents.filter((i) => i.op === 'draw-circle').map((i) => i.points)).toEqual([['C', 'D', 'E'], ['A', 'B', 'C']]);
    expect(intents).toContainEqual({ op: 'add-point', name: 'P', constraint: { kind: 'secondIntersection', line: 'CM', circle: 'wCDE', other: 'C' } });
    expect(intents).toContainEqual({ op: 'add-point', name: 'Q', constraint: { kind: 'secondIntersection', line: 'CM', circle: 'wABC', other: 'C' } });
  });

  // vao10:174 / son123:107 — 1 đường cắt HAI đường tròn (giao 2 circle tự do).
  it('"Đường thẳng AO cắt (O), (O′) lần lượt ở C và D" → C=2nd(AO,O), D=2nd(AO,O′)', () => {
    const intents = run('Đường thẳng AO cắt (O), (O′) lần lượt ở C và D').flatMap((x) => x.intents) as any[];
    expect(intents).toContainEqual({ op: 'add-point', name: 'C', constraint: { kind: 'secondIntersection', line: 'AO', circle: 'O', other: 'A' } });
    expect(intents).toContainEqual({ op: 'add-point', name: 'D', constraint: { kind: 'secondIntersection', line: 'AO', circle: "O'", other: 'A' } });
  });

  it('"đường thẳng AO′ cắt (O) và (O′) lần lượt tại N và D" → giữ prime line AO′', () => {
    const intents = run('đường thẳng AO′ cắt (O) và (O′) lần lượt tại N và D').flatMap((x) => x.intents) as any[];
    expect(intents).toContainEqual({ op: 'add-point', name: 'N', constraint: { kind: 'secondIntersection', line: "AO'", circle: 'O', other: 'A' } });
    expect(intents).toContainEqual({ op: 'add-point', name: 'D', constraint: { kind: 'secondIntersection', line: "AO'", circle: "O'", other: 'A' } });
  });

  it('Bài 84: "AI cắt lại đường tròn (O) tại điểm thứ hai M" (cắt lại + thứ hai)', () => {
    expect(run('Đường thẳng AI cắt lại đường tròn (O) tại điểm thứ hai M').flatMap((x) => x.intents)).toEqual([
      { op: 'add-point', name: 'M', constraint: { kind: 'secondIntersection', line: 'AI', circle: 'O', other: 'A' } },
    ]);
  });

  it('Bài 88: "DM cắt đường tròn (O) tại điểm thứ hai là S" (là trước tên)', () => {
    expect(run('Đường thẳng DM cắt đường tròn (O) tại điểm thứ hai là S').flatMap((x) => x.intents)).toEqual([
      { op: 'add-point', name: 'S', constraint: { kind: 'secondIntersection', line: 'DM', circle: 'O', other: 'D' } },
    ]);
  });

  it('"FH cắt (O) tại điểm G khác F" → secondIntersection other=F (Câu 28)', () => {
    const pt = run('FH cắt (O) tại điểm G khác F').flatMap((m) => m.intents)[0] as any;
    expect(pt.constraint).toEqual({ kind: 'secondIntersection', line: 'FH', circle: 'O', other: 'F' });
  });

  it('"Tia CB cắt (O) ở điểm thứ hai D" → secondIntersection', () => {
    const pt = run('Tia CB cắt (O) ở điểm thứ hai D').flatMap((m) => m.intents)[0] as any;
    expect(pt.constraint.kind).toBe('secondIntersection');
    expect(pt.name).toBe('D');
  });

  it('"giao điểm của NQ và (O) là R khác N" → secondIntersection(NQ,O,other=N)', () => {
    const pt = run('Gọi giao điểm của NQ và (O) là R khác N').flatMap((m) => m.intents)[0] as any;
    expect(pt.constraint).toEqual({ kind: 'secondIntersection', line: 'NQ', circle: 'O', other: 'N' });
    expect(pt.name).toBe('R');
  });
}

describe('lineCircleIntersection — "cắt (O) tại hai điểm M, N" (cả 2 nhánh)', () => {
  it('M=branch0, N=branch1 intersection lineCircle', () => {
    const it = run('BD cắt (O) tại hai điểm M, N').flatMap((m) => m.intents) as any[];
    expect(it.find((i) => i.name === 'M').constraint).toEqual({ kind: 'intersection', of: ['BD', 'O'], branch: 0 });
    expect(it.find((i) => i.name === 'N').constraint).toEqual({ kind: 'intersection', of: ['BD', 'O'], branch: 1 });
  });
});

describe('lineCircleIntersection — circumcircle mô tả (không "(O)")', () => {
  // hinh9 #66: "Gọi giao điểm thứ hai của AI và đường tròn ngoại tiếp tam giác
  // ABC là điểm P khác A". circleTriangle đặt tên circumcircle = "O" (default,
  // không khai báo tâm) → secondIntersection phải tham chiếu "O".
  it('"giao điểm thứ hai của AI và đường tròn ngoại tiếp tam giác ABC là điểm P khác A"', () => {
    const ctx = ctxOf(
      'Cho tam giác ABC. Gọi giao điểm thứ hai của AI và đường tròn ngoại tiếp tam giác ABC là điểm P khác A',
    );
    const intents = lineCircleIntersectionRule.match(ctx).flatMap((m) => m.intents) as any[];
    const p = intents.find((i) => i.name === 'P');
    expect(p).toBeDefined();
    expect(p.op).toBe('add-point');
    expect(p.constraint).toEqual({ kind: 'secondIntersection', line: 'AI', circle: 'O', other: 'A' });
  });

  it('claim clause chứa "đường tròn ngoại tiếp tam giác"', () => {
    const ctx = ctxOf(
      'Cho tam giác ABC. Gọi giao điểm thứ hai của AI và đường tròn ngoại tiếp tam giác ABC là điểm P khác A',
    );
    const matches = lineCircleIntersectionRule.match(ctx);
    const target = ctx.clauses.find((c) => /giao\s*điểm\s+thứ\s+hai/u.test(c.text))!;
    const claimed = matches.some((m) => m.clauseIds.includes(target.id));
    expect(claimed).toBe(true);
  });
});
