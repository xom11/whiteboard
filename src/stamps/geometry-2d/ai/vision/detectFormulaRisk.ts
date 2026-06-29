// src/stamps/geometry-2d/ai/vision/detectFormulaRisk.ts
//
// Cờ CẢNH BÁO khi output OCR có dấu vết công thức/ký hiệu bị Tesseract HUỶ
// (phân số, mũ, độ, tên góc có dấu). KHÔNG sửa text — thông tin đã mất ở tầng
// pixel→glyph, sửa = đoán mò. Mục tiêu: chặn user bị lừa bởi text trông sạch
// nhưng confidence vẫn cao (đo: "a²/pq"→"<", "x̂Ay"→"TÂU", "BM²"→"BM?").
// Best-effort advisory — KHÔNG bắt mọi ca (vd "x̂Ay"→"zAy" không dấu hiệu).
// Spec: docs/superpowers/specs/2026-06-29-ocr-formula-risk-warning-design.md

// M2 — mũ ² / độ ° bị mất thành "?" dính sau chữ-HOA/số + tiếp toán tử/ngoặc.
// Né câu hỏi VN (chữ thường trước "?", vd "vuông?") và số thứ tự ("? 2,").
const SUP_RESIDUE = /[A-Z0-9]\?(?=\s*[-=+)(])/u;

// M3 — token kiểu tên-góc đứng trước "= N°" mà chứa ký tự CÓ DẤU (point name
// thật là ASCII A-Z; có dấu ⇒ OCR méo, vd "TÂU = 90°").
const ANGLE_DEG = /([\p{L}]{1,6})\s*=\s*\d+\s*°/gu;

// M1 — "<"/">" KHÔNG ở dạng bất đẳng thức "operand OP operand" ⇒ nghi biểu thức
// (phân số) bị nuốt còn trơ dấu, vd "Chứng minh: < không đổi".
function hasManglingLtGt(text: string): boolean {
  const re = /[<>]/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const prev = text.slice(0, m.index).replace(/\s+$/u, '').slice(-1);
    const next = text.slice(m.index + 1).replace(/^\s+/u, '').slice(0, 1);
    const prevOperand = /[A-Za-z0-9]/.test(prev);
    const nextOperand = /[A-Za-z0-9]/.test(next);
    if (!(prevOperand && nextOperand)) return true;
  }
  return false;
}

export function detectFormulaRisk(text: string): string[] {
  const reasons: string[] = [];
  if (hasManglingLtGt(text)) {
    reasons.push('phân số/biểu thức nghi bị nuốt (ký hiệu "<"/">")');
  }
  if (SUP_RESIDUE.test(text)) {
    reasons.push('số mũ hoặc độ nghi bị mất (dấu "?")');
  }
  for (const m of text.matchAll(ANGLE_DEG)) {
    const tok = m[1];
    if (/[A-Z]/.test(tok) && /[^\x00-\x7F]/u.test(tok)) {
      reasons.push('tên góc nghi bị nhận dạng sai (ký tự có dấu)');
      break;
    }
  }
  return reasons;
}
