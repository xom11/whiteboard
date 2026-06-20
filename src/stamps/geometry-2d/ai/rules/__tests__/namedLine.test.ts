import { namedLineRule } from '../namedLine';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return namedLineRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

function prefilterHits(problem: string) {
  return namedLineRule.patterns.some((re) => re.test(problem));
}

describe('namedLineRule', () => {
  // vao10:123/248 — "Vẽ đường thẳng d ⊥ OA tại A" → line d perpThrough(A, OA).
  it('"Vẽ đường thẳng d ⊥ OA tại A" → line d perpThrough(A,OA)', () => {
    const all = intents('Cho (O;R) và điểm A ngoài. Vẽ đường thẳng d ⊥ OA tại A.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'd', kind: 'perpThrough', through: 'A', to: 'OA' });
  });

  // OCR dính "d ⊥OA" (không space sau ⊥) — vao10:123 thật.
  it('"Vẽ đường thẳng d ⊥OA tại A" (OCR dính ⊥) → line d', () => {
    const all = intents('Cho (O;R). Vẽ đường thẳng d ⊥OA tại A.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'd', kind: 'perpThrough', through: 'A', to: 'OA' });
  });

  it('"Cho đường thẳng d vuông góc với BC tại H" → line d perpThrough(H,BC)', () => {
    const all = intents('Cho tam giác ABC. Cho đường thẳng d vuông góc với BC tại H.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'd', kind: 'perpThrough', through: 'H', to: 'BC' });
  });

  // vao10:46 — verb "Cho" đứng XA, ngăn bởi "ba điểm A,B,C…"; khai báo "và một
  // đường thẳng d ⊥ AC tại A" KHÔNG có verb liền trước (DECL: và|một optional).
  it('"… và một đường thẳng d vuông góc với AC tại A" → line d perpThrough(A,AC)', () => {
    const all = intents('Cho ba điểm A, B, C trên một đường thẳng và một đường thẳng d vuông góc với AC tại A.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'd', kind: 'perpThrough', through: 'A', to: 'AC' });
  });

  it('"Vẽ đường thẳng a // BC qua A" → line a parallelThrough(A,BC)', () => {
    const all = intents('Cho tam giác ABC. Vẽ đường thẳng a // BC qua A.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'a', kind: 'parallelThrough', through: 'A', to: 'BC' });
  });

  it('"Qua A vẽ đường thẳng d song song với BC" → line d parallelThrough(A,BC)', () => {
    const all = intents('Cho tam giác ABC. Qua A vẽ đường thẳng d song song với BC.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'd', kind: 'parallelThrough', through: 'A', to: 'BC' });
  });

  it('"đường thẳng d đi qua A và B" → line d lineThrough([A,B])', () => {
    const all = intents('Cho hai điểm A, B. Vẽ đường thẳng d đi qua A và B.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'd', kind: 'lineThrough', points: ['A', 'B'] });
  });

  // httcd:245 — "Một đường thẳng d ... cắt (O) tại 2 điểm A và B" → d=lineThrough([A,B]).
  it('"Một đường thẳng d không qua O cắt đường tròn (O) tại 2 điểm A và B" → d lineThrough([A,B])', () => {
    const all = intents('Cho (O;R). Một đường thẳng d không qua O cắt đường tròn (O) tại 2 điểm A và B.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'd', kind: 'lineThrough', points: ['A', 'B'] });
  });

  it('token chữ thường KHÔNG nuốt từ Việt: "đường thẳng vuông góc" → KHÔNG match', () => {
    // "vuông" bắt đầu bằng 'v' (chữ thường) nhưng theo sau là 'u' (chữ) → (?!\p{L}) chặn.
    expect(intents('Vẽ đường thẳng vuông góc với BC tại H')).toEqual([]);
  });

  // FREE_DECL — "Cho đường thẳng d" KHÔNG ràng buộc NHƯNG "d" được tham chiếu sau
  // (perpFoot/onSegment/cắt) → dựng d = lineThrough qua 2 điểm TỰ DO (vao10:93).
  it('"Cho đường thẳng d" + tham chiếu sau ("⊥ d", "thuộc d") → d lineThrough 2 free point', () => {
    const all = intents(
      'Cho đường thẳng d và đường tròn (O;R) không có điểm chung. Hạ OH ⊥ d tại H. Điểm M thuộc d.',
    );
    // 2 free point + lineThrough qua chúng.
    const free = all.filter((i) => i.op === 'add-point' && i.constraint?.kind === 'free');
    expect(free.length).toBe(2);
    const line = all.find((i) => i.op === 'draw-line' && i.name === 'd');
    expect(line).toMatchObject({ op: 'draw-line', name: 'd', kind: 'lineThrough' });
    expect(line.points.length).toBe(2);
    // 2 điểm của line = 2 free point vừa tạo.
    expect(line.points.sort()).toEqual(free.map((f) => f.name).sort());
  });

  it('"Vẽ một đường thẳng d" (có verb + "một") + "trên d lấy M" → d lineThrough free', () => {
    const all = intents('Cho (O). Vẽ một đường thẳng d. Trên d lấy điểm M.');
    expect(all.some((i) => i.op === 'draw-line' && i.name === 'd' && i.kind === 'lineThrough')).toBe(true);
  });

  it('đường thẳng d TRƠ KHÔNG được tham chiếu sau → KHÔNG match (tránh đường thừa)', () => {
    expect(intents('Cho đường thẳng d và đường tròn (O;R).')).toEqual([]);
  });

  it('FREE_DECL KHÔNG nuốt dạng có ràng buộc (⊥/∥/qua) — PERP thắng', () => {
    // "Vẽ đường thẳng d ⊥ OA tại A" phải ra perpThrough, KHÔNG ra lineThrough-free.
    const all = intents('Cho (O;R) và A. Vẽ đường thẳng d ⊥ OA tại A. Trên d lấy M.');
    expect(all.some((i) => i.kind === 'perpThrough' && i.name === 'd')).toBe(true);
    expect(all.some((i) => i.kind === 'lineThrough' && i.name === 'd')).toBe(false);
  });

  it('PREFILTER khớp dạng có "đường thẳng <chữ thường>"', () => {
    expect(prefilterHits('Vẽ đường thẳng d ⊥ OA tại A.')).toBe(true);
    expect(prefilterHits('Qua A vẽ đường thẳng d song song BC.')).toBe(true);
  });
});
