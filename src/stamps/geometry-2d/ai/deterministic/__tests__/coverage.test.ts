import { segmentClauses, computeCoverage } from '../coverage';

describe('segmentClauses', () => {
  it('tách theo dấu chấm/phẩy/; và đánh dấu hasGeometry', () => {
    const cls = segmentClauses('Cho tam giác ABC. Gọi M là trung điểm BC. Hôm nay trời đẹp');
    expect(cls.length).toBe(3);
    expect(cls[0].hasGeometry).toBe(true);
    expect(cls[1].hasGeometry).toBe(true);
    expect(cls[2].hasGeometry).toBe(false);
  });
});

describe('computeCoverage', () => {
  it('complete khi mọi clause hình học được match claim', () => {
    const cls = segmentClauses('Cho tam giác ABC. Gọi M là trung điểm BC');
    const matches = [
      { clauseIds: [0] },
      { clauseIds: [1] },
    ];
    const cov = computeCoverage(cls, matches);
    expect(cov.complete).toBe(true);
    expect(cov.uncovered.length).toBe(0);
  });

  it('incomplete khi còn clause hình học chưa match', () => {
    const cls = segmentClauses('Cho tam giác ABC. Vẽ đường tròn ngoại tiếp');
    const matches = [{ clauseIds: [0] }];
    const cov = computeCoverage(cls, matches);
    expect(cov.complete).toBe(false);
    expect(cov.uncovered.length).toBe(1);
  });
});
