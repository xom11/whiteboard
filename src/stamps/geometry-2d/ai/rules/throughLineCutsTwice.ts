// src/stamps/geometry-2d/ai/rules/throughLineCutsTwice.ts
//
// Một đường qua điểm, song song/vuông góc với đoạn, "cắt … tại E và cắt … tại F":
//   "Từ H kẻ đường thẳng song song với AI, cắt AB kéo dài tại E và cắt AC tại F"
// (`perpThroughCutsLines` chỉ nhận "cắt L1, L2 tại E, F" hoặc một lần cắt, và không
// nhận "kéo dài" — nên E bị bỏ.) Tên đường theo quy ước parallelPerp (par/prp + P).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

const CAT = String.raw`cắt\s+(?:đường\s*thẳng\s+|cạnh\s+|đoạn\s+)?([A-Z])([A-Z])(?![\p{L}\d'′])(?:\s+kéo\s+dài)?\s+(?:ở|tại)\s+(?:điểm\s+)?([A-Z])(?![\p{L}\d'′])`;
const RE = new RegExp(
  String.raw`(?:[Qq]ua|[Tt]ừ)\s+(?:điểm\s+)?([A-Z])(?![\p{L}\d'′])[^.]{0,30}?(song\s*song|vuông\s*góc)\s+(?:với\s+)?(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+|đường\s*thẳng\s+)?([A-Z])([A-Z])(?![\p{L}\d'′])` +
    String.raw`\s*,?\s*` + CAT + String.raw`\s*(?:,\s*)?và\s+` + CAT,
  'gu',
);

export const throughLineCutsTwiceRule: LanguageRule = {
  id: 'throughLineCutsTwice',
  priority: 57,
  languages: ['vi'],
  patterns: [/cắt[^.]{0,30}(?:tại|ở)\s+[A-Z]\s*,?\s*và\s+cắt/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(RE)) {
        const [, p, kw, r1, r2, a1, b1, e, a2, b2, f] = m;
        const song = /song/u.test(kw);
        if (song && (r1 === p || r2 === p)) continue;
        if (e === f || e === p || f === p || [a1, b1].includes(e) || [a2, b2].includes(f)) continue;
        const ln = (song ? 'par' : 'prp') + p;
        out.push({
          ruleId: 'throughLineCutsTwice',
          clauseIds: [c.id],
          intents: [
            drawLine(ln, song ? 'parallelThrough' : 'perpThrough', { through: p, to: r1 + r2 }),
            addPoint(e, { kind: 'intersection', of: [ln, a1 + b1] }),
            addPoint(f, { kind: 'intersection', of: [ln, a2 + b2] }),
          ],
        });
      }
    }
    return out;
  },
};
