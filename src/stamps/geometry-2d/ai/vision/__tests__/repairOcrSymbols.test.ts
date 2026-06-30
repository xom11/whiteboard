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
  it('R2b nới: doubled-A "AADN" → △ kể cả lời giải (vô hại — lời giải bị cắt khỏi hình)', () => {
    // Đổi từ hành vi cũ (bỏ qua khi không có tính-từ): doubled-A là △ rõ ràng.
    // "ABAM" KHÔNG doubled-A đầu token → giữ nguyên.
    expect(repairOcrSymbols('Suy ra AADN = ABAM')).toBe('Suy ra tam giác ADN = ABAM');
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
  it('R2b nới: tính-từ KHÔNG cần ngay sau (từ chen "không"/"có"/"~"/standalone)', () => {
    expect(repairOcrSymbols('Cho AABC không cân nội tiếp (O)')).toBe('Cho tam giác ABC không cân nội tiếp (O)');
    expect(repairOcrSymbols('Cho AABC có AB < AC < BC')).toBe('Cho tam giác ABC có AB < AC < BC');
    expect(repairOcrSymbols('AABM tiếp xúc với AB')).toBe('tam giác ABM tiếp xúc với AB');
    expect(repairOcrSymbols('Cho AABC có trực tâm H.')).toBe('Cho tam giác ABC có trực tâm H.');
  });
  it('R2b vẫn KHÔNG đụng tứ giác single-A "AABCD" (5 ký tự không khớp)', () => {
    expect(repairOcrSymbols('Cho ABCDE nội tiếp')).toBe('Cho ABCDE nội tiếp');
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

describe('repairOcrSymbols — R12-R19 glyph + rớt dấu (đo PDF vào-10 2018)', () => {
  it('R12 € → ∈', () => {
    expect(repairOcrSymbols('C € (O), D € (O)')).toBe('C ∈ (O), D ∈ (O)');
  });
  it('R13 || → ∥ (song song)', () => {
    expect(repairOcrSymbols('OK || MB và OL || MC')).toBe('OK ∥ MB và OL ∥ MC');
    expect(repairOcrSymbols('Chứng minh PQ || BC')).toBe('Chứng minh PQ ∥ BC');
  });
  it('R14 ¢ → c (đánh số ý)', () => {
    expect(repairOcrSymbols('nội tiếp ¢, Tìm')).toBe('nội tiếp c, Tìm');
  });
  it('R15 Ð (Eth) → D nhãn điểm; chừa Ð đầu từ thường', () => {
    expect(repairOcrSymbols('đi qua Ð và C')).toBe('đi qua D và C');
    expect(repairOcrSymbols('PA, PB lần lượt tại Ð và E')).toBe('PA, PB lần lượt tại D và E');
    expect(repairOcrSymbols('Ðường tròn')).toBe('Ðường tròn'); // Ð kề chữ thường → giữ
  });
  it('R16 Ø → O (nhãn O/O′)', () => {
    expect(repairOcrSymbols("(O) và (Ø') cắt nhau")).toBe("(O) và (O') cắt nhau");
    expect(repairOcrSymbols('Gọi Ø là tâm')).toBe('Gọi O là tâm');
  });
  it('R17 Goi → Gọi', () => {
    expect(repairOcrSymbols('Goi M là trung điểm')).toBe('Gọi M là trung điểm');
  });
  it('R18 Lay → Lấy', () => {
    expect(repairOcrSymbols('Lay D bất kì trên BC')).toBe('Lấy D bất kì trên BC');
  });
  it('R19 "di qua" → "đi qua" (né "di chuyển"/"di động")', () => {
    expect(repairOcrSymbols('đường tròn di qua D và C')).toBe('đường tròn đi qua D và C');
    expect(repairOcrSymbols('M di chuyển trên BC')).toBe('M di chuyển trên BC');
    expect(repairOcrSymbols('điểm A di động')).toBe('điểm A di động');
  });
  it('R21 " va " → " và " (rớt dấu liên từ); né "va chạm"', () => {
    expect(repairOcrSymbols('(O) va (O\') cắt nhau')).toBe('(O) và (O\') cắt nhau');
    expect(repairOcrSymbols('giao điểm của BM va (O)')).toBe('giao điểm của BM và (O)');
    expect(repairOcrSymbols('hai xe va chạm')).toBe('hai xe va chạm'); // "va" dính "chạm" → né
  });
  it('R22 "Trén"/"trén" → "Trên"/"trên"', () => {
    expect(repairOcrSymbols('Trén cung MN lớn lấy điểm K')).toBe('Trên cung MN lớn lấy điểm K');
    expect(repairOcrSymbols('lấy điểm trén đoạn AB')).toBe('lấy điểm trên đoạn AB');
  });
  it('R20 "Dường" → "Đường" (rớt gạch Đ); chuỗi với R8; né "Dường như"', () => {
    expect(repairOcrSymbols('Dường tròn (O)')).toBe('Đường tròn (O)');
    expect(repairOcrSymbols('Dường thẳng d cắt')).toBe('Đường thẳng d cắt');
    expect(repairOcrSymbols('Dường tron (I) nội tiếp')).toBe('Đường tròn (I) nội tiếp');
    expect(repairOcrSymbols('Dường như hai đường song song')).toBe('Dường như hai đường song song');
    expect(repairOcrSymbols('Duong tròn (O)')).toBe('Đường tròn (O)'); // mất hết dấu
    expect(repairOcrSymbols('Duong thẳng d')).toBe('Đường thẳng d');
  });
});

describe('repairOcrSymbols — R23-R29 dấu/glyph (đo PDF vào-10 HHP 2018-2019)', () => {
  it('R23 "dường" thường → "đường" (D mất gạch, gate danh-từ hình học)', () => {
    expect(repairOcrSymbols('Kẻ dường kính AE của (O)')).toBe('Kẻ đường kính AE của (O)');
    expect(repairOcrSymbols('trung điểm của dường cao AH')).toBe('trung điểm của đường cao AH');
    expect(repairOcrSymbols('Một dường thẳng d bất kì')).toBe('Một đường thẳng d bất kì');
    expect(repairOcrSymbols('dường tron (I) nội tiếp')).toBe('đường tròn (I) nội tiếp'); // chuỗi R23→R8
    expect(repairOcrSymbols('dường như hai cạnh')).toBe('dường như hai cạnh'); // né "dường như"
  });
  it('R24 "day" → "dây" (Vẽ/Kẻ day <nhãn> hoặc "day cung")', () => {
    expect(repairOcrSymbols('Vẽ day DN của (O)')).toBe('Vẽ dây DN của (O)');
    expect(repairOcrSymbols('Kẻ day BD cắt')).toBe('Kẻ dây BD cắt');
    expect(repairOcrSymbols('lấy day cung AB')).toBe('lấy dây cung AB');
    expect(repairOcrSymbols('every day life')).toBe('every day life'); // "day" thường EN → né
  });
  it('R25 "Chứng mình" → "Chứng minh"', () => {
    expect(repairOcrSymbols('Chứng mình H là trực tâm')).toBe('Chứng minh H là trực tâm');
    expect(repairOcrSymbols('a, chứng mình rằng')).toBe('a, chứng minh rằng');
  });
  it('R26 "thẳng hang" → "thẳng hàng"', () => {
    expect(repairOcrSymbols('A, B, C không thẳng hang')).toBe('A, B, C không thẳng hàng');
  });
  it('R27 "Tinh" → "Tính" (mệnh lệnh tính toán)', () => {
    expect(repairOcrSymbols('Tinh MKB')).toBe('Tính MKB');
    expect(repairOcrSymbols('Tinh do dai OI')).toBe('Tính độ dài OI'); // R27 + R28
    expect(repairOcrSymbols('Tinh bán kính')).toBe('Tính bán kính');
  });
  it('R28 "do dai" → "độ dài"', () => {
    expect(repairOcrSymbols('có do dai bằng')).toBe('có độ dài bằng');
  });
  it('R29 "năm/nim giữa|trên" → "nằm"', () => {
    expect(repairOcrSymbols('C năm giữa M và D')).toBe('C nằm giữa M và D');
    expect(repairOcrSymbols('M nim giữa A và H')).toBe('M nằm giữa A và H');
    expect(repairOcrSymbols('tâm nim trên AC')).toBe('tâm nằm trên AC');
    expect(repairOcrSymbols('vào năm 2018 thi')).toBe('vào năm 2018 thi'); // "năm" (year) → né
  });
});

describe('repairOcrSymbols — R30 ∠ (góc đọc thành Z, đôi khi 4Z)', () => {
  it('vá "Z" + 2-3 HOA → ∠ (tên góc)', () => {
    expect(repairOcrSymbols('phân giác ZDAB và ZABC')).toBe('phân giác ∠DAB và ∠ABC');
    expect(repairOcrSymbols('ZAEO = ZADC')).toBe('∠AEO = ∠ADC');
    expect(repairOcrSymbols('Phân giác ZBAC cắt EF')).toBe('Phân giác ∠BAC cắt EF');
  });
  it('vá tiền tố méo "4Z" → ∠ (glyph ∠ đọc thành 4Z)', () => {
    expect(repairOcrSymbols('phân giác 4ZDAB')).toBe('phân giác ∠DAB');
  });
  it('KHÔNG đụng Z không ở đầu token / chỉ 1 HOA sau (đoạn AZ, điểm Z)', () => {
    expect(repairOcrSymbols('đoạn AZ song song')).toBe('đoạn AZ song song'); // Z giữa token
    expect(repairOcrSymbols('điểm Z thuộc (O)')).toBe('điểm Z thuộc (O)'); // Z đứng riêng
    expect(repairOcrSymbols('trục Oz nằm ngang')).toBe('trục Oz nằm ngang'); // z thường
  });
  it('idempotent với ∠ đã đúng', () => {
    expect(repairOcrSymbols('∠DAB = ∠ABC')).toBe('∠DAB = ∠ABC');
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
