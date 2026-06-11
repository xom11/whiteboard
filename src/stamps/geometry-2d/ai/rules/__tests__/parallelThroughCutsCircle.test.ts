// TDD: rule parallelThroughCutsCircle — đường thẳng qua P song song với <ref> cắt
// đường tròn (O) (và optionally 1 đường khác) tại điểm đặt tên, kể cả dạng phân
// phối 2 điểm "qua C và B ... cắt (O) lần lượt tại E và F".
import { segmentClauses } from '../../deterministic/coverage';
import { normalizeProblemText } from '../../deterministic/normalizeText';
import { parallelThroughCutsCircleRule } from '../parallelThroughCutsCircle';

function ctxOf(text: string) {
  const problem = normalizeProblemText(text);
  const clauses = segmentClauses(problem).filter((c) => c.hasGeometry);
  return { problem, clauses };
}

describe('parallelThroughCutsCircleRule', () => {
  it('Bài 65: phân phối "qua C và B ... cắt (O) lần lượt tại E và F"', () => {
    const p =
      'Cho tam giác ABC nhọn, không cân nội tiếp đường tròn (O). ' +
      'Các đường thẳng qua hai điểm C và B song song với đường thẳng AO cắt đường tròn (O) lần lượt tại E và F (E khác C, F khác B).';
    const matches = parallelThroughCutsCircleRule.match(ctxOf(p));
    const intents = matches.flatMap((m) => m.intents);

    // C → parC + E = secondIntersection(parC, O), other=C
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'parallelThrough', through: 'C', to: 'AO', name: 'parC' }),
    );
    expect(intents).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'E',
        constraint: { kind: 'secondIntersection', line: 'parC', circle: 'O', other: 'C' },
      }),
    );
    // B → parB + F = secondIntersection(parB, O), other=B
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'parallelThrough', through: 'B', to: 'AO', name: 'parB' }),
    );
    expect(intents).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'F',
        constraint: { kind: 'secondIntersection', line: 'parB', circle: 'O', other: 'B' },
      }),
    );
  });

  it('Bài 111: "Qua B kẻ đt d song song CD. Đt d cắt AC tại E, cắt (O) tại F"', () => {
    const p =
      'Cho tam giác ABC vuông tại A nội tiếp đường tròn tâm O. ' +
      'Qua B kẻ đường thẳng d song song với CD. ' +
      'Đường thẳng d cắt đường thẳng AC tại E, cắt đường tròn (O) tại F (F khác B).';
    const matches = parallelThroughCutsCircleRule.match(ctxOf(p));
    const intents = matches.flatMap((m) => m.intents);

    // draw-line parB (parallelThrough B → CD)
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'parallelThrough', through: 'B', to: 'CD', name: 'parB' }),
    );
    // E = intersection(parB, AC)
    expect(intents).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'E',
        constraint: { kind: 'intersection', of: ['parB', 'AC'] },
      }),
    );
    // F = secondIntersection(parB, O), other = B
    expect(intents).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'F',
        constraint: { kind: 'secondIntersection', line: 'parB', circle: 'O', other: 'B' },
      }),
    );
  });

  it('prefilter bắt cả dạng phân phối 1-câu LẪN dạng đường đặt tên cross-clause', () => {
    // Engine bỏ qua match() nếu prefilter trượt → cross-clause (Bài 111) có '.'
    // chen giữa "song song" và "cắt" PHẢI vẫn qua prefilter.
    const re = parallelThroughCutsCircleRule.patterns[0];
    expect(re.test('Các đường thẳng qua hai điểm C và B song song với đường thẳng AO cắt đường tròn (O) lần lượt tại E và F.')).toBe(true);
    expect(re.test('Qua B kẻ đường thẳng d song song với CD. Đường thẳng d cắt đường thẳng AC tại E, cắt đường tròn (O) tại F.')).toBe(true);
    expect(re.test('Cho tam giác ABC. Kẻ AH vuông góc BC tại H.')).toBe(false);
  });

  it('không match khi không có đường tròn nào', () => {
    const p = 'Cho tam giác ABC. Qua C song song với AO cắt đường thẳng AB tại E.';
    const intents = parallelThroughCutsCircleRule.match(ctxOf(p)).flatMap((m) => m.intents);
    // không có "(O)" duy nhất → không emit secondIntersection
    expect(intents.some((i) => (i as { constraint?: { kind?: string } }).constraint?.kind === 'secondIntersection')).toBe(
      false,
    );
  });
});
