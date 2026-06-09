import { runDeterministicIntents } from '../runDeterministicIntents';
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

  it('bỏ qua các mục chứng minh thuần kết luận sau phần dựng hình', () => {
    const cls = segmentClauses(
      [
        'Cho tam giác ABC có ba góc nhọn nội tiếp đường tròn (O).',
        'Các đường cao AD, BE, CF cắt nhau tại H và cắt đường tròn (O) lần lượt tại M, N, P.',
        '1. Chứng minh rằng: Tứ giác CEHD nội tiếp.',
        '2. Bốn điểm B, C, E, F cùng nằm trên một đường tròn.',
      ].join('\n'),
    );

    expect(cls.filter((c) => c.hasGeometry).map((c) => c.text)).toEqual([
      'Cho tam giác ABC có ba góc nhọn nội tiếp đường tròn (O)',
      'Các đường cao AD, BE, CF cắt nhau tại H và cắt đường tròn (O) lần lượt tại M, N, P',
    ]);
  });

  it('vẫn giữ clause dựng thêm trong phần bài làm nếu có từ dẫn dựng hình', () => {
    const cls = segmentClauses(
      'Chứng minh PM là tiếp tuyến của đường tròn. Gọi S là giao điểm của AB và CD.',
    );

    expect(cls.find((c) => c.text.includes('tiếp tuyến'))?.hasGeometry).toBe(false);
    expect(cls.find((c) => c.text.includes('Gọi S'))?.hasGeometry).toBe(true);
  });

  it('điểm trên cạnh/đoạn là geo-clause để rule onSegment được chạy', () => {
    const cls = segmentClauses('Trên cạnh BC lấy điểm M bất kì. Điểm E thuộc cạnh AB.');
    expect(cls.every((c) => c.hasGeometry)).toBe(true);
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

describe('runDeterministicIntents', () => {
  it('không chạy rule trên các clause chứng minh/tính toán đã bị bỏ qua coverage', () => {
    const result = runDeterministicIntents(
      [
        'Cho tam giác ABC có ba góc nhọn nội tiếp đường tròn (O).',
        'Các đường cao AD, BE, CF cắt nhau tại H và cắt đường tròn (O) lần lượt tại M, N, P.',
        '5. Xác định tâm đường tròn nội tiếp tam giác DEF.',
      ].join('\n'),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.intents).not.toContainEqual({
      op: 'draw-shape',
      shape: 'triangle',
      labels: ['D', 'E', 'F'],
      variant: 'any',
    });
    expect(result.intents).not.toContainEqual({
      op: 'draw-circle',
      name: 'O',
      spec: 'inscribedIn',
      triangle: ['D', 'E', 'F'],
    });
    expect(result.intents).toContainEqual({
      op: 'add-point',
      name: 'E',
      constraint: { kind: 'perpFoot', from: 'B', onLine: 'AC' },
    });
    expect(result.intents).toContainEqual({
      op: 'add-point',
      name: 'F',
      constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' },
    });
    expect(result.intents).toContainEqual({
      op: 'add-point',
      name: 'H',
      constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] },
    });
  });

  it('giữ nguyên ký hiệu "(O; R)" khi lọc proof-only cho rule quét toàn đề', () => {
    const result = runDeterministicIntents(
      'Cho đường tròn (O; R) đường kính AB. Chứng minh AB là dây lớn nhất.',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.intents).toContainEqual({
      op: 'draw-circle',
      name: 'O_c',
      spec: 'diameter',
      endpoints: ['A', 'B'],
    });
  });
});
