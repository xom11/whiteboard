// Ca KHÔNG được dựng (thà thiếu còn hơn sai) cho các rule mới đợt 2 lớp 7.
import { segmentClauses } from '../../deterministic/coverage';
import { pointNamedOnSegmentRule } from '../pointNamedOnSegment';
import { twoPointsOneSideRule } from '../twoPointsOneSide';
import { twoThroughLinesMeetRule } from '../twoThroughLinesMeet';
import { perpFeetFromTwoRule } from '../perpFeetFromTwo';
import type { LanguageRule } from '../_types';

const run = (r: LanguageRule, de: string) => r.match({ problem: de, clauses: segmentClauses(de) }).flatMap((m) => m.intents);

describe('rule lớp 7 đợt 2 — bỏ qua khi không chắc', () => {
  it.each<[string, LanguageRule, string]>([
    ['pointNamedOnSegment: có "sao cho"', pointNamedOnSegmentRule, 'Cho tam giác ABC. Gọi M là điểm trên cạnh BC sao cho BM = 2MC.'],
    ['pointNamedOnSegment: trên tia', pointNamedOnSegmentRule, 'Cho tam giác ABC. Gọi M là điểm tùy ý trên tia BC.'],
    ['twoPointsOneSide: đo không từ đầu cạnh', twoPointsOneSideRule, 'Cho tam giác ABC. Trên cạnh BC lấy hai điểm D và E sao cho AD = BA và CE = CA.'],
    ['twoPointsOneSide: vế kia chứa điểm mới', twoPointsOneSideRule, 'Cho tam giác ABC. Trên cạnh BC lấy hai điểm D và E sao cho BD = DE và CE = CA.'],
    ['twoPointsOneSide: hai điều kiện cùng một điểm', twoPointsOneSideRule, 'Cho tam giác ABC. Trên cạnh BC lấy hai điểm D và E sao cho BD = BA và CD = CA.'],
    ['twoThroughLinesMeet: không nói cắt nhau', twoThroughLinesMeetRule, 'Cho tam giác ABC. Qua A kẻ đường thẳng song song với BC, qua C kẻ đường thẳng song song với AB.'],
    ['twoThroughLinesMeet: cùng song song một đoạn', twoThroughLinesMeetRule, 'Cho tam giác ABC. Qua A kẻ đường thẳng song song với BC, qua D kẻ đường thẳng song song với BC, hai đường thẳng này cắt nhau tại E.'],
    ['perpFeetFromTwo: chân trùng gốc', perpFeetFromTwoRule, 'Cho tam giác ABC. Gọi B, K lần lượt là chân các đường vuông góc kẻ từ B, C xuống AD.'],
  ])('%s', (_ly, rule, de) => {
    expect(run(rule, de)).toEqual([]);
  });
});
