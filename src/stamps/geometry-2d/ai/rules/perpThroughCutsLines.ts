// src/stamps/geometry-2d/ai/rules/perpThroughCutsLines.ts
//
// Đường thẳng QUA 1 điểm (song song / vuông góc với 1 đường) RỒI CẮT hai đường
// khác tại hai điểm đặt tên:
//   "Qua B kẻ đường thẳng vuông góc với DE, đường thẳng này cắt các đường thẳng
//    DE và DC theo thứ tự ở H và K"
//     → draw-line prpB (perpThrough B→DE)  [trùng parallelPerp → dedup]
//       H = giao(prpB, DE);  K = giao(prpB, DC)
//
// parallelPerp chỉ dựng được đường thẳng, KHÔNG dựng giao điểm ⇒ "ở H và K" bị
// bỏ → coverage/guard escalate. Rule này phủ TRỌN câu (đường + 2 giao) để render
// được. Tên line theo CÙNG quy ước parallelPerp ('prp'/'par' + điểm qua) nên
// intent draw-line trùng JSON và bị dedup, không tạo 2 đường.
//
// GOTCHA \b: dùng (?!\p{L}) + cờ 'u' quanh ký tự Việt.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

// group1 = điểm qua; group2 = kind; group3+4 = đường tham chiếu;
// group5+6, group7+8 = hai đường bị cắt; group9, group10 = hai giao điểm.
const RE = new RegExp(
  '(?:Qua|qua|Từ|từ)\\s+(?:điểm\\s+)?([A-Z])(?:[\'′]?)(?!\\p{L})' +
    '[^.]{0,24}?(song\\s*song|vuông\\s*góc)\\s+(?:với\\s+)?(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+)?' +
    '([A-Z])([A-Z])(?!\\p{L})' +
    '[^.]{0,40}?cắt\\s+(?:các\\s+)?(?:đường\\s*thẳng\\s+)?([A-Z])([A-Z])\\s*(?:,|và)\\s*([A-Z])([A-Z])(?![A-Z])' +
    '[^.]{0,30}?(?:ở|tại)\\s+([A-Z])\\s*(?:,|và)\\s*([A-Z])(?![A-Z])',
  'gu',
);

const PREFILTER =
  /(?:Qua|qua|Từ|từ)\s+(?:điểm\s+)?[A-Z][^.]{0,24}?(?:song\s*song|vuông\s*góc)[^.]{0,80}?cắt/u;

export const perpThroughCutsLinesRule: LanguageRule = {
  id: 'perpThroughCutsLines',
  priority: 50,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const through = m[1];
        const isParallel = /song/.test(m[2]);
        const to = m[3] + m[4];
        const line1 = m[5] + m[6];
        const line2 = m[7] + m[8];
        const h = m[9];
        const k = m[10];
        if (isParallel && to.includes(through)) continue; // degenerate
        if (h === k) continue;
        const kind = isParallel ? 'parallelThrough' : 'perpThrough';
        const name = (isParallel ? 'par' : 'prp') + through;
        out.push({
          ruleId: 'perpThroughCutsLines',
          clauseIds: [c.id],
          intents: [
            drawLine(name, kind, { through, to }),
            addPoint(h, { kind: 'intersection', of: [name, line1] }),
            addPoint(k, { kind: 'intersection', of: [name, line2] }),
          ],
        });
      }
    }
    return out;
  },
};
