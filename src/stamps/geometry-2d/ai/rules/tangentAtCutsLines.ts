// src/stamps/geometry-2d/ai/rules/tangentAtCutsLines.ts
//
// "Tiếp tuyến của (O) tại C cắt AD, AB lần lượt tại P, Q"
//   → draw-line tC (tangentAt C của đường tròn) + P=tC∩AD, Q=tC∩AB.
//
// Bổ sung tangentAt (vốn chỉ bắt "tiếp tuyến TẠI X …", bỏ lỡ "tiếp tuyến CỦA
// (O) tại X cắt …"). Chấp nhận cả 2 thứ tự "của (O) tại C" và "tại C của (O)".
// Đường tròn lấy từ toàn đề (1 "(O)"/"tâm O" duy nhất).
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /[Tt]iếp\s*tuyến[^.]{0,30}?tại\s+[A-Z][^.]{0,40}?cắt/u;
const CIRCLE_REF = /đường\s*tròn\s*(?:tâm\s+)?\(?\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)?/u;

// SINGLE: "Tiếp tuyến tại A (của (O))? cắt (tia)? BC tại D" → 1 đường + 1 giao.
//   group1=tiếp điểm, group2=đường bị cắt (1-2 ký tự), group3=giao điểm.
const SINGLE_RE = new RegExp(
  '[Tt]iếp\\s*tuyến\\s+(?:của\\s+[^.]{0,14}?\\s+)?tại\\s+(?:điểm\\s+)?([A-Z])(?!\\p{L})' +
    '(?:\\s+của\\s+[^.]{0,14}?)?\\s+cắt\\s+(?:tia\\s+|đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+)?' +
    '([A-Z]{1,2})(?![A-Z])\\s+(?:tại|ở)\\s+([A-Z])(?![A-Z])',
  'gu',
);

// group1 = tangent point, 2+3 = 2 đường bị cắt, 4+5 = 2 giao điểm.
const RE = new RegExp(
  '[Tt]iếp\\s*tuyến\\s+(?:của\\s+[^.]{0,14}?\\s+)?tại\\s+(?:điểm\\s+)?([A-Z])(?!\\p{L})' +
    '(?:\\s+của\\s+[^.]{0,14}?)?\\s+cắt\\s+(?:các\\s+)?(?:đường\\s*thẳng\\s+|cạnh\\s+)?' +
    '([A-Z]{2})\\s*(?:,|và)\\s*([A-Z]{2})(?!\\p{L})\\s+(?:lần\\s*lượt\\s+)?(?:tại|ở)\\s+([A-Z])\\s*(?:,|và)\\s*([A-Z])(?![A-Z])',
  'gu',
);

function circleName(problem: string): string | undefined {
  const m = CIRCLE_REF.exec(problem);
  if (!m) return undefined;
  return /đường\s*kính/u.test(problem) ? `${m[1]}_c` : m[1];
}

export const tangentAtCutsLinesRule: LanguageRule = {
  id: 'tangentAtCutsLines',
  priority: 62,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const circle = circleName(ctx.problem);
    if (!circle) return [];
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      let matchedTwo = false;
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        matchedTwo = true;
        const at = m[1];
        const l1 = m[2];
        const l2 = m[3];
        const p = m[4];
        const q = m[5];
        if (p === q) continue;
        const t = `t${at}`;
        out.push({
          ruleId: 'tangentAtCutsLines',
          clauseIds: [c.id],
          intents: [
            drawLine(t, 'tangentAt', { through: at, circle }),
            addPoint(p, { kind: 'intersection', of: [t, l1] }),
            addPoint(q, { kind: 'intersection', of: [t, l2] }),
          ],
        });
      }
      // SINGLE chỉ khi clause KHÔNG khớp dạng 2-đường (tránh double-emit).
      if (matchedTwo) continue;
      SINGLE_RE.lastIndex = 0;
      for (const m of c.text.matchAll(SINGLE_RE)) {
        const at = m[1];
        const line = m[2];
        const z = m[3];
        if (line.includes(z) || line.includes(at)) continue;
        const t = `t${at}`;
        out.push({
          ruleId: 'tangentAtCutsLines',
          clauseIds: [c.id],
          intents: [
            drawLine(t, 'tangentAt', { through: at, circle }),
            addPoint(z, { kind: 'intersection', of: [t, line] }),
          ],
        });
      }
    }
    return out;
  },
};
