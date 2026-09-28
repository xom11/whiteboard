// Chuẩn hoá đề trước khi chạy rule 3D:
//  1. NFC — chữ Việt dạng tổ hợp (NFD, "i" + dấu huyền rời; copy từ PDF/web/macOS) làm mọi regex trượt.
//  2. Ký hiệu font Symbol trong vùng Private Use (U+F0xx — PDF nhúng font Symbol, copy ra thành PUA):
//     "(SBC)" thành "SBC", "SA ⊥" thành "" … ⇒ rule không thấy ngoặc/dấu. Ánh xạ
//     về ký tự Unicode tương ứng của bảng mã Symbol (chỉ các ký tự gặp trong đề hình học).
const SYMBOL_PUA: Record<string, string> = {
  '': '(', '': ')', '': '=', '': '+', '': '−', '': '/',
  '': '′', '': 'Δ', '': '⊥', '': '°', '': '∩', '': '∈',
  '': '≠', '': 'α', '': 'β', '': 'γ', '': 'π', '': 'φ',
};

export function normalizeProblem3d(problem: string): string {
  return problem.normalize('NFC').replace(/[-]/gu, (c) => SYMBOL_PUA[c] ?? c);
}
