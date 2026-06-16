// src/stamps/geometry-2d/ai/rules/tangentAt.ts
//
// Tangent lines at points on a named circle:
//   "Tiếp tuyến tại M cắt tiếp tuyến tại A và B của đường tròn (O) lần lượt tại C và D"
//     → tangents tM/tA/tB + C=tM∩tA, D=tM∩tB
//
// Simple single tangent declarations are also emitted as visible tangent lines.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /[Tt]iếp\s*tuyến\s+(?:với\s+|của\s+)?(?:đường\s*tròn\s*)?(?:\([^)]*\)\s*)?tại/u;
const CIRCLE_REF = /đường\s*tròn\s*\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)|\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)/u;

const DISTRIB = /[Tt]iếp\s*tuyến\s+tại\s+([A-Z])\s+cắt\s+tiếp\s*tuyến\s+tại\s+([A-Z])\s+và\s+([A-Z])[^.]{0,60}?lần\s*lượt\s+tại\s+([A-Z])\s+và\s+([A-Z])/u;
// "Tiếp tuyến tại B, C (của (O))? cắt nhau tại T" → tB, tC, T = tB∩tC.
const TWO_MEET =
  /[Tt]iếp\s*tuyến\s+(?:với\s+|của\s+)?(?:đường\s*tròn\s*)?(?:\(\s*[A-Z]['′]?\s*\)\s*)?tại\s+([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z])[^.]{0,30}?cắt\s+nhau\s+(?:ở|tại)\s+([A-Z])(?![A-Z])/u;
const SINGLE = /[Tt]iếp\s*tuyến\s+tại\s+(?:điểm\s+)?([A-Z])(?:\s+với|\s+của|\s+đường|\s*$)/u;

function circleName(problem: string): string | undefined {
  const m = CIRCLE_REF.exec(problem);
  const center = m?.[1] ?? m?.[2];
  if (!center) return undefined;
  return /đường\s*kính/u.test(problem) ? `${center}_c` : center;
}

function tName(point: string): string {
  return `t${point}`;
}

export const tangentAtRule: LanguageRule = {
  id: 'tangent-at',
  priority: 63,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const circle = circleName(ctx.problem);
    if (!circle) return [];
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const d = DISTRIB.exec(c.text);
      if (d) {
        const base = d[1];
        const p1 = d[2];
        const p2 = d[3];
        const x1 = d[4];
        const x2 = d[5];
        out.push({
          ruleId: 'tangent-at',
          clauseIds: [c.id],
          intents: [
            drawLine(tName(base), 'tangentAt', { through: base, circle }),
            drawLine(tName(p1), 'tangentAt', { through: p1, circle }),
            drawLine(tName(p2), 'tangentAt', { through: p2, circle }),
            addPoint(x1, { kind: 'intersection', of: [tName(base), tName(p1)] }),
            addPoint(x2, { kind: 'intersection', of: [tName(base), tName(p2)] }),
          ],
        });
        continue;
      }

      const tm = TWO_MEET.exec(c.text);
      if (tm) {
        const [b, cc, t] = [tm[1], tm[2], tm[3]];
        if (b !== cc && t !== b && t !== cc) {
          out.push({
            ruleId: 'tangent-at',
            clauseIds: [c.id],
            intents: [
              drawLine(tName(b), 'tangentAt', { through: b, circle }),
              drawLine(tName(cc), 'tangentAt', { through: cc, circle }),
              addPoint(t, { kind: 'intersection', of: [tName(b), tName(cc)] }),
            ],
          });
          continue;
        }
      }

      const s = SINGLE.exec(c.text);
      if (!s) continue;
      const through = s[1];
      out.push({
        ruleId: 'tangent-at',
        clauseIds: [c.id],
        intents: [drawLine(tName(through), 'tangentAt', { through, circle })],
      });
    }
    return out;
  },
};
