import { segmentClauses, computeCoverage } from '../coverage';

describe('segmentClauses', () => {
  it('tách theo dấu chấm/phẩy/; và đánh dấu hasGeometry', () => {
    const cls = segmentClauses('Cho tam giác ABC. Gọi M là trung điểm BC. Hôm nay trời đẹp');
    expect(cls.length).toBe(3);
    expect(cls[0].hasGeometry).toBe(true);
    expect(cls[1].hasGeometry).toBe(true);
    expect(cls[2].hasGeometry).toBe(false);
  });

  // Issue #46 nhóm A: clause mà "⊥" là tín hiệu hình học DUY NHẤT vẫn
  // hasGeometry=true (tương đương phrasing dùng chữ "vuông góc").
  it('clause chỉ có "⊥" → hasGeometry=true (≡ "vuông góc")', () => {
    const sym = segmentClauses('Cho tam giác ABC. Vẽ AH ⊥ BC tại H');
    const word = segmentClauses('Cho tam giác ABC. Vẽ AH vuông góc BC tại H');
    // clause perpendicular (index 1) phải được đánh dấu hình học ở CẢ 2 phrasing.
    expect(sym[1].hasGeometry).toBe(true);
    expect(word[1].hasGeometry).toBe(true);
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
