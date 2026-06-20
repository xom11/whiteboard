import { circleDiameterRule } from '../circleDiameter';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return circleDiameterRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

function matches(problem: string) {
  return circleDiameterRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('circleDiameterRule', () => {
  // vao10: tâm BARE không ngoặc — "nửa đường tròn O đường kính AB".
  it('"Cho nửa đường tròn O đường kính AB" → circle O_c diameter AB', () => {
    const all = intents('Cho nửa đường tròn O đường kính AB.');
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'O_c',
      spec: 'diameter',
      endpoints: ['A', 'B'],
    });
    expect(all).toContainEqual({ op: 'add-point', name: 'O', constraint: { kind: 'midpoint', of: 'AB' } });
  });

  it('"Cho đường tròn (O) đường kính AB" → endpoints + center midpoint + diameter circle', () => {
    const all = intents('Cho đường tròn (O) đường kính AB cố định.');
    expect(all).toEqual([
      { op: 'add-point', name: 'A', constraint: { kind: 'free' } },
      { op: 'add-point', name: 'B', constraint: { kind: 'free' } },
      { op: 'add-point', name: 'O', constraint: { kind: 'midpoint', of: 'AB' } },
      { op: 'connect', from: 'A', to: 'B', style: 'segment' },
      { op: 'draw-circle', name: 'O_c', spec: 'diameter', endpoints: ['A', 'B'] },
    ]);
  });

  // mohinh:26 — "tâm (O)": tâm + tên trong ngoặc (KHÁC "tâm O" bare / "(O)" liền).
  it('"Cho đường tròn tâm (O), đường kính AB=2R" → A,B free + O midpoint + circle', () => {
    const all = intents('Cho đường tròn tâm (O), đường kính AB=2R.');
    expect(all).toContainEqual({ op: 'add-point', name: 'O', constraint: { kind: 'midpoint', of: 'AB' } });
    expect(all).toContainEqual({ op: 'draw-circle', name: 'O_c', spec: 'diameter', endpoints: ['A', 'B'] });
  });

  it('"Cho (O;R) đường kính AB" compact notation', () => {
    const all = intents('Cho (O;R) đường kính AB cố định.');
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'O_c',
      spec: 'diameter',
      endpoints: ['A', 'B'],
    });
    expect(all).toContainEqual({ op: 'add-point', name: 'O', constraint: { kind: 'midpoint', of: 'AB' } });
  });

  // vao10: "(O,R) CÓ đường kính BC" — phẩy thay ';' + chữ "có" xen giữa.
  it('"Cho (O,R) có đường kính BC" → circle O_c diameter BC', () => {
    const all = intents('Cho (O,R) có đường kính BC.');
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'O_c',
      spec: 'diameter',
      endpoints: ['B', 'C'],
    });
    expect(all).toContainEqual({ op: 'add-point', name: 'O', constraint: { kind: 'midpoint', of: 'BC' } });
  });

  it('compact "(O; R)" là MỘT clause (mask ";" trong ngoặc) và được claim', () => {
    const m = matches('Cho đường tròn (O; R) đường kính AB.');
    expect(m).toHaveLength(1);
    expect(m[0].clauseIds).toEqual([0]);
  });

  it('"Cho nửa đường tròn (O) đường kính AB" uses the support circle', () => {
    const all = intents('Cho nửa đường tròn (O) đường kính AB.');
    expect(all).toContainEqual({
      op: 'draw-circle',
      name: 'O_c',
      spec: 'diameter',
      endpoints: ['A', 'B'],
    });
  });

  it('fail-safe: thiếu tâm → không claim', () => {
    expect(intents('Cho đường tròn đường kính AB.')).toEqual([]);
  });

  it('fail-safe: tâm trùng đầu mút → không claim', () => {
    expect(intents('Cho đường tròn (A) đường kính AB.')).toEqual([]);
  });

  it('guard: "hai đường kính AB và CD vuông góc" → bỏ (perpDiameters sở hữu)', () => {
    expect(
      intents(
        'Cho đường tròn (O) bán kính R có hai đường kính AB và CD vuông góc với nhau.',
      ),
    ).toEqual([]);
  });

  // vao10:147/149/235 — tâm TRẦN (không ngoặc, không "đường tròn"): "Cho O đường kính AB".
  it('"Cho O đường kính AB và dây CD…" → full construction (tâm trần)', () => {
    const all = intents('Cho O đường kính AB và dây CD vuông góc với AB tại F.');
    expect(all).toEqual([
      { op: 'add-point', name: 'A', constraint: { kind: 'free' } },
      { op: 'add-point', name: 'B', constraint: { kind: 'free' } },
      { op: 'add-point', name: 'O', constraint: { kind: 'midpoint', of: 'AB' } },
      { op: 'connect', from: 'A', to: 'B', style: 'segment' },
      { op: 'draw-circle', name: 'O_c', spec: 'diameter', endpoints: ['A', 'B'] },
    ]);
  });

  it('"Cho O đường kính AB =2R" → tâm trần + "=2R" xen giữa OK', () => {
    const all = intents('Cho O đường kính AB =2R.');
    expect(all).toContainEqual({ op: 'add-point', name: 'O', constraint: { kind: 'midpoint', of: 'AB' } });
    expect(all).toContainEqual({ op: 'draw-circle', name: 'O_c', spec: 'diameter', endpoints: ['A', 'B'] });
  });

  it('tâm trần: KHÔNG double-claim với dạng "(O)" liền (dedup)', () => {
    expect(matches('Cho O đường kính AB.')).toHaveLength(1);
  });

  it('guard tâm trần: "Cho ABC ... đường kính BC" (cặp đỉnh, không tâm đơn) → KHÔNG match', () => {
    expect(intents('Cho ABC nội tiếp đường kính BC.')).toEqual([]);
  });
});
