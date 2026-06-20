import { foldVietnamese, FOLDED_VOCAB, classifyToken } from '../correctUserInput';

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
