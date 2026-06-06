// src/stamps/geometry-2d/ai/rules/circleTriangle.ts
//
// Đường tròn nội/ngoại tiếp tam giác:
//   "đường tròn ngoại tiếp tam giác ABC" → circumcircle → drawCircle through3
//   "đường tròn nội tiếp tam giác ABC"   → incircle     → drawCircle inscribedIn
//
// LƯU Ý disambiguate "nội tiếp" có 2 nghĩa ngược nhau tuỳ ngữ cảnh:
//   - "ĐƯỜNG TRÒN nội tiếp tam giác" → incircle (inscribedIn)
//   - "TAM GIÁC nội tiếp đường tròn" → circumcircle (through3) — tam giác nội
//     tiếp tức đường tròn NGOẠI tiếp tam giác.
// "ngoại tiếp" (đường tròn ngoại tiếp tam giác) luôn là circumcircle.
import type { LanguageRule, RuleMatch } from './_types';
import { drawCircle } from './_shared';

// \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề","ạ"…). Dùng lookaround \p{L} + cờ 'u'.
const HAS_INSCRIBE = /(?<!\p{L})(?:nội|ngoại)\s*tiếp(?!\p{L})/u;

// 3 đỉnh tam giác trong clause (sau "tam giác") hoặc fallback toàn đề.
const TRI = /tam\s*giác\s+([A-Z])([A-Z])([A-Z])/u;

// "đường tròn ngoại tiếp ..." (circumcircle). Cho phép tên tâm "(O)" xen giữa:
// "đường tròn (O) ngoại tiếp".
const CIRCUM_KW = /đường\s*tròn\s*(?:\(\s*[A-Z]\s*\))?\s*ngoại\s*tiếp/u;
// "đường tròn nội tiếp tam giác ..." (incircle). Tương tự cho phép "(I)" xen giữa.
const INCIRCLE_KW =
  /đường\s*tròn\s*(?:\(\s*[A-Z]\s*\))?\s*nội\s*tiếp\s+tam\s*giác/u;
// "tam giác XYZ nội tiếp (trong) đường tròn" → circumcircle.
const TRI_INSCRIBED_IN_CIRCLE =
  /tam\s*giác\s+[A-Z]{3}[^.]{0,40}?nội\s*tiếp\s+(?:trong\s+)?đường\s*tròn/u;

// Tên tâm đường tròn: "(O)" hoặc "đường tròn (O)" hoặc "tâm O".
const CIRCLE_NAME =
  /(?:đường\s*tròn\s*)?\(\s*([A-Z])\s*\)|tâm\s+([A-Z])(?!\p{L})/u;

function findTriangle(clauseText: string, problem: string): string[] | undefined {
  const local = TRI.exec(clauseText);
  if (local) return [local[1], local[2], local[3]];
  const global = TRI.exec(problem);
  if (global) return [global[1], global[2], global[3]];
  return undefined; // không tìm thấy tam giác → bỏ qua (escalate AI)
}

function circleName(clauseText: string): string {
  const m = CIRCLE_NAME.exec(clauseText);
  if (m) return m[1] ?? m[2] ?? 'O';
  return 'O';
}

/**
 * Mỗi clause khớp "(đường tròn) nội/ngoại tiếp" → emit draw-circle.
 *   - circumcircle (through3): "đường tròn ngoại tiếp tam giác ABC",
 *     "tam giác ABC nội tiếp đường tròn (O)".
 *   - incircle (inscribedIn): "đường tròn nội tiếp tam giác ABC".
 */
export const circleTriangleRule: LanguageRule = {
  id: 'circleTriangle',
  priority: 72,
  languages: ['vi'],
  patterns: [HAS_INSCRIBE],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      if (!HAS_INSCRIBE.test(c.text)) continue;

      const isCircum =
        CIRCUM_KW.test(c.text) || TRI_INSCRIBED_IN_CIRCLE.test(c.text);
      const isIncircle = INCIRCLE_KW.test(c.text);

      // Cần phân loại rõ; nếu chỉ có "nội tiếp" trần (không "đường tròn nội
      // tiếp tam giác" cũng không "tam giác ... nội tiếp đường tròn") → mơ hồ,
      // bỏ qua để escalate AI.
      if (!isCircum && !isIncircle) continue;
      // "đường tròn nội tiếp" thắng nếu ngữ cảnh là incircle thuần; nhưng nếu
      // clause vừa có "ngoại tiếp" lẫn "nội tiếp" thì ưu tiên circumcircle khi
      // có CIRCUM_KW. (Hiếm; an toàn theo từ khoá "đường tròn ngoại tiếp".)

      const tri = findTriangle(c.text, ctx.problem);
      if (!tri) continue;

      const name = circleName(c.text);

      if (isIncircle && !CIRCUM_KW.test(c.text)) {
        out.push({
          ruleId: 'circleTriangle',
          clauseIds: [c.id],
          intents: [
            drawCircle(name, 'inscribedIn', { triangle: tri }),
          ],
        });
      } else {
        out.push({
          ruleId: 'circleTriangle',
          clauseIds: [c.id],
          intents: [drawCircle(name, 'through3', { points: tri })],
        });
      }
    }
    return out;
  },
};
