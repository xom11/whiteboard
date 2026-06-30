// TDD: rule bisectorsMeet — điểm = GIAO của HAI tia phân giác góc.
//   "phân giác ∠XYZ và ∠UVW cắt nhau tại P" → emit 2 angleBisector (dedup với
//   angleBisectorAngle) + add-point intersection {of:[bisXYZ, bisUVW]}.
//   Phân phối nhiều cặp trong 1 clause (C24 có 4 cặp). Chấp nhận ∠ glyph,
//   "góc", và cụm 3-HOA TRẦN (OCR rớt glyph "∠").
import { bisectorsMeetRule } from '../bisectorsMeet';
import { segmentClauses } from '../../deterministic/coverage';
import { normalizeProblemText } from '../../deterministic/normalizeText';

function ctxOf(text: string) {
  const problem = normalizeProblemText(text);
  const clauses = segmentClauses(problem).filter((c) => c.hasGeometry);
  return { problem, clauses };
}

describe('bisectorsMeetRule — 1 cặp', () => {
  it('"phân giác ∠DAB và ∠ABC cắt nhau tại M"', () => {
    const p = 'Cho tứ giác ABCD, phân giác ∠DAB và ∠ABC cắt nhau tại M.';
    const intents = bisectorsMeetRule.match(ctxOf(p)).flatMap((m) => m.intents) as any[];
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'angleBisector', name: 'bisDAB', p1: 'D', vertex: 'A', p2: 'B' }),
    );
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'angleBisector', name: 'bisABC', p1: 'A', vertex: 'B', p2: 'C' }),
    );
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'M', constraint: { kind: 'intersection', of: ['bisDAB', 'bisABC'] } }),
    );
  });

  it('chấp nhận "góc" thay cho ∠', () => {
    const p = 'Phân giác góc DAB và góc ABC cắt nhau tại M.';
    const intents = bisectorsMeetRule.match(ctxOf(p)).flatMap((m) => m.intents) as any[];
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'M', constraint: { kind: 'intersection', of: ['bisDAB', 'bisABC'] } }),
    );
  });

  it('chấp nhận angle thứ hai TRẦN (OCR rớt glyph): "phân giác ∠DAB và ABC cắt nhau tại M"', () => {
    const p = 'Cho tứ giác ABCD, phân giác ∠DAB và ABC cắt nhau tại M.';
    const intents = bisectorsMeetRule.match(ctxOf(p)).flatMap((m) => m.intents) as any[];
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'angleBisector', name: 'bisABC', p1: 'A', vertex: 'B', p2: 'C' }),
    );
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'M', constraint: { kind: 'intersection', of: ['bisDAB', 'bisABC'] } }),
    );
  });
});

describe('bisectorsMeetRule — phân phối nhiều cặp (C24)', () => {
  it('4 cặp; cặp N mangled OCR bị bỏ qua (precision-first)', () => {
    const p =
      'Cho tứ giác ABCD, phân giác ∠DAB và ABC cắt nhau tại M, phân giác Z4DC và ZGCBD cắt nhau tại N, phân giác ∠BDA và ∠ADC cắt nhau tại P, phân giác ∠ABC và ∠BCD cắt nhau tại Q.';
    const intents = bisectorsMeetRule.match(ctxOf(p)).flatMap((m) => m.intents) as any[];
    // M = bisDAB ∩ bisABC
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'M', constraint: { kind: 'intersection', of: ['bisDAB', 'bisABC'] } }),
    );
    // P = bisBDA ∩ bisADC
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'P', constraint: { kind: 'intersection', of: ['bisBDA', 'bisADC'] } }),
    );
    // Q = bisABC ∩ bisBCD
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'Q', constraint: { kind: 'intersection', of: ['bisABC', 'bisBCD'] } }),
    );
    // N (Z4DC/ZGCBD mangled) → KHÔNG có điểm N
    expect(intents.find((i) => i.op === 'add-point' && i.name === 'N')).toBeUndefined();
  });
});

describe('bisectorsMeetRule — guard', () => {
  it('không match khi thiếu "cắt nhau tại"', () => {
    const p = 'phân giác ∠DAB và ∠ABC.';
    expect(bisectorsMeetRule.match(ctxOf(p)).flatMap((m) => m.intents)).toHaveLength(0);
  });

  it('không tạo điểm trùng tên đỉnh góc (P nằm trong ref) → bỏ qua', () => {
    // tên giao "A" trùng đỉnh đã dùng — fail-safe: vẫn emit bisector nhưng điểm
    // giao A sẽ bị guard intersection nếu cần; ở mức rule ta chỉ cần không crash.
    const p = 'phân giác ∠DAB và ∠ABC cắt nhau tại A.';
    const intents = bisectorsMeetRule.match(ctxOf(p)).flatMap((m) => m.intents) as any[];
    // không tạo điểm giao trùng đỉnh A
    expect(intents.find((i) => i.op === 'add-point' && i.name === 'A')).toBeUndefined();
  });
});
