import { detectFormulaRisk } from '../detectFormulaRisk';

// Fixtures = chuỗi OCR THẬT (đo tesseract.js vie+eng). Detector KHÔNG sửa text,
// chỉ cờ dấu vết OCR huỷ công thức. Xem spec
// docs/superpowers/specs/2026-06-29-ocr-formula-risk-warning-design.md

describe('detectFormulaRisk — M1 phân số/biểu thức bị nuốt (lone <>)', () => {
  it('cờ "<" đứng riêng nơi cần biểu thức', () => {
    // a²/pq → "<" : "Chứng minh: < không đổi"
    expect(detectFormulaRisk('Chứng minh: < không đổi khi (d) dịch chuyển').length).toBeGreaterThan(0);
  });
  it('KHÔNG cờ bất đẳng thức thật "a < b"', () => {
    expect(detectFormulaRisk('Chứng minh AB < CD')).toEqual([]);
    expect(detectFormulaRisk('S1 < S2 < S3')).toEqual([]);
  });
});

describe('detectFormulaRisk — M2 số mũ/độ bị mất (dấu ?)', () => {
  it('cờ "BM? =" (mũ ² → ?)', () => {
    expect(detectFormulaRisk('BM? = AM? + AB?').length).toBeGreaterThan(0);
  });
  it('cờ "90? (" (độ ° → ?)', () => {
    expect(detectFormulaRisk('ADB = 90? (góc nội tiếp)').length).toBeGreaterThan(0);
  });
  it('KHÔNG cờ câu hỏi tiếng Việt kết thúc bằng ?', () => {
    expect(detectFormulaRisk('Khẳng định trên còn đúng không?')).toEqual([]);
    expect(detectFormulaRisk('khi xAy không phải góc vuông? 2, Khẳng định')).toEqual([]);
  });
});

describe('detectFormulaRisk — M3 tên góc nhận sai (ký tự có dấu trước = N°)', () => {
  it('cờ "TÂU = 90°" (x̂Ay → TÂU, có Â)', () => {
    expect(detectFormulaRisk('Cho TÂU = 90° và đường tròn (O)').length).toBeGreaterThan(0);
  });
  it('KHÔNG cờ tên góc ASCII hợp lệ "ABC = 90°"', () => {
    expect(detectFormulaRisk('Cho góc ABC = 90° nội tiếp')).toEqual([]);
    expect(detectFormulaRisk('BAC = 90° và CAD = 45°')).toEqual([]);
  });
});

describe('detectFormulaRisk — sạch / tổng hợp', () => {
  it('text sạch không cờ gì', () => {
    expect(detectFormulaRisk('Cho tam giác ABC nội tiếp đường tròn (O), kẻ AH ⊥ BC')).toEqual([]);
    expect(detectFormulaRisk('Cho hình vuông ABCD có cạnh bằng 2')).toEqual([]);
  });
  it('ảnh ví dụ thật gom nhiều cờ (TÂU + <)', () => {
    const ocr =
      '1, Cho TÂU = 90° và đường tròn (O) tiếp xúc với Az và Ay. Chứng minh: < không đổi';
    const reasons = detectFormulaRisk(ocr);
    expect(reasons.length).toBeGreaterThanOrEqual(2);
  });
});
