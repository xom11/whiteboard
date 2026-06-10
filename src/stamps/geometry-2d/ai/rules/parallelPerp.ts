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
import { drawLine, addPoint } from './_shared';

// "Qua/Từ <P> [kẻ/vẽ/dựng đường thẳng (d)] song song|vuông góc [với] [cạnh|đoạn] <PAIR>".
// group1 = through point; group2 = kind keyword; group3+4 = cặp đỉnh đường tham chiếu.
// [^.]{0,24}? bắc cầu cụm "kẻ đường thẳng (d) " nhưng KHÔNG vượt dấu '.'.
const RE = new RegExp(
  '(?:Qua|qua|Từ|từ)\\s+(?:điểm\\s+)?([A-Z])(?:[\'′]?)(?!\\p{L})' +
    '[^.]{0,24}?(song\\s*song|vuông\\s*góc)\\s+(?:với\\s+)?(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+)?' +
    '([A-Z])([A-Z])(?!\\p{L})',
  'gu',
);

// Đường thẳng qua P (song song|vuông góc) PAIR rồi CẮT 1 đường khác tại F:
//   "F là giao điểm của đường thẳng qua D vuông góc với BC và (đường)? CE"
//   "đường thẳng qua D vuông góc với BC cắt CE tại F"
// → drawLine(prpD/parD) + F = intersection(line, line2). line2 = cặp đỉnh.
const THROUGH_LINE =
  'đường\\s*thẳng\\s+qua\\s+([A-Z])(?:[\'′]?)(?!\\p{L})[^.]{0,24}?(song\\s*song|vuông\\s*góc)\\s+(?:với\\s+)?(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+)?([A-Z])([A-Z])(?!\\p{L})';
// Tên TRƯỚC: "F là giao điểm của <perp line> và (đường)? <pair>".
const RE_GIAO = new RegExp(
  '([A-Z])(?:[\'′]?)(?!\\p{L})\\s+là\\s+giao\\s*điểm\\s+(?:của\\s+)?' + THROUGH_LINE +
    '\\s+(?:và|với)\\s+(?:đường\\s*(?:thẳng\\s*)?)?([A-Z])([A-Z])(?!\\p{L})',
  'gu',
);
// Tên SAU: "<perp line> cắt <pair> tại F".
const RE_CUT = new RegExp(
  THROUGH_LINE + '\\s+cắt\\s+(?:đường\\s*(?:thẳng\\s*)?)?([A-Z])([A-Z])(?!\\p{L})\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

// Prefilter toàn đề (NON-global cho .test).
const PREFILTER =
  /(?:Qua|qua|Từ|từ)\s+(?:điểm\s+)?[A-Z][^.]{0,24}?(?:song\s*song|vuông\s*góc)|đường\s*thẳng\s+qua\s+[A-Z][^.]{0,24}?(?:song\s*song|vuông\s*góc)/u;

function lineNameOf(isParallel: boolean, through: string): string {
  return (isParallel ? 'par' : 'prp') + through;
}

export const parallelPerpRule: LanguageRule = {
  id: 'parallelPerp',
  priority: 58,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      // Line through P + CẮT đường khác tại F (tên trước/sau). Xử TRƯỚC RE để
      // không double-emit line (RE cũng khớp phần "qua D vuông góc BC").
      const cutSpans: Array<[number, number]> = [];
      const emitCut = (
        through: string, kw: string, refA: string, refB: string, line2: string, name: string,
        start: number, end: number,
      ) => {
        const isParallel = /song/.test(kw);
        const to = refA + refB;
        if (isParallel && to.includes(through)) return;
        const lineName = lineNameOf(isParallel, through);
        if (line2.includes(name) || lineName === name) return;
        out.push({
          ruleId: 'parallelPerp',
          clauseIds: [c.id],
          intents: [
            drawLine(lineName, isParallel ? 'parallelThrough' : 'perpThrough', { through, to }),
            addPoint(name, { kind: 'intersection', of: [lineName, line2] }),
          ],
        });
        cutSpans.push([start, end]);
      };
      RE_GIAO.lastIndex = 0;
      for (const m of c.text.matchAll(RE_GIAO)) {
        emitCut(m[2], m[3], m[4], m[5], m[6] + m[7], m[1], m.index ?? 0, (m.index ?? 0) + m[0].length);
      }
      RE_CUT.lastIndex = 0;
      for (const m of c.text.matchAll(RE_CUT)) {
        emitCut(m[1], m[2], m[3], m[4], m[5] + m[6], m[7], m.index ?? 0, (m.index ?? 0) + m[0].length);
      }

      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        // Bỏ qua nếu span nằm trong 1 match CẮT đã xử (tránh double drawLine).
        if (cutSpans.some(([a, b]) => (m.index ?? 0) >= a && (m.index ?? 0) < b)) continue;
        const through = m[1];
        const isParallel = /song/.test(m[2]);
        const to = m[3] + m[4];
        // Song song với đường CHỨA chính điểm qua → trùng đường đó (degenerate) → bỏ.
        if (isParallel && to.includes(through)) continue;
        const kind = isParallel ? 'parallelThrough' : 'perpThrough';
        const name = lineNameOf(isParallel, through);
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
