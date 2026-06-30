// src/stamps/geometry-2d/ai/rules/twoPerpLinesMeet.ts
//
// Giao của HAI đường vuông-góc-qua-điểm.
//
// Dạng 1 (gốc, 2 mệnh đề tách rời):
//   "Đường thẳng qua M vuông góc với BM cắt đường thẳng qua N vuông góc với CN tại S"
//     → prpM = perpThrough(M, BM); prpN = perpThrough(N, CN); S = prpM ∩ prpN.
//
// Dạng 2 (phân phối — gộp 2 đường vào 1 cụm):
//   "Đường thẳng qua E,F lần lượt vuông góc với OC,OB cắt nhau tại X"
//     → zip E↔OC, F↔OB → prpE = perpThrough(E, OC); prpF = perpThrough(F, OB);
//       X = prpE ∩ prpF.
//   (parallelPerp chỉ catch ĐƯỜNG ĐẦU "qua E ⊥ OC" → prpE, KHÔNG dựng prpF/X →
//    coverage báo named-missing X. Rule này emit đủ cả 3; prpE byte-identical với
//    parallelPerp nên dedup theo JSON.)
//
// Tên đường theo quy ước parallelPerp ("prp"+điểm-qua) → dedup nếu rule khác đã
// dựng cùng đường. KHÁC perpThroughCutsLines (1 đường ⊥ cắt 2 đường có sẵn): ở
// đây 2 đường ⊥ riêng biệt giao NHAU.
//
// GOTCHA \b: ký tự Việt → cờ 'u' + (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

// PREFILTER nhận CẢ ba dạng: (a) "…cắt đường thẳng qua…" (gốc), (b) "…cắt
// nhau…" (phân phối), (c) mở "Qua/Từ <P> vẽ/kẻ đường thẳng ⊥ <L1> cắt đường thẳng
// qua <P2> ⊥ <L2> tại <S>" (C28 — vế đầu điểm-qua đứng TRƯỚC "đường thẳng" + động
// từ vẽ/kẻ). Đều có "vuông góc/⊥ … cắt đường thẳng qua …".
const PREFILTER =
  /(?:[Đđ]ường\s*thẳng\s+qua|(?:Qua|qua|Từ|từ)\s+[A-Z][^.]{0,20}?(?:vẽ|kẻ|dựng)\s+đường\s*thẳng)\s*[^.]{0,30}?(?:vuông\s*góc|⊥)[^.]{0,40}?cắt\s+(?:[Đđ]ường\s*thẳng\s+qua|nhau)/u;

const RE = new RegExp(
  '[Đđ]ường\\s*thẳng\\s+qua\\s+([A-Z])(?!\\p{L})\\s+(?:vuông\\s*góc|⊥)\\s+(?:với\\s+)?([A-Z])([A-Z])(?![A-Z])' +
    '[^.]{0,20}?cắt\\s+[Đđ]ường\\s*thẳng\\s+qua\\s+([A-Z])(?!\\p{L})\\s+(?:vuông\\s*góc|⊥)\\s+(?:với\\s+)?([A-Z])([A-Z])(?![A-Z])' +
    '\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

// Dạng 3 (C28): vế đầu MỞ bằng điểm-qua TRƯỚC "đường thẳng" + động từ vẽ/kẻ/dựng:
//   "Qua A vẽ đường thẳng vuông góc với AN cắt đường thẳng qua O vuông góc BC tại D"
//   → prpA = perpThrough(A, AN); prpO = perpThrough(O, BC); D = prpA ∩ prpO.
// Vế đầu: "Qua/Từ <P1> [vẽ|kẻ|dựng] đường thẳng [thẳng]? ⊥ [với]? <L1>"; vế sau =
// nhánh "cắt đường thẳng qua <P2> ⊥ [với]? <L2> tại <S>" (giống RE gốc). KHÁC
// parallelPerp (chỉ dựng 2 đường, KHÔNG dựng giao S → coverage báo named-missing S).
const RE_DRAW_FIRST = new RegExp(
  '(?:Qua|qua|Từ|từ)\\s+(?:điểm\\s+)?([A-Z])(?!\\p{L})\\s*' +
    '[^.]{0,16}?(?:vẽ|kẻ|dựng)\\s+đường\\s*thẳng\\s+(?:vuông\\s*góc|⊥)\\s+(?:với\\s+)?([A-Z])([A-Z])(?![A-Z])' +
    '\\s*[^.]{0,16}?cắt\\s+[Đđ]ường\\s*thẳng\\s+qua\\s+([A-Z])(?!\\p{L})\\s+(?:vuông\\s*góc|⊥)\\s+(?:với\\s+)?([A-Z])([A-Z])(?![A-Z])' +
    '\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

// Dạng phân phối: "qua <P1>,<P2> (lần lượt|theo thứ tự)? ⊥ <L1>,<L2> cắt nhau tại <S>".
// P1,P2 = HOA đơn; L1,L2 = cặp đỉnh (2 HOA); S = HOA đơn. Zip P1↔L1, P2↔L2.
const RE_DISTRIB = new RegExp(
  '[Đđ]ường\\s*thẳng\\s+qua\\s+([A-Z])(?!\\p{L})\\s*,\\s*([A-Z])(?!\\p{L})\\s+' +
    '(?:lần\\s*lượt\\s+|theo\\s*thứ\\s*tự\\s+)?(?:vuông\\s*góc|⊥)\\s+(?:với\\s+)?' +
    '([A-Z])([A-Z])(?![A-Z])\\s*,\\s*([A-Z])([A-Z])(?![A-Z])' +
    '[^.]{0,20}?cắt\\s+nhau\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

export const twoPerpLinesMeetRule: LanguageRule = {
  id: 'twoPerpLinesMeet',
  priority: 49, // sau parallelPerp (dựng đường), trước/đủ để S tham chiếu 2 đường
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    const emit = (c: { id: number }, p1: string, l1: string, p2: string, l2: string, s: string) => {
      if (p1 === p2 || s === p1 || s === p2) return;
      const n1 = `prp${p1}`;
      const n2 = `prp${p2}`;
      out.push({
        ruleId: 'twoPerpLinesMeet',
        clauseIds: [c.id],
        intents: [
          drawLine(n1, 'perpThrough', { through: p1, to: l1 }),
          drawLine(n2, 'perpThrough', { through: p2, to: l2 }),
          addPoint(s, { kind: 'intersection', of: [n1, n2] }),
        ],
      });
    };
    for (const c of ctx.clauses) {
      // Dạng gốc (2 mệnh đề tách rời).
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        emit(c, m[1], m[2] + m[3], m[4], m[5] + m[6], m[7]);
      }
      // Dạng 3 (C28): vế đầu mở "Qua/Từ <P> vẽ/kẻ đường thẳng ⊥ <L1>".
      RE_DRAW_FIRST.lastIndex = 0;
      for (const m of c.text.matchAll(RE_DRAW_FIRST)) {
        emit(c, m[1], m[2] + m[3], m[4], m[5] + m[6], m[7]);
      }
      // Dạng phân phối: zip <P1>↔<L1>, <P2>↔<L2>.
      RE_DISTRIB.lastIndex = 0;
      for (const m of c.text.matchAll(RE_DISTRIB)) {
        emit(c, m[1], m[3] + m[4], m[2], m[5] + m[6], m[7]);
      }
    }
    return out;
  },
};
