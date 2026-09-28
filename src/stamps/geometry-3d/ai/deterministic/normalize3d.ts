// Chuẩn hoá đề 3D ở ĐẦU pipeline (một hàm duy nhất — chuanHoa3d.ts re-export tên lớp 12):
//  1. NFC — chữ Việt dạng tổ hợp (NFD, "i" + dấu huyền rời; copy từ PDF/web/macOS) làm mọi regex trượt.
//  2. Ký hiệu font Symbol trong vùng Private Use (U+F0xx — PDF nhúng font Symbol): "(SBC)" thành
//     "SBC", "⊥" thành "" … ⇒ ánh xạ về ký tự Unicode của bảng mã Symbol.
//  3. Dấu phẩy trên (′ ’ ‘ ´ `) → ' ; ◦ º → ° ; NBSP → space — mọi rule thấy cùng một dạng nhãn A'.
const SYMBOL_PUA: Record<string, string> = {
  '': '(', '': ')', '': '=', '': '+', '': '−', '': '/',
  '': "'", '': 'Δ', '': '⊥', '': '°', '': '∩', '': '∈',
  '': '≠', '': 'α', '': 'β', '': 'γ', '': 'π', '': 'φ',
};

export function normalizeProblem3d(problem: string): string {
  return problem
    .normalize('NFC')
    .replace(/[-]/gu, (c) => SYMBOL_PUA[c] ?? c)
    .replace(/[’‘´`′]/gu, "'")
    .replace(/[◦º]/gu, '°')
    .replace(/ /gu, ' ');
}
