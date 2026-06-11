import { onSegmentPointRule } from '../onSegmentPoint';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return onSegmentPointRule.match({ problem, clauses: segmentClauses(problem) });
}

function intents(problem: string) {
  return run(problem).flatMap((m) => m.intents as any[]);
}

describe('onSegmentPointRule', () => {
  it('"Trên cạnh AC lấy điểm M" → M onSegment AC', () => {
    expect(intents('Cho tam giác ABC. Trên cạnh AC lấy điểm M')).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'onSegment', of: 'AC' },
    });
  });

  it('"điểm E thuộc cạnh BC" → E onSegment BC', () => {
    expect(intents('Cho hình vuông ABCD, điểm E thuộc cạnh BC')).toContainEqual({
      op: 'add-point',
      name: 'E',
      constraint: { kind: 'onSegment', of: 'BC' },
    });
  });

  it('"D nằm giữa A và B" → D onSegment AB', () => {
    expect(intents('Cho tam giác ABC và một điểm D nằm giữa A và B')).toContainEqual({
      op: 'add-point',
      name: 'D',
      constraint: { kind: 'onSegment', of: 'AB' },
    });
  });

  it('"Trên bán kính OC lấy điểm B" → B onSegment OC', () => {
    expect(intents('Trên bán kính OC lấy điểm B tùy ý')).toContainEqual({
      op: 'add-point',
      name: 'B',
      constraint: { kind: 'onSegment', of: 'OC' },
    });
  });

  it('không dựng nếu tên điểm trùng đầu mút segment', () => {
    expect(intents('Trên cạnh AB lấy điểm A')).toEqual([]);
  });

  it('không nhận điểm thuộc đường tròn/cung', () => {
    expect(intents('Lấy điểm M thuộc nửa đường tròn (O)')).toEqual([]);
  });

  it('metric ratio "sao cho AD = 2DB" vẫn bỏ qua để escalate an toàn', () => {
    expect(intents('Trên cạnh AB lấy điểm D sao cho AD = 2DB')).toEqual([]);
  });
}

describe('onSegmentPoint — điểm di chuyển/di động trên cạnh', () => {
  it('Bài 79: "Điểm P di chuyển trên cạnh AC" → P onSegment AC', () => {
    const i = intents('Điểm P di chuyển trên cạnh AC')[0];
    expect(i.name).toBe('P');
    expect(i.constraint.kind).toBe('onSegment');
    expect(i.constraint.of).toBe('AC');
  });
  it('"P di động trên đoạn BC" → P onSegment BC', () => {
    expect(intents('P di động trên đoạn BC')[0].constraint.of).toBe('BC');
  });
});

describe('onSegmentPoint — "dây" + "là điểm thuộc"', () => {
  const run = (p: string) => onSegmentPointRule.match({ problem: p, clauses: segmentClauses(p) }).flatMap((m) => m.intents);
  it('"Gọi K là điểm thuộc dây AD" → K onSegment AD', () => {
    const i = run('Gọi K là điểm thuộc dây AD')[0] as any;
    expect(i.name).toBe('K');
    expect(i.constraint.kind).toBe('onSegment');
    expect(i.constraint.of).toBe("AD");
  });
});
