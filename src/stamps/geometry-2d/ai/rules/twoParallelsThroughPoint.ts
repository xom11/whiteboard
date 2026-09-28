// src/stamps/geometry-2d/ai/rules/twoParallelsThroughPoint.ts
//
// Qua MỘT điểm kẻ HAI đường song song, mỗi đường cắt một cạnh (phân phối):
//   "qua điểm D thuộc cạnh BC, kẻ các đường thẳng song song với AB và AC, cắt AC và
//    AB theo thứ tự ở E và F"
// → E = (đường qua D ∥ AB) ∩ AC ; F = (đường qua D ∥ AC) ∩ AB ; nối DE, DF.
// Trước đây `quad` vẽ tứ giác AEDF với E, F là đỉnh TỰ DO (E ≡ B) — hình sai mà full.
// Thà thiếu còn hơn sai: mỗi đường song song không được đi qua chính đoạn nó cắt
// song song, tên điểm cắt khác nhau và khác điểm qua.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect, drawLine } from './_shared';

const RE = new RegExp(
  String.raw`[Qq]ua\s+(?:điểm\s+)?([A-Z])(?![\p{L}\d'′])[^.]{0,30}?(?:kẻ|vẽ)\s+(?:các\s+|hai\s+)?đường\s*thẳng\s+song\s*song\s+(?:với\s+)?([A-Z])([A-Z])\s+và\s+([A-Z])([A-Z])(?![A-Z])` +
    String.raw`\s*,?\s*(?:chúng\s+)?cắt\s+(?:các\s+cạnh\s+|cạnh\s+)?([A-Z])([A-Z])\s+và\s+([A-Z])([A-Z])(?![A-Z])\s+(?:theo\s+thứ\s+tự\s+|lần\s*lượt\s+)(?:ở|tại)\s+([A-Z])\s+và\s+([A-Z])(?![\p{L}\d'′])`,
  'gu',
);

export const twoParallelsThroughPointRule: LanguageRule = {
  id: 'twoParallelsThroughPoint',
  priority: 59,
  languages: ['vi'],
  patterns: [/song\s*song\s+(?:với\s+)?[A-Z]{2}\s+và\s+[A-Z]{2}[^.]{0,20}cắt/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(RE)) {
        const [, d, a1, b1, a2, b2, c1, e1, c2, e2, p, q] = m;
        const cap = [
          [a1 + b1, c1 + e1, p],
          [a2 + b2, c2 + e2, q],
        ] as const;
        if (p === q || p === d || q === d) continue;
        if (cap.some(([ss, cut, ten]) => ss.includes(d) || [...ss].sort().join() === [...cut].sort().join() || cut.includes(ten))) continue;
        const intents = cap.flatMap(([ss, cut, ten]) => {
          const ln = `par${d}${ten}`;
          return [
            drawLine(ln, 'parallelThrough', { through: d, to: ss }),
            addPoint(ten, { kind: 'intersection', of: [ln, cut] }),
            connect(d, ten, 'segment'),
          ];
        });
        out.push({ ruleId: 'twoParallelsThroughPoint', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
