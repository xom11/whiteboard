// src/stamps/geometry-2d/ai/rules/parallelPerp.ts
//
// Đường thẳng QUA 1 điểm, song song / vuông góc với 1 đường (cặp đỉnh):
//   "Qua A kẻ đường thẳng song song với BC"  → draw-line parallelThrough A→BC
//   "Từ A vẽ đường thẳng vuông góc với BC"   → draw-line perpThrough A→BC
//
// Phân biệt với perpFoot ("Kẻ AH vuông góc BC" → chân H): rule này BẮT BUỘC mở
// đầu "Qua/Từ <P>" (P = điểm đường thẳng đi qua, KHÔNG sinh chân). perpFoot
// không có tiền tố "Qua/Từ" nên 2 rule không chồng.
//
// Tên line không nêu trong đề → synthesize ("parA"/"prpA"); guard chỉ track điểm
// HOA nên line name không bị đòi. Nếu đề có "cắt … tại N" (giao điểm) → phần đó
// KHÔNG được claim → coverage/guard escalate (an toàn) thay vì dựng thiếu N.
//
// GOTCHA \b: dùng (?!\p{L}) + cờ 'u' quanh ký tự Việt.
import type { LanguageRule, RuleMatch } from './_types';
import { drawLine } from './_shared';

// "Qua/Từ <P> [kẻ/vẽ/dựng đường thẳng (d)] song song|vuông góc [với] [cạnh|đoạn] <PAIR>".
// group1 = through point; group2 = kind keyword; group3+4 = cặp đỉnh đường tham chiếu.
// [^.]{0,24}? bắc cầu cụm "kẻ đường thẳng (d) " nhưng KHÔNG vượt dấu '.'.
const RE = new RegExp(
  '(?:Qua|qua|Từ|từ)\\s+(?:điểm\\s+)?([A-Z])(?:[\'′]?)(?!\\p{L})' +
    '[^.]{0,24}?(song\\s*song|vuông\\s*góc)\\s+(?:với\\s+)?(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+)?' +
    '([A-Z])([A-Z])(?!\\p{L})',
  'gu',
);

// Prefilter toàn đề (NON-global cho .test).
const PREFILTER =
  /(?:Qua|qua|Từ|từ)\s+(?:điểm\s+)?[A-Z][^.]{0,24}?(?:song\s*song|vuông\s*góc)/u;

export const parallelPerpRule: LanguageRule = {
  id: 'parallelPerp',
  priority: 58,
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
        // Song song với đường CHỨA chính điểm qua → trùng đường đó (degenerate) → bỏ.
        if (isParallel && to.includes(through)) continue;
        const kind = isParallel ? 'parallelThrough' : 'perpThrough';
        const name = (isParallel ? 'par' : 'prp') + through;
        out.push({
          ruleId: 'parallelPerp',
          clauseIds: [c.id],
          intents: [drawLine(name, kind, { through, to })],
        });
      }
    }
    return out;
  },
};
