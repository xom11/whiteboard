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

const PREFILTER =
  /(?:trên|thuộc)\s+\(\s*[A-Z][^)]*\)[^.]{0,24}?kẻ\s+tiếp\s*tuyến\s+[a-z]|tiếp\s*tuyến\s+[a-z][0-9]?\s+(?:của|với)\s+|(?:[Qq]ua|[Tt]ừ)\s+[A-Z]\s+(?:vẽ|kẻ)\s+tiếp\s*tuyến\s+[a-z]/u;

// "(từ|qua)? (một)? điểm A (trên|thuộc) (O) ... kẻ tiếp tuyến d (với (O))?"
const RE = new RegExp(
  '(?:từ\\s+|qua\\s+)?(?:một\\s+)?điểm\\s+([A-Z])(?![A-Z])\\s+(?:trên|thuộc)\\s+' +
    "\\(\\s*([A-Z])(?:['′]?)\\s*\\)" +
    '[^.]{0,24}?kẻ\\s+tiếp\\s*tuyến\\s+([a-z][0-9]?)(?!\\p{L})',
  'gu',
);

// "(Vẽ|Kẻ) tiếp tuyến <d> của/với (đường tròn)? (O) tại <B>" — đường ĐẶT TÊN <d>
// tiếp xúc đường tròn tại tiếp-điểm B (B đã onCircle qua rule khác). group1=tên
// đường (chữ thường), group2=tâm, group3=tiếp điểm. httcd:205, hinh9:127.
const RE_NAMED_OF_AT = new RegExp(
  '(?:[VvKk]ẽ|[Kk]ẻ|[Dd]ựng)?\\s*tiếp\\s*tuyến\\s+([a-z][0-9]?)(?!\\p{L})\\s+(?:của|với)\\s+' +
    '(?:đường\\s*tròn\\s*)?\\(\\s*([A-Z])(?:[\'′]?)\\s*\\)\\s+tại\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

// "(Qua|Từ) A (vẽ|kẻ) tiếp tuyến <xy>" — đường ĐẶT TÊN chữ thường (1-2 ký tự, vd
// "xy"/"d") tiếp xúc đường tròn TẠI điểm A (A đã onCircle). group1=tiếp điểm,
// group2=tên đường. circle = "(O)" duy nhất toàn đề. httcd:95.
const RE_THROUGH_NAMED = new RegExp(
  '(?:[Qq]ua|[Tt]ừ)\\s+([A-Z])(?![A-Z])\\s+(?:vẽ|kẻ)\\s+tiếp\\s*tuyến\\s+([a-z]{1,2}[0-9]?)(?!\\p{L})',
  'gu',
);

const PAREN_CIRCLE = /\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)|đường\s*tròn\s+tâm\s+([A-Z])(?![A-Za-z])/u;

// Tên đường tròn DSL: tâm + "_c" khi đề có "đường kính" (circleDiameter đặt tên
// "<center>_c"). Đồng bộ với tangentAt.circleName.
function circleDslName(problem: string, center: string): string {
  return /đường\s*kính/u.test(problem) ? `${center}_c` : center;
}

// Tâm đường tròn toàn-đề (paren "(O)" / "tâm O") → tên DSL (+_c nếu đường kính).
function resolveProblemCircle(problem: string): string | undefined {
  const m = PAREN_CIRCLE.exec(problem);
  const center = m?.[1] ?? m?.[2];
  return center ? circleDslName(problem, center) : undefined;
}

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
      // "Vẽ tiếp tuyến d của (O) tại B" — đường tên d, tiếp điểm B trên (O).
      RE_NAMED_OF_AT.lastIndex = 0;
      for (const m of c.text.matchAll(RE_NAMED_OF_AT)) {
        const line = m[1];
        const circle = circleDslName(ctx.problem, m[2]);
        const through = m[3];
        out.push({
          ruleId: 'tangentLineNamedAtPoint',
          clauseIds: [c.id],
          intents: [drawLine(line, 'tangentAt', { through, circle })],
        });
      }
      // "Qua A vẽ tiếp tuyến xy" — đường tên xy, tiếp điểm A trên đường tròn toàn-đề.
      RE_THROUGH_NAMED.lastIndex = 0;
      const probCircle = resolveProblemCircle(ctx.problem);
      if (probCircle) {
        for (const m of c.text.matchAll(RE_THROUGH_NAMED)) {
          const through = m[1];
          const line = m[2];
          out.push({
            ruleId: 'tangentLineNamedAtPoint',
            clauseIds: [c.id],
            intents: [drawLine(line, 'tangentAt', { through, circle: probCircle })],
          });
        }
      }
    }
    return out;
  },
};
