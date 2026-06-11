// src/stamps/geometry-2d/ai/rules/circumcirclePairMeet.ts
//
// "Đường tròn ngoại tiếp tam giác AME và đường tròn ngoại tiếp tam giác ANF
//  cắt nhau tại Q khác A"
//   → 2 đường tròn ngoại tiếp (tên synth) + Q = giao thứ hai 2 đường tròn
//     (circleSecondIntersection, loại điểm chung "khác A").
//
// Tên đường tròn synth `w<verts>` (vô danh trong đề) — không đụng circle khác.
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { drawCircle, addPoint } from './_shared';

const PREFILTER = /[Đđ]ường\s*tròn\s+ngoại\s*tiếp\s+(?:các\s+)?tam\s*giác\s+[A-Z]{3}\s*(?:,|\s+(?:và|cắt)\s+(?:lại\s+)?đường\s*tròn\s+ngoại\s*tiếp\s+tam\s*giác)/u;

// Dạng "X cắt Y tại Q": "(đường tròn ngoại tiếp tam giác T1) cắt (đường tròn
// ngoại tiếp tam giác T2) (tại|ở) Q (khác W)?" — KHÔNG có "và … cắt nhau"
// (Bài 24/25: "...tam giác BEI cắt đường tròn ngoại tiếp tam giác CDI tại K khác I").
const RE_CAT = new RegExp(
  '[Đđ]ường\\s*tròn\\s+ngoại\\s*tiếp\\s+tam\\s*giác\\s+([A-Z]{3})(?![A-Z])\\s+cắt\\s+(?:lại\\s+)?' +
    '[Đđ]ường\\s*tròn\\s+ngoại\\s*tiếp\\s+tam\\s*giác\\s+([A-Z]{3})(?![A-Z])\\s+' +
    '(?:tại|ở)\\s+(?:điểm\\s+(?:thứ\\s+hai\\s+)?)?(?:là\\s+)?([A-Z])(?![A-Z])(?:\\s+khác\\s+([A-Z])(?![A-Z]))?',
  'u',
);

// Dạng NÉN: "đường tròn ngoại tiếp tam giác AEM, AFN cắt nhau tại P khác A"
// (một "đường tròn ngoại tiếp" + 2 tam giác ngăn phẩy).
const RE_COMPACT = new RegExp(
  '[Đđ]ường\\s*tròn\\s+ngoại\\s*tiếp\\s+(?:các\\s+)?tam\\s*giác\\s+([A-Z]{3})(?![A-Z])\\s*,\\s*([A-Z]{3})(?![A-Z])\\s+' +
    'cắt\\s+nhau\\s+(?:tại|ở)\\s+([A-Z])(?![A-Z])(?:\\s+khác\\s+([A-Z])(?![A-Z]))?',
  'u',
);

// group1 = tam giác 1 (3 đỉnh), 2 = tam giác 2, 3 = giao điểm, 4 = điểm loại (khác A).
const RE = new RegExp(
  '[Đđ]ường\\s*tròn\\s+ngoại\\s*tiếp\\s+tam\\s*giác\\s+([A-Z]{3})(?![A-Z])\\s+và\\s+' +
    '[Đđ]ường\\s*tròn\\s+ngoại\\s*tiếp\\s+tam\\s*giác\\s+([A-Z]{3})(?![A-Z])\\s+' +
    'cắt\\s+nhau\\s+(?:tại|ở)\\s+([A-Z])(?![A-Z])(?:\\s+khác\\s+([A-Z])(?![A-Z]))?',
  'u',
);

export const circumcirclePairMeetRule: LanguageRule = {
  id: 'circumcirclePairMeet',
  priority: 59,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text) ?? RE_CAT.exec(c.text) ?? RE_COMPACT.exec(c.text);
      if (!m) continue;
      const tri1 = m[1].split('');
      const tri2 = m[2].split('');
      const q = m[3];
      // Điểm chung để loại: "khác A" tường minh, else đỉnh chung của 2 tam giác.
      const shared = m[4] ?? tri1.find((v) => tri2.includes(v));
      if (!shared) continue;
      const w1 = `w${m[1]}`;
      const w2 = `w${m[2]}`;
      out.push({
        ruleId: 'circumcirclePairMeet',
        clauseIds: [c.id],
        intents: [
          drawCircle(w1, 'through3', { points: tri1 }),
          drawCircle(w2, 'through3', { points: tri2 }),
          addPoint(q, { kind: 'circleSecondIntersection', c1: w1, c2: w2, exclude: shared }),
        ],
      });
    }
    return out;
  },
};
