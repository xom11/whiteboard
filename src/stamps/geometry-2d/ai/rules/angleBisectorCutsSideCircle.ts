// src/stamps/geometry-2d/ai/rules/angleBisectorCutsSideCircle.ts
//
// Phân giác trong góc A cắt cạnh đối tại chân D, rồi cắt đường tròn ngoại tiếp
// tại E (điểm cung):
//   "Đường phân giác của góc BAC cắt BC tại D và cắt (O) tại E khác A"
//   "Tia phân giác trong AD ... cắt (O) tại E khác A"  (chân D đã có → chỉ E)
// → D = angleBisectorFoot(A, BC) ; E = secondIntersection(line AD, (O), other=A).
//
// Phân giác từ A đi qua A, D nên E nằm trên tia AD kéo dài → secondIntersection
// theo line "AD". angleBisectorAngle (priority 62) vẽ TIA phân giác (visible);
// rule này thêm chân D + giao đường tròn E.
//
// GOTCHA \b: ký tự Việt → cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /phân\s*giác[^.]{0,40}?cắt/u;

// "phân giác (trong)? (của)? góc (BAC|A) cắt (cạnh)? BC (tại|ở) D" — chân D trên
// cạnh đối. vertex = chữ GIỮA (góc BAC→A) hoặc 1 chữ (góc A). side = cặp đỉnh.
const FOOT = new RegExp(
  'phân\\s*giác\\s+(?:trong\\s+)?(?:của\\s+)?góc\\s+([A-Z])([A-Z])?([A-Z])?(?![A-Z])' +
    '[^.]{0,20}?cắt\\s+(?:cạnh\\s+)?([A-Z])([A-Z])(?![A-Z])\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'u',
);
// "... (và)? cắt (đường tròn|(O)) (tại|ở) E (khác A)?" — phần giao đường tròn.
const CIRCLE_CUT = /cắt\s+(?:lại\s+)?(?:đường\s*tròn\s*)?\(\s*([A-Z])\s*\)\s+(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![A-Z])(?:\s+khác\s+([A-Z])(?![A-Z]))?/u;

export const angleBisectorCutsSideCircleRule: LanguageRule = {
  id: 'angleBisectorCutsSideCircle',
  priority: 48, // sau triangle/circle/cevian; trước intersection(45)
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const fm = FOOT.exec(c.text);
      if (!fm) continue;
      // vertex: "góc BAC" → chữ giữa (g2); "góc A" → g1 (g2,g3 rỗng).
      const vertex = fm[2] && fm[3] ? fm[2] : fm[1];
      const side = fm[4] + fm[5];
      const foot = fm[6];
      if (side.includes(foot) || side.includes(vertex)) continue;
      const intents = [addPoint(foot, { kind: 'angleBisectorFoot', from: vertex, onLine: side })];

      // Giao đường tròn ngoại tiếp E (nếu nêu "cắt (O) tại E"). Line = vertex+foot
      // (tia phân giác qua A,D); other = vertex (A nằm trên (O) + trên tia).
      const cm = CIRCLE_CUT.exec(c.text);
      if (cm) {
        const circle = cm[1];
        const e = cm[2];
        const other = cm[3] ?? vertex;
        if (e !== foot && e !== vertex) {
          intents.push(
            addPoint(e, { kind: 'secondIntersection', line: vertex + foot, circle, other }),
          );
        }
      }
      out.push({ ruleId: 'angleBisectorCutsSideCircle', clauseIds: [c.id], intents });
    }
    return out;
  },
};
