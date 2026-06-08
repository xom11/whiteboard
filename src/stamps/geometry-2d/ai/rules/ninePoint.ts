// src/stamps/geometry-2d/ai/rules/ninePoint.ts
//
// Đường tròn chín điểm / đường tròn Euler (issue #47, construct 4): đường tròn qua
// 3 trung điểm cạnh (= cũng qua 3 chân đường cao + 3 trung điểm đỉnh-trực tâm;
// bán kính R/2). Dựng = circle3 qua 3 TRUNG ĐIỂM CẠNH — TRÁNH radius-scaling.
// Compose midpoint×3 + circle3, KHÔNG kind DSL mới.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawCircle } from './_shared';

// "đường tròn chín điểm" / "đường tròn Euler" / "chín điểm". KHÔNG khớp "đường
// thẳng Euler" (yêu cầu "tròn" trước Euler — đó là đường thẳng Euler, construct 1).
const NINE_KW = /(?<!\p{L})(?:đường\s*tròn\s+Euler|(?:đường\s*tròn\s+)?chín\s*điểm)(?!\p{L})/u;
const TRI_G = /tam giác\s+([A-Z])([A-Z])([A-Z])/gu;

function uniqueTriangle(problem: string): [string, string, string] | undefined {
  TRI_G.lastIndex = 0;
  const tris: string[][] = [];
  let m: RegExpExecArray | null;
  while ((m = TRI_G.exec(problem)) !== null) tris.push([m[1], m[2], m[3]]);
  const distinct = new Set(tris.map((t) => t.join('')));
  if (distinct.size !== 1) return undefined;
  const t = tris[0];
  return [t[0], t[1], t[2]];
}

export const ninePointRule: LanguageRule = {
  id: 'ninePoint',
  priority: 63,
  languages: ['vi'],
  patterns: [NINE_KW],
  match(ctx) {
    const tri = uniqueTriangle(ctx.problem);
    if (!tri) return []; // 0 hoặc >1 tam giác → escalate.
    const [A, B, C] = tri;
    const mAB = 'M' + A + B, mBC = 'M' + B + C, mCA = 'M' + C + A;
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      if (!NINE_KW.test(c.text)) continue;
      out.push({
        ruleId: 'ninePoint',
        clauseIds: [c.id],
        intents: [
          addPoint(mAB, { kind: 'midpoint', of: A + B }),
          addPoint(mBC, { kind: 'midpoint', of: B + C }),
          addPoint(mCA, { kind: 'midpoint', of: C + A }),
          drawCircle('N9', 'through3', { points: [mAB, mBC, mCA] }),
        ],
      });
    }
    return out;
  },
};
