// src/stamps/geometry-2d/ai/rules/twoPerpLinesMeet.ts
//
// Giao của HAI đường vuông-góc-qua-điểm:
//   "Đường thẳng qua M vuông góc với BM cắt đường thẳng qua N vuông góc với CN tại S"
//     → prpM = perpThrough(M, BM); prpN = perpThrough(N, CN); S = prpM ∩ prpN.
//
// Tên đường theo quy ước parallelPerp ("prp"+điểm-qua) → dedup nếu rule khác đã
// dựng cùng đường. KHÁC perpThroughCutsLines (1 đường ⊥ cắt 2 đường có sẵn): ở
// đây 2 đường ⊥ riêng biệt giao NHAU.
//
// GOTCHA \b: ký tự Việt → cờ 'u' + (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /[Đđ]ường\s*thẳng\s+qua\s+[A-Z][^.]{0,30}?(?:vuông\s*góc|⊥)[^.]{0,40}?cắt\s+[Đđ]ường\s*thẳng\s+qua/u;

const RE = new RegExp(
  '[Đđ]ường\\s*thẳng\\s+qua\\s+([A-Z])(?!\\p{L})\\s+(?:vuông\\s*góc|⊥)\\s+(?:với\\s+)?([A-Z])([A-Z])(?![A-Z])' +
    '[^.]{0,20}?cắt\\s+[Đđ]ường\\s*thẳng\\s+qua\\s+([A-Z])(?!\\p{L})\\s+(?:vuông\\s*góc|⊥)\\s+(?:với\\s+)?([A-Z])([A-Z])(?![A-Z])' +
    '\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

export const twoPerpLinesMeetRule: LanguageRule = {
  id: 'twoPerpLinesMeet',
  priority: 49, // sau parallelPerp (dựng đường), trước/đủ để S tham chiếu 2 đường
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const p1 = m[1];
        const l1 = m[2] + m[3];
        const p2 = m[4];
        const l2 = m[5] + m[6];
        const s = m[7];
        if (p1 === p2 || s === p1 || s === p2) continue;
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
      }
    }
    return out;
  },
};
