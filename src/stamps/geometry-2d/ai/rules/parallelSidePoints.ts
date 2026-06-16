// src/stamps/geometry-2d/ai/rules/parallelSidePoints.ts
//
// Điểm trên cạnh xác định bởi RÀNG BUỘC SONG SONG (distributive 2 điểm):
//   "Q, R lần lượt thuộc AC và AB sao cho PQ ∥ AB, PR ∥ AC"   (hinh9:59, son123:44)
//     → Q = (đường qua P song song AB) ∩ AC
//       R = (đường qua P song song AC) ∩ AB
//
// Mỗi điểm N (thuộc Lᵢ) có đoạn <anchor>N ∥ Pᵢ → N = giao của đường-song-song-qua-
// anchor-với-Pᵢ và Lᵢ. anchor = chữ ĐẦU của đoạn (P trong "PQ"). Cả 2 đoạn phải
// CÙNG anchor (P). Self-contained khi anchor + các cạnh đã dựng (tam giác).
//
// GOTCHA \b: ký tự Việt → cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /thuộc\s+[A-Z]{2}\s+và\s+[A-Z]{2}\s+sao\s+cho[^.]*?(?:∥|\/\/|song\s*song)/u;

// "N1, N2 (lần lượt)? thuộc L1 và L2 sao cho A N1 ∥ P1, A N2 ∥ P2".
//  ∥ | // | "song song". groups: 1=n1 2=n2 3=L1 4=L2 | seg1 5=a1 6=n1b 7=par1 |
//  seg2 8=a2 9=n2b 10=par2.
const PAR = '(?:∥|\\/\\/|song\\s*song(?:\\s+với)?)';
const RE = new RegExp(
  '([A-Z])\\s*,\\s*([A-Z])(?![A-Z])\\s+(?:lần\\s*lượt\\s+|theo\\s+thứ\\s+tự\\s+)?thuộc\\s+' +
    '([A-Z]{2})\\s+và\\s+([A-Z]{2})(?![A-Z])\\s+sao\\s+cho\\s+' +
    '([A-Z])([A-Z])(?![A-Z])\\s*' + PAR + '\\s*([A-Z]{2})(?![A-Z])\\s*(?:,|và)\\s*' +
    '([A-Z])([A-Z])(?![A-Z])\\s*' + PAR + '\\s*([A-Z]{2})(?![A-Z])',
  'u',
);

export const parallelSidePointsRule: LanguageRule = {
  id: 'parallel-side-points',
  priority: 55,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (!m) continue;
      const [n1, n2, l1, l2, a1, n1b, par1, a2, n2b, par2] = m.slice(1);
      // đoạn phải khớp tên điểm + 2 đoạn cùng anchor.
      if (n1b !== n1 || n2b !== n2 || a1 !== a2) continue;
      const anchor = a1;
      const line1 = `par_${anchor}${par1}`;
      const line2 = `par_${anchor}${par2}`;
      const intents: IntentT[] = [
        drawLine(line1, 'parallelThrough', { through: anchor, to: par1 }),
        addPoint(n1, { kind: 'intersection', of: [line1, l1] }),
        drawLine(line2, 'parallelThrough', { through: anchor, to: par2 }),
        addPoint(n2, { kind: 'intersection', of: [line2, l2] }),
      ];
      out.push({ ruleId: 'parallel-side-points', clauseIds: [c.id], intents });
    }
    return out;
  },
};
