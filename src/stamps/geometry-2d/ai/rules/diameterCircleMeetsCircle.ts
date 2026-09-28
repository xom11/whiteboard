// src/stamps/geometry-2d/ai/rules/diameterCircleMeetsCircle.ts
//
// Đường tròn ĐƯỜNG KÍNH XY cắt một đường tròn khác (O):
//   "Đường tròn đường kính OM cắt đường tròn (O; R) tại hai điểm E, F"
//   "Đường tròn (O₁) đường kính DE cắt (O) tại F"      (E đã nằm trên (O))
// → E, F = giao của HAI ĐƯỜNG TRÒN (circleIntersection 0/1), hoặc F = giao thứ hai
//   loại đầu mút đã nằm trên (O).
// Trước đây lineCircleIntersection đọc "OM cắt (O) tại E, F" thành giao của ĐƯỜNG
// THẲNG OM với (O) — hình sai; nhánh lớp 8 chặn lại (đúng) nhưng bài thành thiếu.
// Một giao điểm mà không biết đầu mút nào nằm trên (O) → bỏ (không đoán).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawCircle } from './_shared';
import { escapeRe } from './_shared';

const RE = new RegExp(
  String.raw`[Đđ][ưƯ]ờng\s*tròn\s*(?:\([^()]{0,6}\)\s*)?(?:có\s+)?đường\s*kính\s+([A-Z])([A-Z])(?![A-Z'′])\s+cắt\s+(?:(?:nửa\s+)?đường\s*tròn\s*)?\(\s*([A-Z])(?:\s*[;,]\s*[Rr]['′]?)?\s*\)` +
    String.raw`\s+(?:tại|ở)\s+(?:hai\s+điểm\s+(?:phân\s*biệt\s+)?)?(?:điểm\s+(?:thứ\s+hai\s+)?)?([A-Z])(?:\s*(?:,|và)\s*([A-Z]))?(?![\p{L}\d'′])`,
  'gu',
);

export const diameterCircleMeetsCircleRule: LanguageRule = {
  id: 'diameterCircleMeetsCircle',
  priority: 71,
  languages: ['vi'],
  patterns: [/đường\s*kính\s+[A-Z]{2}\s+cắt\s+(?:(?:nửa\s+)?đường\s*tròn\s*)?\(/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(RE)) {
        const [, y, z, o, e, f] = m;
        if (y === z || [y, z].includes(e) || (f && [y, z, e].includes(f))) continue;
        const ten = `dk${y}${z}`;
        const intents: IntentT[] = [drawCircle(ten, 'diameter', { endpoints: [y, z] })];
        if (f) {
          intents.push(
            addPoint(e, { kind: 'circleIntersection', c1: ten, c2: o, which: 0 }),
            addPoint(f, { kind: 'circleIntersection', c1: ten, c2: o, which: 1 }),
          );
        } else {
          // Đầu mút đã nằm trên (O): "… cắt (O) tại Z" / "Z ∈ (O)" / "Z thuộc (O)" ở trước.
          const truoc = ctx.problem.slice(0, Math.max(0, ctx.problem.indexOf(c.text)));
          const tren = [y, z].filter((p) =>
            new RegExp(String.raw`\(\s*${escapeRe(o)}\s*\)\s+(?:tại|ở)\s+(?:điểm\s+(?:thứ\s+hai\s+)?)?${p}(?![\p{L}\d'′])|${p}\s*(?:∈|thuộc)\s*\(\s*${escapeRe(o)}\s*\)`, 'u').test(truoc),
          );
          if (tren.length !== 1) continue;
          intents.push(addPoint(e, { kind: 'circleSecondIntersection', c1: ten, c2: o, exclude: tren[0] }));
        }
        out.push({ ruleId: 'diameterCircleMeetsCircle', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
