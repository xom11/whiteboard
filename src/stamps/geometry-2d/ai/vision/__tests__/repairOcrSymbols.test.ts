import { repairOcrSymbols } from '../repairOcrSymbols';

// Fixtures = chuỗi OCR THẬT đo từ tesseract.js vie+eng trên PDF rasterize
// (tuyen-tap-400 MathType style + nguyen-ngoc-son LaTeX style). Xem spec
// docs/superpowers/specs/2026-06-29-ocr-symbol-repair-design.md

describe('repairOcrSymbols — R1 ⊥ (1/|/L kẹp giữa 2 nhóm-hoa)', () => {
  it('vá "1" → ⊥', () => {
    expect(repairOcrSymbols('IH 1 CE')).toBe('IH ⊥ CE');
    expect(repairOcrSymbols('OB 1 CO')).toBe('OB ⊥ CO');
  });
  it('vá "|" → ⊥', () => {
    expect(repairOcrSymbols('Hạ BK | AM tại K')).toBe('Hạ BK ⊥ AM tại K');
    expect(repairOcrSymbols('MK | AB')).toBe('MK ⊥ AB');
  });
  it('vá "L" → ⊥', () => {
    expect(repairOcrSymbols('AO L BC tai H')).toBe('AO ⊥ BC tai H');
  });
  it('không đụng "1" KHÔNG kẹp giữa 2 nhóm-hoa', () => {
    expect(repairOcrSymbols('Câu 1 Cho tam giác')).toBe('Câu 1 Cho tam giác');
    expect(repairOcrSymbols('gồm 1 đường tròn')).toBe('gồm 1 đường tròn');
    expect(repairOcrSymbols('(1) và (2)')).toBe('(1) và (2)');
  });
  it('không đụng "L" là tên điểm trong câu thường', () => {
    expect(repairOcrSymbols('điểm L thuộc đường tròn')).toBe('điểm L thuộc đường tròn');
  });
});

describe('repairOcrSymbols — R2 △/∆ (A dính đầu, chỉ câu đề)', () => {
  it('vá "Cho AABC <mô tả tam giác>" → tam giác', () => {
    expect(repairOcrSymbols('Cho AABC đều nội tiếp (O;R)')).toBe(
      'Cho tam giác ABC đều nội tiếp (O;R)',
    );
    expect(repairOcrSymbols('Xét AADN cân')).toBe('Xét tam giác ADN cân');
    expect(repairOcrSymbols('Cho AMNP vuông tại M')).toBe('Cho tam giác MNP vuông tại M');
  });
  it('KHÔNG đụng tứ giác thật "Cho ABCD có …" (không phải △)', () => {
    expect(repairOcrSymbols('Cho ABCD có 4 cạnh bằng nhau')).toBe(
      'Cho ABCD có 4 cạnh bằng nhau',
    );
  });
  it('KHÔNG đụng khi có shape word giữa (Cho hình vuông ABCD)', () => {
    expect(repairOcrSymbols('Cho hình vuông ABCD có cạnh bằng 2')).toBe(
      'Cho hình vuông ABCD có cạnh bằng 2',
    );
  });
  it('cố ý BỎ QUA △ ở phần lời giải ("Suy ra AADN = ABAM")', () => {
    expect(repairOcrSymbols('Suy ra AADN = ABAM')).toBe('Suy ra AADN = ABAM');
  });
});

describe('repairOcrSymbols — R3 (O) (0 → O trong ngoặc)', () => {
  it('vá "(0)" bare → "(O)"', () => {
    expect(repairOcrSymbols('các điểm thuộc (0)')).toBe('các điểm thuộc (O)');
  });
  it('không đụng "(0;…)" (né toạ độ)', () => {
    expect(repairOcrSymbols('A(0;2)')).toBe('A(0;2)');
  });
  it('không đụng số 0 ngoài ngoặc', () => {
    expect(repairOcrSymbols('bằng 0 độ')).toBe('bằng 0 độ');
  });
});

describe('repairOcrSymbols — R4 ∈ (e dính cuối list điểm + (O))', () => {
  it('vá "A,M,C,Be (0)" → "A,M,C,B ∈ (O)" (kết hợp R3)', () => {
    expect(repairOcrSymbols('A,M,C,Be (0)')).toBe('A,M,C,B ∈ (O)');
  });
  it('vá khi tròn đã đúng "(O)"', () => {
    expect(repairOcrSymbols('B,C,De (O)')).toBe('B,C,D ∈ (O)');
  });
  it('không đụng "De" khi không có list-phẩy + (O)', () => {
    expect(repairOcrSymbols('Define abc')).toBe('Define abc');
  });
});

describe('repairOcrSymbols — tổng hợp + idempotent', () => {
  it('vá nhiều symbol trong 1 câu', () => {
    const ocr = 'Cho AABC đều nội tiếp (O;R), Hạ BK | AM tại K';
    expect(repairOcrSymbols(ocr)).toBe(
      'Cho tam giác ABC đều nội tiếp (O;R), Hạ BK ⊥ AM tại K',
    );
  });
  it('idempotent: repair(repair(x)) === repair(x)', () => {
    const samples = [
      'IH 1 CE',
      'Cho AABC đều nội tiếp (O;R)',
      'A,M,C,Be (0)',
      'AO L BC tai H',
      'điểm L thuộc đường tròn',
    ];
    for (const s of samples) {
      const once = repairOcrSymbols(s);
      expect(repairOcrSymbols(once)).toBe(once);
    }
  });
  it('text rỗng / không có gì để vá → giữ nguyên', () => {
    expect(repairOcrSymbols('')).toBe('');
    expect(repairOcrSymbols('Cho tam giác ABC nội tiếp đường tròn (O)')).toBe(
      'Cho tam giác ABC nội tiếp đường tròn (O)',
    );
  });
});
