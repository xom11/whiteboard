// src/stamps/geometry-2d/ai/rules/externalBisectorCutsLines.ts
//
// "Đường thẳng chứa phân giác ngoài của góc BHC cắt AB, AC lần lượt tại M, N"
//   → phân giác NGOÀI ∠BHC = đường ⊥ phân giác TRONG tại đỉnh H.
//     M = giao(phân-giác-ngoài, AB); N = giao(…, AC).
//
// Dựng: angleBisector(B,H,C) [trong] → perpThrough(H, đó) [ngoài] → 2 giao.
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /phân\s*giác\s+ngoài\s+(?:của\s+)?góc\s+[A-Z]{3}[^.]{0,30}?cắt/u;

// group1..3 = đỉnh góc (vertex = giữa), 4+5 = 2 đường bị cắt, 6+7 = 2 giao điểm.
const RE = new RegExp(
  '[Đđ]ường\\s*thẳng\\s+(?:chứa\\s+)?phân\\s*giác\\s+ngoài\\s+(?:của\\s+)?góc\\s+([A-Z])([A-Z])([A-Z])(?![A-Z])' +
    '[^.]{0,20}?cắt\\s+(?:các\\s+(?:cạnh|đường\\s*thẳng)\\s+)?([A-Z]{2})\\s*(?:,|và)\\s*([A-Z]{2})(?!\\p{L})' +
    '\\s+(?:lần\\s*lượt\\s+)?(?:ở|tại)\\s+(?:các\\s+điểm\\s+)?([A-Z])\\s*(?:,|và)\\s*([A-Z])(?![A-Z])',
  'gu',
);

export const externalBisectorCutsLinesRule: LanguageRule = {
  id: 'externalBisectorCutsLines',
  priority: 57,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const [p1, vertex, p2] = [m[1], m[2], m[3]];
        const l1 = m[4];
        const l2 = m[5];
        const n1 = m[6];
        const n2 = m[7];
        if (n1 === n2) continue;
        const bis = `bisIn${vertex}`; // phân giác trong ∠p1·vertex·p2
        const ext = `bisOut${vertex}`; // phân giác ngoài = ⊥ phân giác trong tại vertex
        out.push({
          ruleId: 'externalBisectorCutsLines',
          clauseIds: [c.id],
          intents: [
            drawLine(bis, 'angleBisector', { p1, vertex, p2 }),
            drawLine(ext, 'perpThrough', { through: vertex, to: bis }),
            addPoint(n1, { kind: 'intersection', of: [ext, l1] }),
            addPoint(n2, { kind: 'intersection', of: [ext, l2] }),
          ],
        });
      }
    }
    return out;
  },
};
