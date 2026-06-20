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

  // Dataset vao10: "(O;R)" — dấu ";" TRONG ngoặc không phải ranh giới clause.
  it('không tách clause tại ";" bên trong ngoặc "(O;R)"', () => {
    const cls = segmentClauses('Cho đường tròn (O;R) có đường kính BC. Gọi M là trung điểm BO');
    expect(cls.length).toBe(2);
    expect(cls[0].text).toBe('Cho đường tròn (O;R) có đường kính BC');
  });

  it('không tách tại ";"/"," trong ngoặc chú thích "(M, N thuộc đường tròn; AM khác AN)"', () => {
    const cls = segmentClauses(
      'Từ A kẻ cát tuyến AMN với đường tròn (M, N thuộc đường tròn; AM khác AN). Gọi I là trung điểm MN',
    );
    expect(cls.length).toBe(2);
    expect(cls[0].text).toBe(
      'Từ A kẻ cát tuyến AMN với đường tròn (M, N thuộc đường tròn; AM khác AN)',
    );
  });

  // ";" giữa phần tử LIST ("AD; BE; CF cắt nhau tại H") là phân cách liệt kê,
  // không phải ranh giới clause — KHÔNG split, và chuẩn hoá ";" list-sep → "," để
  // rule distributive cevian (viết theo ",") thấy cả list.
  it('không tách tại ";" giữa phần tử list "AD; BE; CF cắt nhau tại H" + chuẩn hoá ","', () => {
    const cls = segmentClauses(
      'Cho tam giác ABC nhọn. Ba đường cao AD; BE; CF cắt nhau tại H. Gọi I là trung điểm BC',
    );
    expect(cls.length).toBe(3);
    expect(cls[1].text).toBe('Ba đường cao AD, BE, CF cắt nhau tại H');
  });

  // ";" trước clause THẬT vẫn tách ("AE và BC..." là mệnh đề mới, không phải list).
  it('";" trước mệnh đề mới vẫn tách như cũ', () => {
    const cls = segmentClauses('nối BM cắt cung AC tại E; AE và BC kéo dài cắt nhau tại D');
    expect(cls.length).toBe(2);
  });

  // Directive distributive "Kẻ HK; HM lần lượt ⊥ AB; AC" — CẢ HAI ";" đều là phân
  // cách phần tử list: (HK; HM) là 2 đoạn được kẻ, (AB; AC) là 2 cạnh ⊥ tương ứng.
  // Trước fix segmenter vỡ thành 4 mảnh vụn → mất name/line → không claim được.
  it('không tách + chuẩn hoá "," trong directive distributive "Kẻ HK; HM lần lượt ⊥ AB; AC"', () => {
    const cls = segmentClauses('Vẽ đường cao AH. Từ H kẻ HK; HM lần lượt vuông góc với AB; AC');
    // 2 clause; clause directive giữ nguyên 1 mảnh, ";" list-sep → ",".
    expect(cls.length).toBe(2);
    expect(cls[1].text).toBe('Từ H kẻ HK, HM lần lượt vuông góc với AB, AC');
  });

  // Chuỗi 3 phần tử "CE; CF; CG lần lượt ⊥ AD; DB; AB" — tất cả ";" là list-sep.
  it('không tách + chuẩn hoá "," trong directive distributive 3 phần tử "CE; CF; CG lần lượt ⊥ AD; DB; AB"', () => {
    const cls = segmentClauses('Từ C kẻ CE; CF; CG lần lượt vuông góc với AD; DB; AB');
    expect(cls.length).toBe(1);
    expect(cls[0].text).toBe('Từ C kẻ CE, CF, CG lần lượt vuông góc với AD, DB, AB');
  });

  // ";" trước HOA-label nhưng theo sau là TỪ NỐI thường ("và") = mệnh đề mới, vẫn tách.
  it('";" + HOA-label + từ nối thường ("AB và …") vẫn tách', () => {
    const cls = segmentClauses('Hạ HE; AB và HF cắt nhau tại K');
    // "AB và …" là mệnh đề/quan-hệ mới, không phải phần tử list distributive.
    expect(cls.length).toBe(2);
  });

  it('ngoặc không cân (OCR) không nuốt toàn bộ phần sau', () => {
    const cls = segmentClauses('Cho đường tròn (O. Gọi M là trung điểm BC. Vẽ MH vuông góc AB');
    expect(cls.length).toBe(3);
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

  // Bug \b ASCII: "Vẽ"/"Kẻ" kết thúc bằng chữ Việt ('ẽ'/'ẻ' non-word theo ASCII)
  // → `Vẽ\b` KHÔNG bao giờ khớp khi sau là space → comma-split chết im lặng.
  it('tách clause ở dấu phẩy trước từ dẫn "Vẽ"/"Kẻ" (kết thúc bằng chữ Việt)', () => {
    const ve = segmentClauses('Cho tam giác ABC, Vẽ đường cao AH');
    expect(ve.map((c) => c.text)).toEqual(['Cho tam giác ABC', 'Vẽ đường cao AH']);

    const ke = segmentClauses('Cho tam giác ABC, Kẻ phân giác AD');
    expect(ke.map((c) => c.text)).toEqual(['Cho tam giác ABC', 'Kẻ phân giác AD']);
  });

  // Guard hồi quy: các từ dẫn kết thúc bằng ký tự ASCII vẫn split như cũ.
  it('vẫn tách ở ", Gọi" và ", Let" như trước', () => {
    const vn = segmentClauses('Cho tam giác ABC, Gọi M là trung điểm BC');
    expect(vn.length).toBe(2);
    const en = segmentClauses('Triangle ABC, Let M be the midpoint of BC');
    expect(en.length).toBe(2);
  });

  it('mục "a) Chứng minh …" / "b) …" (enumeration chữ) tính là proof', () => {
    const cls = segmentClauses(
      [
        'Cho tam giác ABC nội tiếp (O). Gọi M là trung điểm BC.',
        'a) Chứng minh MN là tiếp tuyến của (O).',
        'b) Tứ giác BMNC nội tiếp.',
      ].join('\n'),
    );
    const geo = cls.filter((c) => c.hasGeometry).map((c) => c.text);
    expect(geo.some((t) => t.includes('Chứng minh MN'))).toBe(false);
    expect(geo.some((t) => t.includes('Tứ giác BMNC'))).toBe(false);
    expect(geo.some((t) => t.includes('trung điểm BC'))).toBe(true);
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

describe('locus clause exclusion', () => {
  it('"Điểm A di chuyển trên đường tròn (O)" → không tính geo (quỹ tích)', () => {
    const cls = segmentClauses('Cho tam giác ABC nội tiếp (O). Điểm A di chuyển trên đường tròn (O) sao cho AB < AC.');
    const locus = cls.find((c) => c.text.includes('di chuyển'));
    expect(locus?.hasGeometry).toBe(false);
  });
});
