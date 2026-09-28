// src/stamps/geometry-2d/ai/rules/perpBisectorsMeet.ts
//
// Giao của HAI đường trung trực của hai đoạn bất kì:
//   "các đường trung trực của các đoạn thẳng BE và CA cắt nhau ở I"
// → hai đoạn chung một đầu mút (AB, AC) ⇒ I = tâm ngoại tiếp ba điểm đó;
//   rời nhau (BE, CA) ⇒ I = giao hai đường trung trực (vẽ cả hai đường).
// Trước đây `intersection` đọc nhầm thành I = BE ∩ CA (hình sai mà vẫn full).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

const RE = new RegExp(
  String.raw`(?:[Cc]ác\s+|[Hh]ai\s+)?(?:[Đđ]ường\s+)?trung\s*trực\s+(?:của\s+)?(?:các\s+|hai\s+)?(?:đoạn\s*(?:thẳng\s+)?|cạnh\s+)?([A-Z])([A-Z])\s*(?:,|và)\s*([A-Z])([A-Z])(?![\p{L}\d'′])` +
    String.raw`\s+(?:cắt|giao)\s+nhau\s+(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![\p{L}\d'′])`,
  'gu',
);

export const perpBisectorsMeetRule: LanguageRule = {
  id: 'perpBisectorsMeet',
  priority: 49,
  languages: ['vi'],
  patterns: [/trung\s*trực[^.]{0,60}(?:cắt|giao)\s+nhau/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(RE)) {
        const [, a, b, x, y, p] = m;
        if (a === b || x === y || [a, b, x, y].includes(p)) continue;
        const pts = [...new Set([a, b, x, y])];
        if (pts.length === 2) continue; // cùng một đoạn
        if (pts.length === 3) {
          out.push({ ruleId: 'perpBisectorsMeet', clauseIds: [c.id], intents: [addPoint(p, { kind: 'circumcenter', of: pts })] });
          continue;
        }
        const l1 = `pb_${a}${b}`;
        const l2 = `pb_${x}${y}`;
        out.push({
          ruleId: 'perpBisectorsMeet',
          clauseIds: [c.id],
          intents: [
            drawLine(l1, 'perpBisector', { p1: a, p2: b }),
            drawLine(l2, 'perpBisector', { p1: x, p2: y }),
            addPoint(p, { kind: 'intersection', of: [l1, l2] }),
          ],
        });
      }
    }
    return out;
  },
};
