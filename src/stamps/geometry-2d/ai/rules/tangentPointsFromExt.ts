// src/stamps/geometry-2d/ai/rules/tangentPointsFromExt.ts
//
// "Từ A kẻ tới đường tròn ngoại tiếp tam giác BIC các tiếp tuyến AP, AQ
//  (P, Q là các tiếp điểm)" — 2 tiếp tuyến từ điểm NGOÀI A, 2 tiếp điểm P, Q.
//   → P = tangentPoint(A, circle, which=0); Q = tangentPoint(A, circle, which=1)
//     + đoạn AP, AQ.
//
// Tiếp tuyến đặt tên "AP","AQ" (chữ đầu = điểm ngoài A, chữ sau = tiếp điểm).
// Circle: "(X)" tường minh, else đường tròn (ngoại|nội) tiếp tam giác → tên mặc
// định 'O' (circleTriangle dùng 'O' khi không nêu tâm).
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const PREFILTER = /[Tt]ừ\s+(?:điểm\s+)?[A-Z][^.]{0,60}?tiếp\s*tuyến\s+[A-Z]{2}\s*,\s*[A-Z]{2}/u;

// group1=điểm ngoài A, 2+3=tiếp tuyến 1 (AP), 4+5=tiếp tuyến 2 (AQ).
const RE = new RegExp(
  '[Tt]ừ\\s+(?:điểm\\s+)?([A-Z])(?!\\p{L})[^.]{0,60}?tiếp\\s*tuyến\\s+([A-Z])([A-Z])\\s*,\\s*([A-Z])([A-Z])(?!\\p{L})',
  'gu',
);
const PAREN_CIRCLE = /\(\s*([A-Z])\s*\)/u;

export const tangentPointsFromExtRule: LanguageRule = {
  id: 'tangentPointsFromExt',
  priority: 50,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const from = m[1];
        // 2 tiếp tuyến phải cùng bắt đầu bằng điểm ngoài; tiếp điểm = chữ thứ 2.
        if (m[2] !== from || m[4] !== from) continue;
        const p = m[3];
        const q = m[5];
        if (p === q) continue;
        // Circle: "(X)" trong clause, else mặc định 'O' (circleTriangle default).
        const par = PAREN_CIRCLE.exec(c.text);
        const circle = par ? par[1] : 'O';
        out.push({
          ruleId: 'tangentPointsFromExt',
          clauseIds: [c.id],
          intents: [
            addPoint(p, { kind: 'tangentPoint', from, circle, which: 0 }),
            addPoint(q, { kind: 'tangentPoint', from, circle, which: 1 }),
            connect(from, p, 'segment'),
            connect(from, q, 'segment'),
          ],
        });
      }
    }
    return out;
  },
};
