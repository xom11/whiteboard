// src/stamps/geometry-2d/ai/rules/circumcircleNamedDistrib.ts
//
// "K, L lần lượt là (đường tròn)? ngoại tiếp (các)? tam giác BQF, CQE"
//   → drawCircle K through3(B,Q,F), drawCircle L through3(C,Q,E).
//
// circleTriangle xử lý "đường tròn (K) ngoại tiếp tam giác BQF" (1 cái); rule này
// lo dạng PHÂN PHỐI đặt tên đường tròn ngoại tiếp 2 tam giác.
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { drawCircle } from './_shared';

const PREFILTER = /lần\s*lượt\s+là\s+(?:đường\s*tròn\s+)?ngoại\s*tiếp/u;

// group1+2 = 2 tên đường tròn, 3..5 = đỉnh tam giác 1, 6..8 = đỉnh tam giác 2.
const RE = new RegExp(
  '([A-Z])\\s*,\\s*([A-Z])\\s+lần\\s*lượt\\s+là\\s+(?:đường\\s*tròn\\s+)?ngoại\\s*tiếp\\s+(?:các\\s+)?tam\\s*giác\\s+' +
    '([A-Z])([A-Z])([A-Z])(?![A-Z])\\s*,\\s*(?:tam\\s*giác\\s+)?([A-Z])([A-Z])([A-Z])(?![A-Z])',
  'u',
);

export const circumcircleNamedDistribRule: LanguageRule = {
  id: 'circumcircleNamedDistrib',
  priority: 67,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (!m) continue;
      const n1 = m[1];
      const n2 = m[2];
      const tri1 = [m[3], m[4], m[5]];
      const tri2 = [m[6], m[7], m[8]];
      if (n1 === n2) continue;
      out.push({
        ruleId: 'circumcircleNamedDistrib',
        clauseIds: [c.id],
        intents: [
          drawCircle(n1, 'through3', { points: tri1 }),
          drawCircle(n2, 'through3', { points: tri2 }),
        ],
      });
    }
    return out;
  },
};
