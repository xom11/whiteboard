// src/stamps/geometry-2d/ai/rules/parallelCutsTangentAt.ts
//
// "Đường thẳng qua E song song với AC cắt tiếp tuyến tại C của (O) tại M"
//   → đường ∥ AC qua E ∩ tiếp tuyến tại C của (O) = M.
//     parallelThrough(E, AC) + tangentAt(C, O) + M = giao.
//
// Đường tròn lấy từ toàn đề ("(O)"). \b không khớp ký tự Việt → (?!\p{L}) + 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /[Đđ]ường\s*thẳng\s+qua\s+[A-Z][^.]{0,40}?tiếp\s*tuyến\s+tại\s+[A-Z]/u;
const CIRCLE_REF = /đường\s*tròn\s*\(\s*([A-Z])\s*\)|\(\s*([A-Z])\s*\)/u;

// group1=điểm qua E, 2=loại (song/vuông), 3=đường tham chiếu AC, 4=tiếp điểm C, 5=giao M.
const RE = new RegExp(
  '[Đđ]ường\\s*thẳng\\s+qua\\s+([A-Z])(?!\\p{L})\\s+(song\\s*song|vuông\\s*góc)\\s+(?:với\\s+)?' +
    '([A-Z]{2})(?!\\p{L})\\s+cắt\\s+tiếp\\s*tuyến\\s+tại\\s+([A-Z])(?!\\p{L})' +
    '(?:\\s+của\\s+[^.]{0,12}?)?\\s+(?:ở|tại)\\s+([A-Z])(?![A-Z])',
  'gu',
);

function circleName(problem: string): string | undefined {
  const m = CIRCLE_REF.exec(problem);
  return m ? (m[1] ?? m[2]) : undefined;
}

export const parallelCutsTangentAtRule: LanguageRule = {
  id: 'parallelCutsTangentAt',
  priority: 52,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const circle = circleName(ctx.problem);
    if (!circle) return [];
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const through = m[1];
        const isParallel = /song/.test(m[2]);
        const refLine = m[3];
        const at = m[4];
        const meet = m[5];
        const lineName = (isParallel ? 'par' : 'prp') + through;
        const tName = `t${at}`;
        out.push({
          ruleId: 'parallelCutsTangentAt',
          clauseIds: [c.id],
          intents: [
            drawLine(lineName, isParallel ? 'parallelThrough' : 'perpThrough', { through, to: refLine }),
            drawLine(tName, 'tangentAt', { through: at, circle }),
            addPoint(meet, { kind: 'intersection', of: [lineName, tName] }),
          ],
        });
      }
    }
    return out;
  },
};
