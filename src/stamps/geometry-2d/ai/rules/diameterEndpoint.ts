// src/stamps/geometry-2d/ai/rules/diameterEndpoint.ts
//
// "Gọi AD là đường kính của (O)" / "AD là đường kính đường tròn (O)"
//   → D = điểm xuyên tâm đối của A qua tâm O (reflectPoint of A through O).
//     A đã nằm trên (O) (đỉnh/điểm cũ) ⇒ D = đầu mút kia của đường kính.
//
// CHỈ kích hoạt khi 1 trong 2 đầu mút đã là điểm nêu trước (đỉnh tam giác…) và
// đầu kia là điểm MỚI cần dựng. Tâm lấy từ "(O)"/"tâm O" trong clause/đề.
// KHÁC circleDiameter ("đường tròn đường kính AB" — dựng đường tròn MỚI): ở đây
// "AD là đường kính CỦA (O)" — (O) đã có, chỉ cần đầu mút đối tâm.
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// group1+2 = cặp đầu mút đường kính (AD), 3 = tâm O.
const RE = new RegExp(
  '([A-Z])([A-Z])(?![A-Z])\\s+là\\s+đường\\s*kính\\s+(?:của\\s+)?(?:đường\\s*tròn\\s*)?(?:tâm\\s+)?\\(?\\s*([A-Z])\\s*\\)?',
  'gu',
);
const PREFILTER = /[A-Z]{2}\s+là\s+đường\s*kính/u;

export const diameterEndpointRule: LanguageRule = {
  id: 'diameterEndpoint',
  priority: 56,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    // Tập tên điểm "đã biết" thô: đỉnh tam giác/điểm xuất hiện trước. Heuristic
    // đơn giản: đầu mút đầu (A) coi là điểm cũ (gốc), đầu sau (D) là điểm mới.
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const a = m[1];
        const d = m[2];
        const center = m[3];
        if (a === d || center === a || center === d) continue;
        // D = xuyên tâm đối của A qua O.
        out.push({
          ruleId: 'diameterEndpoint',
          clauseIds: [c.id],
          intents: [addPoint(d, { kind: 'reflectPoint', of: a, through: center })],
        });
      }
    }
    return out;
  },
};
