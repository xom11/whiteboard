// src/stamps/geometry-2d/ai/rules/arbitraryPoint.ts
//
// Điểm TUỲ Ý nêu trong phần giả thiết (không kèm ràng buộc nào):
//   "Cho hình bình hành ABCD có O là giao điểm của hai đường chéo và một điểm M tùy ý."
//   "Cho đoạn thẳng AB có O là trung điểm và cho điểm M tùy ý."
// Đề vectơ lớp 10 hay đưa điểm M bất kỳ vào hình để chứng minh đẳng thức "với mọi M".
// Trước đây M không được dựng ⇒ hình thiếu M (named-missing). Dựng M là điểm tự do đặt
// lệch khỏi hình (không trùng đỉnh, không thẳng hàng tình cờ với cạnh mẫu).
//
// Chỉ nhận khi ngay sau "tùy ý/bất kì" KHÔNG có chỗ chứa ("trên", "thuộc", "trong",
// "nằm") — những dạng đó rule khác dựng đúng ràng buộc. Priority thấp nhất: định
// nghĩa nào khác của cùng tên đều thắng.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const RE = /(?:[Đđ]iểm|[Cc]ho|[Ll]ấy|và)\s+(?:một\s+)?(?:điểm\s+)?([A-Z])(?![A-Z'′])\s+(?:tùy\s*ý|tuỳ\s*ý|bất\s*k[ìỳ])(?!\s*(?:trên|thuộc|trong|nằm|ngoài|ở))/gu;

export const arbitraryPointRule: LanguageRule = {
  id: 'arbitraryPoint',
  priority: 5,
  languages: ['vi'],
  patterns: [/t[uù][ỳy]\s*ý|bất\s*k[ìỳ]/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const names = [...c.text.matchAll(RE)].map((m) => m[1]);
      if (names.length === 0) continue;
      out.push({
        ruleId: 'arbitraryPoint',
        clauseIds: [c.id],
        intents: names.map((n, i) => addPoint(n, { kind: 'free', at: [-2.3 - i, 4.1 + 0.7 * i] })),
      });
    }
    return out;
  },
};
