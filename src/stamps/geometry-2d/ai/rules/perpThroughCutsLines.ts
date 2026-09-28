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

// Token đường bị cắt: đoạn 2-HOA "DC" HOẶC tia/đường ĐẶT TÊN "Ax"/"By"/"d1"
// (HOA+thường+số) — vxhung:23 "cắt Ax, By thứ tự tại C và D".
const LTOK = '(?:[A-Z]{2}|[A-Z][a-z][0-9]?)';
// group1 = điểm qua; group2 = kind; group3+4 = đường tham chiếu;
// group5, group6 = hai đường bị cắt; group7, group8 = hai giao điểm.
const RE = new RegExp(
  '(?:Qua|qua|Từ|từ)\\s+(?:một\\s+)?(?:điểm\\s+)?([A-Z])(?:[\'′]?)(?!\\p{L})' +
    '[^.]{0,24}?(song\\s*song|vuông\\s*góc)\\s+(?:với\\s+)?(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+)?' +
    '([A-Z])([A-Z])(?!\\p{L})' +
    `[^.]{0,40}?cắt\\s+(?:các\\s+|hai\\s+)?(?:đường\\s*thẳng\\s+|cạnh\\s+|tia\\s+)?(${LTOK})\\s*(?:,|và)\\s*(${LTOK})(?![A-Z])` +
    '[^.]{0,30}?(?:ở|tại)\\s+(?:(?:các|hai)\\s+điểm\\s+)?([A-Z])\\s*(?:,|và)\\s*([A-Z])(?![A-Z])',
  'gu',
);

const PREFILTER =
  /(?:Qua|qua|Từ|từ)\s+(?:một\s+)?(?:điểm\s+)?[A-Z][^.]{0,40}?(?:song\s*song|vuông\s*góc)[^.]{0,80}?cắt/u;
