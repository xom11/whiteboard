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
    expect(repairOcrSymbols('AO L BC tai H')).toBe('AO ⊥ BC tại H'); // R1 ⊥ + R10 tai→tại
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

describe('repairOcrSymbols — R2b △ trong câu chứng minh (không Cho/Xét)', () => {
  it('vá "Chứng minh: APQE cân" → tam giác PQE', () => {
    expect(repairOcrSymbols('a, Chứng minh: APQE cân.')).toBe('a, Chứng minh: tam giác PQE cân.');
  });
  it('vá hậu tố tam-giác-thuần khác (vuông/đều/nhọn)', () => {
    expect(repairOcrSymbols('Chứng minh: AMNP vuông tại M')).toBe(
      'Chứng minh: tam giác MNP vuông tại M',
    );
  });
  it('KHÔNG đụng "hình thang ABCD cân" / "tứ giác ABCD ... "', () => {
    expect(repairOcrSymbols('Cho hình thang ABCD cân')).toBe('Cho hình thang ABCD cân');
    expect(repairOcrSymbols('tứ giác ABCD đều')).toBe('tứ giác ABCD đều');
  });
});

describe('repairOcrSymbols — R2 fix bug tứ giác nội tiếp + nhánh A nhân đôi', () => {
  it('KHÔNG còn vá nhầm "Cho ABCD nội tiếp (O)" → giữ nguyên ABCD', () => {
    expect(repairOcrSymbols('Cho ABCD nội tiếp (O)')).toBe('Cho ABCD nội tiếp (O)');
    expect(repairOcrSymbols('Cho tứ giác ABCD nội tiếp (O)')).toBe(
      'Cho tứ giác ABCD nội tiếp (O)',
    );
  });
  it('vá △ABC nội tiếp qua tín hiệu A nhân đôi "AABC"', () => {
    expect(repairOcrSymbols('Cho AABC nội tiếp (O)')).toBe('Cho tam giác ABC nội tiếp (O)');
  });
});

describe('repairOcrSymbols — R5 ∩ (giao, đọc thành N dính + "= {")', () => {
  it('vá "ABN CD = {E}" → "AB ∩ CD = {E}"', () => {
    expect(repairOcrSymbols('ABN CD = {E}')).toBe('AB ∩ CD = {E}');
  });
  it('vá cả khi mút thứ hai bị méo "ADN BƠ = {F}" (R5 ∩ + R7 Ơ→C)', () => {
    expect(repairOcrSymbols('ADN BƠ = {F}')).toBe('AD ∩ BC = {F}');
  });
  it('KHÔNG đụng "N" không có "= {"', () => {
    expect(repairOcrSymbols('Trên AN lấy điểm M')).toBe('Trên AN lấy điểm M');
  });
});

describe('repairOcrSymbols — R6 mũ ² (letter? + toán tử)', () => {
  it('vá "EF? =" → "EF² ="', () => {
    expect(repairOcrSymbols('Chứng minh: EF? = FA.FD + EC.ED')).toBe(
      'Chứng minh: EF² = FA.FD + EC.ED',
    );
  });
  it('vá "BM? =" và "AM? +"', () => {
    expect(repairOcrSymbols('BM? = AM? + x')).toBe('BM² = AM² + x');
  });
  it('KHÔNG đụng câu hỏi VN (chữ thường trước ?)', () => {
    expect(repairOcrSymbols('có phải góc vuông? Vì sao')).toBe('có phải góc vuông? Vì sao');
  });
});

describe('repairOcrSymbols — R7 Ơ→C (nhãn điểm C đọc thành O-móc)', () => {
  it('vá Ơ dính nhãn HOA: BƠ→BC, ƠD→CD, ƠI→CI, SƠ→SC', () => {
    expect(repairOcrSymbols('E. BƠ cắt DE')).toBe('E. BC cắt DE');
    expect(repairOcrSymbols('Dây ƠD di động')).toBe('Dây CD di động');
    expect(repairOcrSymbols('P; ƠI cắt')).toBe('P; CI cắt');
    expect(repairOcrSymbols('B, SƠ. Chứng')).toBe('B, SC. Chứng');
  });
  it('vá Ơ standalone (nhãn C đứng riêng + trong ngoặc)', () => {
    expect(repairOcrSymbols('Gọi Ơ là trung điểm')).toBe('Gọi C là trung điểm');
    expect(repairOcrSymbols('cắt nhau tại Ơ, D')).toBe('cắt nhau tại C, D');
    expect(repairOcrSymbols('đường tròn (Ơ)')).toBe('đường tròn (C)');
  });
  it('KHÔNG đụng từ Việt thật có Ơ-móc + ơ thường', () => {
    expect(repairOcrSymbols('Ơn giời cậu đây')).toBe('Ơn giời cậu đây'); // Ơ kề chữ thường
    expect(repairOcrSymbols('đường tròn trơn sơ')).toBe('đường tròn trơn sơ'); // ơ thường
  });
});

describe('repairOcrSymbols — R8-R11 rớt dấu tiếng Việt (gate ngữ cảnh)', () => {
  it('R8 "đường tron" → "đường tròn" (né "trong")', () => {
    expect(repairOcrSymbols('Cho đường tron (O)')).toBe('Cho đường tròn (O)');
    expect(repairOcrSymbols('Đường tron tâm O')).toBe('Đường tròn tâm O');
    expect(repairOcrSymbols('điểm nằm trong (O)')).toBe('điểm nằm trong (O)');
  });
  it('R9 "Ƒ" (florin) → "F"', () => {
    expect(repairOcrSymbols('Lấy Ƒ trên AB')).toBe('Lấy F trên AB');
  });
  it('R10 "tai" → "tại" chỉ trước nhãn HOA / "(" / "điểm"', () => {
    expect(repairOcrSymbols('cắt BC tai D')).toBe('cắt BC tại D');
    expect(repairOcrSymbols('tiếp tuyến tai B')).toBe('tiếp tuyến tại B');
    expect(repairOcrSymbols('cắt nhau tai điểm M')).toBe('cắt nhau tại điểm M');
    expect(repairOcrSymbols('bị đau lỗ tai trái')).toBe('bị đau lỗ tai trái'); // né "tai" thật
  });
  it('R11 "tam" → "tâm" chỉ trước đường/"(" (né "tam giác")', () => {
    expect(repairOcrSymbols('I là tam đường tròn nội tiếp')).toBe('I là tâm đường tròn nội tiếp');
    expect(repairOcrSymbols('O là tam (O)')).toBe('O là tâm (O)');
    expect(repairOcrSymbols('Cho tam giác ABC')).toBe('Cho tam giác ABC'); // né tam giác
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
