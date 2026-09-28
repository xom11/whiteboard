import { segmentClauses } from '../../deterministic/coverage';
import { namedRayLinesRule } from '../namedRayLines';
import { midpointConditionRule } from '../midpointCondition';
import { pointOnNamedSideRule } from '../pointOnNamedSide';
import { pointOnSegmentNoteRule } from '../pointOnSegmentNote';
import { parallelsThroughCutRule } from '../parallelsThroughCut';
import type { LanguageRule } from '../_types';

const run = (r: LanguageRule, de: string) => r.match({ problem: de, clauses: segmentClauses(de) }).flatMap((m) => m.intents);

// Hình đo toạ độ ở __tests__/lop8-2026-09.e2e.test.ts; đây khoá các ca PHẢI bỏ qua.
describe('rule lớp 8 — bỏ qua khi không chắc', () => {
  it('namedRayLines: tia chưa khai báo ⊥/∥ → không giao điểm', () => {
    expect(run(namedRayLinesRule, 'Cho góc xOy. Tia Ax và By cắt nhau tại K.')).toEqual([]);
  });
  it('midpointCondition: điểm mới không phải đầu mút của đoạn', () => {
    expect(run(midpointConditionRule, 'Cho tam giác ABC. Lấy điểm N sao cho I là trung điểm của AB.')).toEqual([]);
  });
  it('pointOnNamedSide: tam giác không nêu đỉnh vuông → không biết cạnh huyền', () => {
    expect(run(pointOnNamedSideRule, 'Cho tam giác ABC. Lấy điểm M trên cạnh huyền.')).toEqual([]);
  });
  it('pointOnSegmentNote: "(E ∈ AB)" chú thích đầu mút đoạn vừa kẻ → không đặt E tự do', () => {
    expect(run(pointOnSegmentNoteRule, 'Cho tam giác ABC. Kẻ DE ⊥ AB (E ∈ AB).')).toEqual([]);
  });
  it('parallelsThroughCut: đường ∥ qua điểm nằm trên chính đường tham chiếu → bỏ', () => {
    expect(run(parallelsThroughCutRule, 'Qua A kẻ các đường thẳng song song với AB và AC, cắt AC và AB lần lượt tại F và E.')).toEqual([]);
  });
});
