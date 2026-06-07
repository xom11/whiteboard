import { angleBisectorAngleRule } from '../angleBisectorAngle';
import { cevianRule } from '../cevian';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return angleBisectorAngleRule.match({ problem, clauses: segmentClauses(problem) });
}

/** Lấy intent draw-line/angleBisector đầu tiên trong tất cả match. */
function findBisector(matches: ReturnType<typeof run>) {
  for (const m of matches) {
    const i = m.intents.find(
      (it) => (it as any).op === 'draw-line' && (it as any).kind === 'angleBisector',
    );
    if (i) return i as any;
  }
  return undefined;
}

describe('angleBisectorAngleRule', () => {
  // ── 3-point angle "góc XYZ": vertex = chữ GIỮA ──

  it('"Vẽ tia phân giác của góc BAC" → angleBisector {p1:B, vertex:A, p2:C}, KHÔNG add-point', () => {
    const m = run('Cho tam giác ABC. Vẽ tia phân giác của góc BAC.');
    expect(m.length).toBe(1);
    expect(m[0].intents.length).toBe(1);
    const i = m[0].intents[0] as any;
    expect(i.op).toBe('draw-line');
    expect(i.kind).toBe('angleBisector');
    expect(i.p1).toBe('B');
    expect(i.vertex).toBe('A');
    expect(i.p2).toBe('C');
    // KHÔNG tạo add-point foot, KHÔNG connect.
    expect(m[0].intents.some((x) => (x as any).op === 'add-point')).toBe(false);
    expect(m[0].intents.some((x) => (x as any).op === 'connect')).toBe(false);
  });

  it('"phân giác góc BAC" (trần) → vertex giữa A', () => {
    const i = findBisector(run('Cho tam giác ABC. Kẻ phân giác góc BAC.'));
    expect(i).toBeTruthy();
    expect([i!.p1, i!.vertex, i!.p2]).toEqual(['B', 'A', 'C']);
  });

  it('"đường phân giác của góc MNP" → vertex giữa N', () => {
    const i = findBisector(run('Cho tam giác MNP. Vẽ đường phân giác của góc MNP.'));
    expect(i).toBeTruthy();
    expect([i!.p1, i!.vertex, i!.p2]).toEqual(['M', 'N', 'P']);
  });

  it('không cần tam giác để khớp "góc XYZ" (3 đỉnh đã đủ)', () => {
    const i = findBisector(run('Vẽ tia phân giác của góc BAC.'));
    expect(i).toBeTruthy();
    expect([i!.p1, i!.vertex, i!.p2]).toEqual(['B', 'A', 'C']);
  });

  // ── 1-letter "góc A" trong tam giác → suy 2 cạnh ──

  it('"phân giác góc A" trong tam giác ABC → vertex A + 2 đỉnh còn lại (B,C)', () => {
    const i = findBisector(run('Cho tam giác ABC. Vẽ phân giác góc A.'));
    expect(i).toBeTruthy();
    expect(i!.vertex).toBe('A');
    expect([i!.p1, i!.p2].sort()).toEqual(['B', 'C']);
  });

  it('"phân giác của góc B" trong tam giác ABC → vertex B + (A,C)', () => {
    const i = findBisector(run('Cho tam giác ABC. Kẻ tia phân giác của góc B.'));
    expect(i).toBeTruthy();
    expect(i!.vertex).toBe('B');
    expect([i!.p1, i!.p2].sort()).toEqual(['A', 'C']);
  });

  // ── escalate-safe ──

  it('FAIL-SAFE: "phân giác góc A" KHÔNG có tam giác → 0 match (escalate)', () => {
    expect(run('Vẽ phân giác góc A.')).toEqual([]);
  });

  it('FAIL-SAFE: "góc XY" (chỉ 2 ký tự, không phải 3-point) → 0 match', () => {
    expect(run('Cho tam giác ABC. Vẽ phân giác góc XY.')).toEqual([]);
  });

  it('FAIL-SAFE: "phân giác góc P" (P ngoài tam giác ABC) → 0 match', () => {
    expect(run('Cho tam giác ABC. Vẽ phân giác góc P.')).toEqual([]);
  });

  it('FAIL-SAFE: không có chữ "góc" → 0 match (để cevian xử "phân giác AD")', () => {
    expect(run('Cho tam giác ABC. Vẽ phân giác AD.')).toEqual([]);
  });
});

// ── KHÔNG double-emit với cevian (cross-rule regression guard) ──
describe('angleBisectorAngle KHÔNG đụng cevian foot-named', () => {
  function cev(problem: string) {
    return cevianRule.match({ problem, clauses: segmentClauses(problem) });
  }

  it('"phân giác góc BAC": cevian KHÔNG khớp (không foot-named)', () => {
    expect(cev('Cho tam giác ABC. Vẽ tia phân giác của góc BAC.')).toEqual([]);
  });

  it('"phân giác góc A": cevian KHÔNG khớp', () => {
    expect(cev('Cho tam giác ABC. Vẽ phân giác góc A.')).toEqual([]);
  });

  it('"phân giác AD" (foot-named): angleBisectorAngle KHÔNG khớp, cevian VẪN khớp', () => {
    expect(run('Cho tam giác ABC. Vẽ phân giác AD.')).toEqual([]);
    const c = cev('Cho tam giác ABC. Vẽ phân giác AD.');
    expect(
      c.some((m) =>
        m.intents.some(
          (i) => (i as any).op === 'add-point' && (i as any).constraint.kind === 'angleBisectorFoot',
        ),
      ),
    ).toBe(true);
  });

  it('"phân giác ngoài AD" (foot-named external): angleBisectorAngle KHÔNG khớp', () => {
    expect(run('Cho tam giác ABC. Vẽ phân giác ngoài AD.')).toEqual([]);
  });
});
