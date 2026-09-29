// src/stamps/geometry-2d/ai/rules/pointNamedOnSegment.ts
//
// Điểm tự do trên đoạn, tên đứng trước, có "tùy ý / bất kì" và giới từ "trên":
//   "Gọi M là điểm tùy ý trên đoạn thẳng AH"
//   "M là một điểm bất kì nằm trên cạnh BC"
// → M = onSegment(AH). (`onSegmentPoint` chỉ nhận "… là điểm (bất kì) THUỘC …".)
//
// Không nhận khi có "sao cho" theo sau (điểm có điều kiện — việc của rule đo độ dài)
// hay "tia đối"/"tia" (tia không có đoạn giới hạn).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const RE = new RegExp(
  String.raw`(?<![\p{L}\d'′])([A-Z])\s+là\s+(?:một\s+)?điểm\s+(?:bất\s*k[iìyỳ]\s+|t[uù][yỳ]\s*ý\s+)?(?:nằm\s+)?trên\s+(?:cạnh\s+|đoạn\s*(?:thẳng\s+)?)([A-Z])([A-Z])(?![\p{L}\d'′])(?!\s*,?\s*sao\s+cho)`,
  'gu',
);

export const pointNamedOnSegmentRule: LanguageRule = {
  id: 'pointNamedOnSegment',
  priority: 62,
  languages: ['vi'],
  patterns: [/là\s+(?:một\s+)?điểm[^.]{0,20}trên\s+(?:cạnh|đoạn)/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(RE)) {
        const [, p, a, b] = m;
        if (p === a || p === b || a === b) continue;
        out.push({ ruleId: 'pointNamedOnSegment', clauseIds: [c.id], intents: [addPoint(p, { kind: 'onSegment', of: a + b })] });
      }
    }
    return out;
  },
};
