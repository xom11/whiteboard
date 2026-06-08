// src/stamps/geometry-2d/ai/rules/eulerLine.ts
//
// Đường thẳng Euler (issue #47, construct 1): đường thẳng đi qua 3 tâm tam giác
// THẲNG HÀNG — trọng tâm G, trực tâm H, tâm đường tròn ngoại tiếp O. KHÔNG phải
// kind DSL riêng — compose từ 3 tâm (centroid/orthocenter/circumcenter, đã có)
// + kind tổng quát `lineThrough([G,H,O])`.
//
// Fail-safe (escalate, KHÔNG dựng sai):
//   - "đường tròn Euler" (đường tròn 9 điểm) → KHÔNG khớp (regex chỉ nhận
//     "đường (thẳng) Euler", không có "tròn").
//   - Tam giác đều ("đều") → G≡H≡O suy biến, đường Euler không xác định → bỏ qua.
//   - Không có tam giác / >1 tam giác (nhập nhằng) → bỏ qua.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

// "đường thẳng Euler" / "đường Euler" — "thẳng" optional. KHÔNG khớp "đường tròn
// Euler" (vì "tròn" KHÔNG phải nhánh optional "thẳng"). \p{L} lookaround vì \b
// không khớp quanh ký tự Việt.
const EULER_LINE_KW = /(?<!\p{L})đường\s+(?:thẳng\s+)?[Ee]uler(?!\p{L})/u;

// Tam giác (global): quét mọi tam giác nêu trong đề.
const TRI_G = /tam giác\s+([A-Z])([A-Z])([A-Z])/gu;

// Tam giác đều → 3 tâm trùng → đường Euler suy biến.
const EQUILATERAL_KW = /(?<!\p{L})đều(?!\p{L})/u;

/** Bộ 3 đỉnh duy nhất toàn đề; undefined nếu 0 hoặc >1 tam giác phân biệt. */
function uniqueTriangle(problem: string): [string, string, string] | undefined {
  TRI_G.lastIndex = 0;
  const tris: string[][] = [];
  let m: RegExpExecArray | null;
  while ((m = TRI_G.exec(problem)) !== null) {
    tris.push([m[1], m[2], m[3]]);
  }
  const distinct = new Set(tris.map((t) => t.join('')));
  if (distinct.size !== 1) return undefined;
  const t = tris[0];
  return [t[0], t[1], t[2]];
}

export const eulerLineRule: LanguageRule = {
  id: 'eulerLine',
  priority: 68,
  languages: ['vi'],
  patterns: [EULER_LINE_KW],
  match(ctx) {
    // Suy biến tam giác đều → escalate (G≡H≡O → đường Euler không xác định).
    if (EQUILATERAL_KW.test(ctx.problem)) return [];

    const tri = uniqueTriangle(ctx.problem);
    if (!tri) return []; // 0 hoặc >1 tam giác → nhập nhằng → escalate.
    const [A, B, C] = tri;

    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      if (!EULER_LINE_KW.test(c.text)) continue;
      out.push({
        ruleId: 'eulerLine',
        clauseIds: [c.id],
        intents: [
          addPoint('G', { kind: 'centroid', of: [A, B, C] }),
          addPoint('H', { kind: 'orthocenter', of: [A, B, C] }),
          addPoint('O', { kind: 'circumcenter', of: [A, B, C] }),
          drawLine('euler' + A + B + C, 'lineThrough', { points: ['G', 'H', 'O'] }),
        ],
      });
    }
    return out;
  },
};
