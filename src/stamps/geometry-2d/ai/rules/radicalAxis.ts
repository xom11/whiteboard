// src/stamps/geometry-2d/ai/rules/radicalAxis.ts
//
// Trục đẳng phương 2 đường tròn (issue #47, construct 2): đường ⊥ đường nối tâm
// O₁O₂, mọi điểm trên nó có lũy thừa (power) bằng nhau với 2 đường tròn. KHÔNG
// phải kind point — compose từ kind tổng quát `radicalAxis(circle1, circle2)`
// (tham chiếu 2 CIRCLE đã được circleRadius dựng theo center letter).
//
// Fail-safe (escalate, KHÔNG dựng sai):
//   - Đồng tâm "(O;3) và (O;5)" → {O} (1 center phân biệt) → bỏ qua (suy biến,
//     trục không xác định).
//   - 0 hoặc 1 đường tròn có bán kính → không đủ 2 → bỏ qua.
//   - >2 đường tròn → nhập nhằng (cặp nào?) → bỏ qua.
import type { LanguageRule, RuleMatch } from './_types';
import { drawLine } from './_shared';

// "trục đẳng phương" / "đẳng phương" — "trục" optional. \p{L} lookaround vì \b
// không khớp quanh ký tự Việt.
const RADICAL_KW = /(?<!\p{L})(?:trục\s+)?đẳng\s*phương(?!\p{L})/u;

// Đường tròn CÓ BÁN KÍNH (số hoặc ký hiệu R/r) — khớp những gì circleRadius
// dựng qua centerRadius. "(O; 3)" / "(I, 2.5)" / "(O; R)". Global: nhiều đường
// tròn / đề. Group 1 = center letter.
const CIRCLE_R_G = /\(\s*([A-Z])\s*[;,]\s*(?:\d|[Rr])/gu;

/** Các center letter phân biệt của đường tròn-có-bán-kính nêu trong đề. */
function circleCentersWithRadius(problem: string): string[] {
  CIRCLE_R_G.lastIndex = 0;
  const centers = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = CIRCLE_R_G.exec(problem)) !== null) {
    centers.add(m[1]);
  }
  return [...centers];
}

export const radicalAxisRule: LanguageRule = {
  id: 'radicalAxis',
  priority: 66,
  languages: ['vi'],
  patterns: [RADICAL_KW],
  match(ctx) {
    const centers = circleCentersWithRadius(ctx.problem);
    // Cần ĐÚNG 2 đường tròn phân biệt. Đồng tâm → 1 center → escalate. >2 → mơ hồ.
    if (centers.length !== 2) return [];
    const [c1, c2] = centers;

    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      if (!RADICAL_KW.test(c.text)) continue;
      out.push({
        ruleId: 'radicalAxis',
        clauseIds: [c.id],
        intents: [drawLine('rad' + c1 + c2, 'radicalAxis', { circle1: c1, circle2: c2 })],
      });
    }
    return out;
  },
};
