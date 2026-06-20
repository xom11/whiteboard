import { foldVietnamese, FOLDED_VOCAB, classifyToken, applyStructure, DEFAULT_CORRECT_CONFIG, correctUserInput } from '../correctUserInput';

describe('applyStructure (tầng 1)', () => {
  it('gộp xuống dòng + space thừa', () => {
    expect(applyStructure('Cho tam giác\n  ABC   nội  tiếp')).toBe('Cho tam giác ABC nội tiếp');
  });
  it('ký hiệu // → song song', () => {
    expect(applyStructure('AB // CD')).toBe('AB song song CD');
  });
  it('độ: "90 do" / "90 độ" → 90°', () => {
    expect(applyStructure('góc bằng 90 do')).toBe('góc bằng 90°');
    expect(applyStructure('góc bằng 90 độ')).toBe('góc bằng 90°');
  });
  it('config mặc định bật cả 3 tầng', () => {
    expect(DEFAULT_CORRECT_CONFIG).toEqual({
      structure: true, accents: true, typo: true, maxTypoDistance: 1, minTypoLen: 4,
    });
  });
});

describe('foldVietnamese', () => {
  it('bỏ dấu thanh + mũ + móc', () => {
    expect(foldVietnamese('đường')).toBe('duong');
    expect(foldVietnamese('tròn')).toBe('tron');
    expect(foldVietnamese('giác')).toBe('giac');
    expect(foldVietnamese('tâm')).toBe('tam');
    expect(foldVietnamese('tiếp tuyến')).toBe('tiep tuyen');
  });
  it('lowercase + Đ→d', () => {
    expect(foldVietnamese('Đường')).toBe('duong');
    expect(foldVietnamese('DUONG')).toBe('duong');
  });
  it('input đã-bỏ-dấu giữ nguyên (idempotent fold)', () => {
    expect(foldVietnamese('duong tron')).toBe('duong tron');
  });
});

describe('FOLDED_VOCAB', () => {
  it('fold thiếu-dấu → canonical có-dấu', () => {
    expect(FOLDED_VOCAB.get('duong')).toBe('đường');
    expect(FOLDED_VOCAB.get('tron')).toBe('tròn');
    expect(FOLDED_VOCAB.get('giac')).toBe('giác');
    expect(FOLDED_VOCAB.get('tiep')).toBe('tiếp');
    expect(FOLDED_VOCAB.get('tuyen')).toBe('tuyến');
    expect(FOLDED_VOCAB.get('vuong')).toBe('vuông');
    expect(FOLDED_VOCAB.get('goc')).toBe('góc');
  });
  it('collision an toàn — không corrupt từ-đa-nghĩa', () => {
    expect(FOLDED_VOCAB.get('tam')).toBe('tam');     // tam giác (KHÔNG → tâm)
    expect(FOLDED_VOCAB.get('thang')).toBe('thang'); // hình thang (KHÔNG → thẳng)
  });
  it('mọi key là dạng fold của chính canonical (self-consistent)', () => {
    for (const [folded, canonical] of FOLDED_VOCAB) {
      expect(foldVietnamese(canonical)).toBe(folded);
    }
  });
});

describe('classifyToken (guard)', () => {
  it('nhãn toán + đơn vị → protected', () => {
    for (const t of ['A', 'BC', 'ABC', 'MNPQ', "O'", 'A′', '2R', '5cm', '90°', '(O)', 'O₁']) {
      expect(classifyToken(t)).toBe('protected');
    }
  });
  it('token thuần-chữ có HOA → upper', () => {
    for (const t of ['Ax', 'By', 'DUONG', 'Cho', 'Đường']) {
      expect(classifyToken(t)).toBe('upper');
    }
  });
  it('token thuần-chữ toàn-thường → lower', () => {
    for (const t of ['duong', 'tron', 'giac', 'tiep', 'gisc']) {
      expect(classifyToken(t)).toBe('lower');
    }
  });
});

describe('correctUserInput — tầng 2 (phục-hồi-dấu + case)', () => {
  it('thiếu dấu → có dấu', () => {
    expect(correctUserInput('cho duong tron')).toBe('cho đường tròn');
    expect(correctUserInput('tiep tuyen')).toBe('tiếp tuyến');
  });
  it('KHÔNG corrupt từ-đa-nghĩa bỏ-dấu (collision an toàn)', () => {
    // fold("tam")=fold("tâm")="tam" → giữ "tam" (đúng cho "tam giác"), KHÔNG đổi "tâm".
    expect(correctUserInput('tam giac ABC')).toBe('tam giác ABC');
    // fold("thang")=fold("thẳng")="thang" → giữ "thang" (đúng cho "hình thang").
    expect(correctUserInput('hinh thang ABCD')).toBe('hình thang ABCD');
  });
  it('giữ case đầu (sentence-start + shouted)', () => {
    expect(correctUserInput('Cho duong tron')).toBe('Cho đường tròn');
    expect(correctUserInput('DUONG TRON')).toBe('Đường Tròn');
    expect(correctUserInput('Đường tròn')).toBe('Đường tròn'); // đã đúng → unchanged
  });
});

describe('correctUserInput — tầng 3 (typo)', () => {
  it('typo edit-1 từ dài → canonical', () => {
    expect(correctUserInput('tam gisc ABC')).toBe('tam giác ABC');
    expect(correctUserInput('duong tronh')).toBe('đường tròn');
  });
  it('từ ngắn (<minTypoLen) KHÔNG fuzzy', () => {
    // "hoc" (fold) cách "goc"(góc) d=1 nhưng len 3 < 4 → giữ nguyên
    expect(correctUserInput('hoc sinh')).toBe('hoc sinh');
  });
});

describe('correctUserInput — GUARD label-protection (xuyên tầng)', () => {
  it('nhãn toán giữ nguyên qua mọi tầng', () => {
    const out = correctUserInput("tam giac ABC, duong kinh BC, tiep tuyen tai A', AD = 2R, goc 90 do");
    for (const label of ['ABC', 'BC', "A'", '2R', '90°']) {
      expect(out).toContain(label);
    }
    expect(out).toContain('tam giác');
    expect(out).toContain('tiếp tuyến');
  });
});

describe('correctUserInput — idempotent + cờ tầng', () => {
  const raw = 'CHO\nduong  tronh\ttam O, AB // CD';
  it('idempotent', () => {
    const once = correctUserInput(raw);
    expect(correctUserInput(once)).toBe(once);
  });
  it('tắt accents+typo → chỉ tầng cấu trúc', () => {
    const out = correctUserInput(raw, { ...DEFAULT_CORRECT_CONFIG, accents: false, typo: false });
    expect(out).toBe('CHO duong tronh tam O, AB song song CD');
  });
});