// Tia ĐẶT TÊN theo điểm gốc: "Kẻ Ex song song với BC cắt AB tại M" (Ex = tia gốc E).
const PREFILTER_RAY = /[Kk]ẻ\s+(?:tia\s+|đường\s*thẳng\s+)?[A-Z][xyzt](?!\p{L})\s+(?:song\s*song|vuông\s*góc)/u;
const RE_NAMED_RAY = new RegExp(
  String.raw`[Kk]ẻ\s+(?:tia\s+|đường\s*thẳng\s+)?([A-Z])[xyzt](?!\p{L})\s+(song\s*song|vuông\s*góc)\s+(?:với\s+)?(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+)?([A-Z])([A-Z])(?!\p{L})[^.]{0,20}?cắt\s+(?:đường\s*thẳng\s+|cạnh\s+|đoạn\s+)?([A-Z])([A-Z])(?!\p{L})\s+(?:ở|tại)\s+(?:điểm\s+)?([A-Z])(?![A-Z])`,
  'gu',
);
// "Từ (một)? điểm E trên (cạnh|đoạn) AC vẽ …" — điểm qua chưa có ⇒ dựng luôn E trên AC.
const DIEM_TREN_CANH = /(?:Qua|qua|Từ|từ)\s+(?:một\s+)?điểm\s+([A-Z])(?![A-Z'′])\s+(?:trên|thuộc)\s+(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+)?([A-Z]{2})(?![A-Z])/u;
// Vế NỐI TIẾP cùng điểm qua: "… và đường thẳng song song với AB cắt BC tại D".
const VE_NOI_TIEP = new RegExp(
  String.raw`^[^.]*?\s+và\s+(?:một\s+)?đường\s*thẳng\s+(song\s*song|vuông\s*góc)\s+(?:với\s+)?(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+)?([A-Z])([A-Z])(?!\p{L})[^.]{0,20}?cắt\s+(?:đường\s*thẳng\s+|cạnh\s+|đoạn\s+)?([A-Z])([A-Z])(?!\p{L})\s+(?:ở|tại)\s+(?:điểm\s+)?([A-Z])(?![A-Z])`,
  'u',
);

// SINGLE: "(Một đường thẳng (đi)? )?(Qua|Từ) (điểm)? P ... (vuông góc|song song)
// với L1 ... cắt L2 (ở|tại) Q" — CHỈ 1 đường bị cắt, 1 giao điểm. Bài 30
// ("Kẻ đường thẳng qua D vuông góc OD, cắt AB ở K"), Bài 33 ("Một đường thẳng đi
// qua điểm D, vuông góc với OD và cắt BC tại E").
//   groups: 1=qua P, 2=kind, 3+4=L1, 5+6=L2, 7=giao Q.
// group 5 = chân TÙY CHỌN trên đường ⊥ ("tại E" giữa L1 và "cắt"); group6+7=L2;
// group8=giao. Chân chỉ khớp khi tên đứng RIÊNG (?![A-Za-z]) → KHÔNG bắt "Evà"
// dính (giữ nguyên hành vi cũ với OCR-glue, tránh regress).
const RE_SINGLE = new RegExp(
  '(?:Qua|qua|Từ|từ)\\s+(?:một\\s+)?(?:điểm\\s+)?([A-Z])(?:[\'′]?)(?!\\p{L})' +
    '[^.]{0,30}?(song\\s*song|vuông\\s*góc)\\s+(?:với\\s+)?(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+|đường\\s*thẳng\\s+)?' +
    '([A-Z])([A-Z])(?!\\p{L})' +
    '(?:\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Za-z]))?' +
    // L2 có thể là tia đặt tên chữ thường "Oy" (góc xOy — lớp 8).
    '[^.]{0,30}?cắt\\s+(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+|tia\\s+)?([A-Z])([A-Z]|[xyzt])(?!\\p{L})\\s+(?:ở|tại)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

export const perpThroughCutsLinesRule: LanguageRule = {
  id: 'perpThroughCutsLines',
  priority: 50,
  languages: ['vi'],
  patterns: [PREFILTER, PREFILTER_RAY],
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
        const line1 = m[5];
        const line2 = m[6];
        const h = m[7];
        const k = m[8];
        if (isParallel && to.includes(through)) continue; // degenerate
        if (h === k) continue;
        // "song song với AB VÀ AC, cắt AC và AB …" = HAI đường (parallelsThroughCut lo);
        // đọc thành một đường ∥ AB cắt cả AB ⇒ giao hai đường song song (điểm rác).
        if (/^\s*(?:,|và)\s*(?:(?:cạnh|đường\s*thẳng)\s+)?[A-Z]{2}(?![A-Z])/u.test(c.text.slice((m.index ?? 0) + m[0].indexOf(m[3] + m[4], m[0].search(/song|vuông/u)) + 2))) continue;
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
        const foot = m[5]; // chân trên đường ⊥ (tùy chọn)
        const l2 = m[6] + m[7];
        const q = m[8];
        if (isParallel && to.includes(through)) continue;
        if (l2.includes(q) || through === q) continue;
        const kind = isParallel ? 'parallelThrough' : 'perpThrough';
        const name = (isParallel ? 'par' : 'prp') + through;
        const intents = [drawLine(name, kind, { through, to })];
        // Chân E = giao đường ⊥ với đường-tham-chiếu (to). Bỏ nếu trùng q/đầu mút.
        if (foot && foot !== q && !to.includes(foot) && foot !== through) {
          intents.push(addPoint(foot, { kind: 'intersection', of: [name, to] }));
        }
        intents.push(addPoint(q, { kind: 'intersection', of: [name, l2] }));
        // Điểm qua được giới thiệu ngay trong câu ("Từ một điểm E trên cạnh AC …").
        const dm = DIEM_TREN_CANH.exec(m[0]);
        if (dm && dm[1] === through && !dm[2].includes(through)) {
          intents.unshift(addPoint(through, { kind: 'onSegment', of: dm[2] }));
        }
        // Vế thứ hai cùng điểm qua: "… và đường thẳng song song với AB cắt BC tại D".
        const nt = VE_NOI_TIEP.exec(c.text.slice(m.index! + m[0].length));
        if (nt) {
          const par2 = /song/.test(nt[1]);
          const to2 = nt[2] + nt[3];
          const l3 = nt[4] + nt[5];
          const q2 = nt[6];
          if (!(par2 && to2.includes(through)) && !l3.includes(q2) && q2 !== q && q2 !== through) {
            const name2 = (par2 ? 'par' : 'prp') + through + (par2 === isParallel ? '2' : '');
            intents.push(
              drawLine(name2, par2 ? 'parallelThrough' : 'perpThrough', { through, to: to2 }),
              addPoint(q2, { kind: 'intersection', of: [name2, l3] }),
            );
          }
        }
        out.push({ ruleId: 'perpThroughCutsLines', clauseIds: [c.id], intents });
      }
      // "Kẻ Ex song song với BC cắt AB tại M" — tia đặt tên theo gốc E.
      for (const m of c.text.matchAll(RE_NAMED_RAY)) {
        const through = m[1];
        const isParallel = /song/.test(m[2]);
        const to = m[3] + m[4];
        const l2 = m[5] + m[6];
        const q = m[7];
        if ((isParallel && to.includes(through)) || l2.includes(q) || through === q) continue;
        const name = (isParallel ? 'par' : 'prp') + through;
        out.push({
          ruleId: 'perpThroughCutsLines',
          clauseIds: [c.id],
          intents: [
            drawLine(name, isParallel ? 'parallelThrough' : 'perpThrough', { through, to }),
            addPoint(q, { kind: 'intersection', of: [name, l2] }),
          ],
        });
      }
    }
    return out;
  },
};
