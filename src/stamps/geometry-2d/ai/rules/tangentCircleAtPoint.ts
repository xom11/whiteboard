// src/stamps/geometry-2d/ai/rules/tangentCircleAtPoint.ts
//
// "Đường tròn (K) qua A và tiếp xúc với BC tại D (lần lượt)? cắt AC, AB tại E, F"
//   → đường tròn tâm K TIẾP XÚC đường BC TẠI D + đi QUA A.
//     Tâm K = giao của ⊥BC-tại-D (bán kính KD ⊥ tiếp tuyến) và trung-trực AD
//     (KA = KD). circle = centerThrough(K, D). E,F = giao thứ hai với AC, AB
//     (loại A — A nằm trên đường tròn + trên 2 cạnh).
//
// Dựng tâm bằng primitive sẵn có: perpThrough + perpBisector (draw-line) + intersection.
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine, drawCircle } from './_shared';

const PREFILTER = /[Đđ]ường\s*tròn\s*\(?[A-Z]\)?[^.]{0,40}?tiếp\s*xúc[^.]{0,20}?tại\s+[A-Z]/u;

// group1=tâm K, 2=điểm qua A, 3=đường tiếp xúc BC, 4=tiếp điểm D,
// 5+6 = 2 cạnh bị cắt, 7+8 = 2 giao điểm.
const RE = new RegExp(
  '[Đđ]ường\\s*tròn\\s*\\(\\s*([A-Z])\\s*\\)\\s*(?:đi\\s+)?qua\\s+([A-Z])\\s+(?:và\\s+)?tiếp\\s*xúc\\s+(?:với\\s+)?' +
    '(?:cạnh\\s+|đường\\s*thẳng\\s+)?([A-Z]{2})\\s+tại\\s+([A-Z])(?!\\p{L})' +
    '[^.]{0,24}?cắt\\s+(?:các\\s+(?:cạnh|đoạn)\\s+|cạnh\\s+)?([A-Z]{2})\\s*(?:,|và)\\s*([A-Z]{2})(?!\\p{L})' +
    '\\s+(?:lần\\s*lượt\\s+)?(?:ở|tại)\\s+([A-Z])\\s*(?:,|và)\\s*([A-Z])(?![A-Z])',
  'gu',
);

// Pattern B (Câu 21): "Đường tròn (K) đi qua C, T tiếp xúc AB có tâm K thuộc BC"
//   → tâm K cách đều C, T (trên đường tròn) ⇒ K ∈ trung-trực(C,T); K ∈ BC.
//     K = trung-trực(C,T) ∩ BC; circle = centerThrough(K, C). Tiếp xúc AB tự
//     thoả theo dựng hình (đề đảm bảo). group1=K, 2=C, 3=T, 4=đường chứa tâm.
const RE_THROUGH2_CENTER_ON = new RegExp(
  '[Đđ]ường\\s*tròn\\s*\\(\\s*([A-Z])\\s*\\)\\s*(?:đi\\s+)?qua\\s+([A-Z])\\s*,\\s*([A-Z])(?!\\p{L})' +
    '[^.]{0,40}?tâm\\s+[A-Z]\\s+thuộc\\s+([A-Z]{2})(?![A-Z])',
  'gu',
);

export const tangentCircleAtPointRule: LanguageRule = {
  id: 'tangentCircleAtPoint',
  priority: 60,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const k = m[1];
        const through = m[2];
        const tanLine = m[3];
        const at = m[4];
        const side1 = m[5];
        const side2 = m[6];
        const p1 = m[7];
        const p2 = m[8];
        if (at === through || p1 === p2) continue;
        const circ = `${k}_c`;
        const perp = `${k}_perp`; // ⊥ tiếp tuyến tại tiếp điểm
        const pb = `${k}_pb`; // trung trực (through, at)
        out.push({
          ruleId: 'tangentCircleAtPoint',
          clauseIds: [c.id],
          intents: [
            drawLine(perp, 'perpThrough', { through: at, to: tanLine }),
            drawLine(pb, 'perpBisector', { p1: through, p2: at }),
            addPoint(k, { kind: 'intersection', of: [perp, pb] }),
            drawCircle(circ, 'centerThrough', { center: k, through: at }),
            addPoint(p1, { kind: 'secondIntersection', line: side1, circle: circ, other: through }),
            addPoint(p2, { kind: 'secondIntersection', line: side2, circle: circ, other: through }),
          ],
        });
      }

      // Pattern B: qua 2 điểm, tâm trên đường M (tiếp xúc tự thoả).
      RE_THROUGH2_CENTER_ON.lastIndex = 0;
      for (const m of c.text.matchAll(RE_THROUGH2_CENTER_ON)) {
        const k = m[1];
        const x = m[2];
        const y = m[3];
        const centerLine = m[4];
        if (x === y) continue;
        const circ = `${k}_c`;
        const pb = `${k}_pb`;
        out.push({
          ruleId: 'tangentCircleAtPoint',
          clauseIds: [c.id],
          intents: [
            drawLine(pb, 'perpBisector', { p1: x, p2: y }),
            addPoint(k, { kind: 'intersection', of: [pb, centerLine] }),
            drawCircle(circ, 'centerThrough', { center: k, through: x }),
          ],
        });
      }
    }
    return out;
  },
};
