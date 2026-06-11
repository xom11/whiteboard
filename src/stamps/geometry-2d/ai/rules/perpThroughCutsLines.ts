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

// SINGLE: "(Một đường thẳng (đi)? )?(Qua|Từ) (điểm)? P ... (vuông góc|song song)
// với L1 ... cắt L2 (ở|tại) Q" — CHỈ 1 đường bị cắt, 1 giao điểm. Bài 30
// ("Kẻ đường thẳng qua D vuông góc OD, cắt AB ở K"), Bài 33 ("Một đường thẳng đi
// qua điểm D, vuông góc với OD và cắt BC tại E").
//   groups: 1=qua P, 2=kind, 3+4=L1, 5+6=L2, 7=giao Q.
const RE_SINGLE = new RegExp(
  '(?:Qua|qua|Từ|từ)\\s+(?:điểm\\s+)?([A-Z])(?:[\'′]?)(?!\\p{L})' +
    '[^.]{0,30}?(song\\s*song|vuông\\s*góc)\\s+(?:với\\s+)?(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+|đường\\s*thẳng\\s+)?' +
    '([A-Z])([A-Z])(?!\\p{L})' +
    '[^.]{0,30}?cắt\\s+(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+)?([A-Z])([A-Z])(?!\\p{L})\\s+(?:ở|tại)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

export const perpThroughCutsLinesRule: LanguageRule = {
  id: 'perpThroughCutsLines',
  priority: 50,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      let twoCut = false;
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        twoCut = true;
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

      // SINGLE-cut (chỉ khi clause KHÔNG khớp dạng 2-cut → tránh nhân đôi).
      if (twoCut) continue;
      RE_SINGLE.lastIndex = 0;
      for (const m of c.text.matchAll(RE_SINGLE)) {
        const through = m[1];
        const isParallel = /song/.test(m[2]);
        const to = m[3] + m[4];
        const l2 = m[5] + m[6];
        const q = m[7];
        if (isParallel && to.includes(through)) continue;
        if (l2.includes(q) || through === q) continue;
        const kind = isParallel ? 'parallelThrough' : 'perpThrough';
        const name = (isParallel ? 'par' : 'prp') + through;
        out.push({
          ruleId: 'perpThroughCutsLines',
          clauseIds: [c.id],
          intents: [
            drawLine(name, kind, { through, to }),
            addPoint(q, { kind: 'intersection', of: [name, l2] }),
          ],
        });
      }
    }
    return out;
  },
};
