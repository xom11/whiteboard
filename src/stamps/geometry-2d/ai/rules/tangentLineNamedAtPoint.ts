// src/stamps/geometry-2d/ai/rules/tangentLineNamedAtPoint.ts
//
// Tiếp tuyến ĐẶT TÊN bằng chữ thường (d, d1, a…) tại 1 điểm TRÊN đường tròn:
//   "từ một điểm A trên (O) kẻ tiếp tuyến d với (O)"
//     → draw-line d {kind:tangentAt, through:A, circle:O}
//
// A là tiếp điểm (đã onCircle qua onCirclePoint). Đường d sau đó được dùng làm
// đoạn chứa điểm ("Trên đường thẳng d lấy điểm M" — onSegmentPoint nhận tên
// đường chữ thường). circle emit raw (resolveCircleNames map "_c" nếu cần).
//
// GOTCHA \b: ký tự Việt → cờ 'u' + (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import { drawLine } from './_shared';

const PREFILTER = /(?:trên|thuộc)\s+\(\s*[A-Z][^)]*\)[^.]{0,24}?kẻ\s+tiếp\s*tuyến\s+[a-z]/u;

// "(từ|qua)? (một)? điểm A (trên|thuộc) (O) ... kẻ tiếp tuyến d (với (O))?"
const RE = new RegExp(
  '(?:từ\\s+|qua\\s+)?(?:một\\s+)?điểm\\s+([A-Z])(?![A-Z])\\s+(?:trên|thuộc)\\s+' +
    "\\(\\s*([A-Z])(?:['′]?)\\s*\\)" +
    '[^.]{0,24}?kẻ\\s+tiếp\\s*tuyến\\s+([a-z][0-9]?)(?!\\p{L})',
  'gu',
);

export const tangentLineNamedAtPointRule: LanguageRule = {
  id: 'tangentLineNamedAtPoint',
  priority: 63, // cao như tangentAt — đường d phải dựng trước điểm-trên-d
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const through = m[1];
        const circle = m[2];
        const line = m[3];
        out.push({
          ruleId: 'tangentLineNamedAtPoint',
          clauseIds: [c.id],
          intents: [drawLine(line, 'tangentAt', { through, circle })],
        });
      }
    }
    return out;
  },
};
