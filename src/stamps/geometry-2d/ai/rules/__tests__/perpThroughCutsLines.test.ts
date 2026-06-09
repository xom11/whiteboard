// TDD: rule perpThroughCutsLines — "Qua B kẻ đường thẳng vuông góc với DE,
// đường thẳng này cắt các đường thẳng DE và DC theo thứ tự ở H và K".
import { perpThroughCutsLinesRule } from '../perpThroughCutsLines';
import { segmentClauses } from '../../deterministic/coverage';

function ctx(problem: string) {
  return { problem, clauses: segmentClauses(problem) };
}

describe('perpThroughCutsLinesRule', () => {
  it('Bài 22: perp qua B ⊥ DE cắt DE và DC ở H và K', () => {
    const p =
      'Qua B kẻ đường thẳng vuông góc với DE, đường thẳng này cắt các đường thẳng DE và DC theo thứ tự ở H và K.';
    const matches = perpThroughCutsLinesRule.match(ctx(p));
    const intents = matches.flatMap((m) => m.intents);
    // perp line prpB
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'perpThrough', through: 'B', to: 'DE', name: 'prpB' }),
    );
    // H = giao prpB ∩ DE
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'H', constraint: { kind: 'intersection', of: ['prpB', 'DE'] } }),
    );
    // K = giao prpB ∩ DC
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'K', constraint: { kind: 'intersection', of: ['prpB', 'DC'] } }),
    );
  });

  it('không match khi thiếu vế "cắt ... ở X và Y"', () => {
    const p = 'Qua B kẻ đường thẳng vuông góc với DE.';
    expect(perpThroughCutsLinesRule.match(ctx(p)).flatMap((m) => m.intents)).toHaveLength(0);
  });

  it('song song: Qua A kẻ đường thẳng song song BC cắt AB và AC ở M và N', () => {
    const p = 'Qua A kẻ đường thẳng song song với BC, cắt AB và AC ở M và N.';
    const intents = perpThroughCutsLinesRule.match(ctx(p)).flatMap((m) => m.intents);
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'parallelThrough', through: 'A', to: 'BC', name: 'parA' }),
    );
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'M', constraint: { kind: 'intersection', of: ['parA', 'AB'] } }),
    );
  });
});
