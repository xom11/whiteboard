import { foldVietnamese, FOLDED_VOCAB, classifyToken, applyStructure, DEFAULT_CORRECT_CONFIG, correctUserInput } from '../correctUserInput';
import { tryDeterministicFigure } from '../tryDeterministicFigure';

describe('applyStructure (tầng 1)', () => {
  it('gộp xuống dòng + space thừa', () => {
    expect(applyStructure('Cho tam giác\n  ABC   nội  tiếp')).toBe('Cho tam giác ABC nội tiếp');
  });
  it('độ: "90 do" / "90 độ" → 90°', () => {
    expect(applyStructure('góc bằng 90 do')).toBe('góc bằng 90°');
    expect(applyStructure('góc bằng 90 độ')).toBe('góc bằng 90°');
  });
  it('config mặc định: structure+accents bật, typo tắt', () => {
    expect(DEFAULT_CORRECT_CONFIG).toEqual({
      // typo MẶC ĐỊNH TẮT: fuzzy băm từ trần hợp lệ trên corpus thật (xem comment
      // trong correctUserInput.ts). Bật qua flag cho mutation test / opt-in.
      structure: true, accents: true, typo: false, maxTypoDistance: 1, minTypoLen: 4,
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
  it('giữ case đầu (sentence-start + shouted ≥5 ký tự)', () => {
    expect(correctUserInput('Cho duong tron')).toBe('Cho đường tròn');
    expect(correctUserInput('DUONG')).toBe('Đường');
    expect(correctUserInput('Đường tròn')).toBe('Đường tròn');
  });
  it('GUARD: nhãn HOA ngắn 1-4 ký tự LUÔN protected (kể cả khi fold trùng vocab)', () => {
    expect(correctUserInput('tia BA')).toBe('tia BA');
    expect(correctUserInput('doan CO')).toBe('đoạn CO');
    expect(correctUserInput('TAM GIAC')).toBe('TAM GIAC');
  });
});

describe('correctUserInput — tầng 3 (typo, OPT-IN qua flag)', () => {
  // typo mặc định TẮT (corpus-safe) → bật tường minh để kiểm tra logic tầng 3.
  const TYPO = { ...DEFAULT_CORRECT_CONFIG, typo: true };
  it('typo edit-1 từ TRẦN dài → canonical', () => {
    expect(correctUserInput('tam gisc ABC', TYPO)).toBe('tam giác ABC');
    expect(correctUserInput('duong tronh', TYPO)).toBe('đường tròn');
  });
  it('từ ngắn (<minTypoLen) KHÔNG fuzzy', () => {
    // "hoc" (fold) cách "goc"(góc) d=1 nhưng len 3 < 4 → giữ nguyên
    expect(correctUserInput('hoc sinh', TYPO)).toBe('hoc sinh');
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
  const raw = 'CHO\nduong  tronh\ttam O, goc 90 do';
  it('idempotent', () => {
    const once = correctUserInput(raw);
    expect(correctUserInput(once)).toBe(once);
  });
  it('tắt accents+typo → chỉ tầng cấu trúc (whitespace + bảng ký hiệu)', () => {
    const out = correctUserInput(raw, { ...DEFAULT_CORRECT_CONFIG, accents: false, typo: false });
    expect(out).toBe('CHO duong tronh tam O, goc 90°');
  });
});

describe('wiring e2e — đề gõ-tay lệch vẫn dựng được', () => {
  it('thiếu dấu + xuống dòng → FULL như bản chuẩn', () => {
    // (O) protected (ngoặc). messy chỉ thiếu-dấu trên từ KHÔNG mơ hồ + xuống dòng.
    const clean = 'Cho tam giác ABC nội tiếp đường tròn (O)';
    const messy = 'cho tam giac ABC\nnoi tiep duong tron (O)';
    expect(tryDeterministicFigure(clean).ok).toBe(true);
    expect(tryDeterministicFigure(messy).ok).toBe(tryDeterministicFigure(clean).ok);
  });
});
