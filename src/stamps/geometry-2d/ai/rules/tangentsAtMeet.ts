// src/stamps/geometry-2d/ai/rules/tangentsAtMeet.ts
//
// Hai tiếp tuyến TẠI 2 điểm trên đường tròn cắt nhau:
//   "(Các)? tiếp tuyến (của (O))? tại B và C (của (O))? cắt nhau tại J"
//   "Tiếp tuyến tại B, C của (O) cắt nhau tại T"
//     → tB = tangentAt(B, circle) ; tC = tangentAt(C, circle) ; J = tB ∩ tC.
//
// Rất phổ biến (cực/đối cực): J/T = giao 2 tiếp tuyến tại B,C. B,C thường là đỉnh
// tam giác / điểm trên (O) đã có. Circle = "(X)" duy nhất (diameter → X_c).
//
// KHÁC tangentAtCutsLines ("tiếp tuyến tại X cắt <đường> tại …"): ở đây 2 tiếp
// tuyến cắt NHAU. \b không khớp ký tự Việt → cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /[Tt]iếp\s*tuyến[^.]{0,40}?tại\s+[A-Z][^.]{0,30}?(?:và|,)\s*[A-Z][^.]{0,30}?cắt\s+nhau/u;
const CIRCLE_REF = /đường\s*tròn\s*(?:tâm\s+)?\(?\s*([A-ZωΩ])(?:\s*[;,]\s*[Rr])?\s*\)?|\(\s*([A-ZωΩ])\s*\)/u;

// "tiếp tuyến (của (O))? tại B (và|,) C (của (O))? cắt nhau (tại|ở) J"
const RE = new RegExp(
  '[Tt]iếp\\s*tuyến\\s+(?:của\\s+[^.]{0,14}?\\s+)?tại\\s+(?:điểm\\s+)?([A-Z])\\s*(?:và|,)\\s*([A-Z])(?!\\p{L})' +
    '(?:\\s+của\\s+[^.]{0,14}?)?\\s+cắt\\s+nhau\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

function circleName(problem: string): string | undefined {
  const m = CIRCLE_REF.exec(problem);
  if (!m) return undefined;
  const center = m[1] ?? m[2];
  return /đường\s*kính/u.test(problem) ? `${center}_c` : center;
}

export const tangentsAtMeetRule: LanguageRule = {
  id: 'tangentsAtMeet',
  priority: 55, // trên intersection(45) — 2 tiếp tuyến + giao trong CÙNG match nên tự đủ thứ tự
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const circle = circleName(ctx.problem);
    if (!circle) return [];
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const [b, cc, j] = [m[1], m[2], m[3]];
        if (new Set([b, cc, j]).size !== 3) continue;
        const tB = `t${b}`;
        const tC = `t${cc}`;
        out.push({
          ruleId: 'tangentsAtMeet',
          clauseIds: [c.id],
          intents: [
            drawLine(tB, 'tangentAt', { through: b, circle }),
            drawLine(tC, 'tangentAt', { through: cc, circle }),
            addPoint(j, { kind: 'intersection', of: [tB, tC] }),
          ],
        });
      }
    }
    return out;
  },
};
