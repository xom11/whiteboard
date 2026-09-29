// src/stamps/geometry-2d/ai/rules/namedLinesMeet.ts
//
// Giao của HAI ĐƯỜNG THẲNG ĐẶT TÊN chữ thường:
//   "Hai đường thẳng d và d' cắt nhau tại P"  → P = giao(d, d')
//   "Đường thẳng a cắt đường thẳng b tại M"
//
// Hai đường phải được DỰNG ở mệnh đề khác (named-line: "Qua B kẻ đường thẳng d // AC")
// — rule này chỉ đặt tên giao điểm. Đường chưa dựng → UNKNOWN_REF → vẽ một phần
// (không đoán).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const TEN = String.raw`([a-z]{1,2}[0-9]?'?)(?![\p{L}\d'])`;
const RE = [
  new RegExp(
    String.raw`(?:[Hh]ai\s+)?[Đđ]ường\s*thẳng\s+${TEN}\s+và\s+(?:đường\s*thẳng\s+)?${TEN}\s+cắt\s+nhau\s+(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![\p{L}\d'])`,
    'gu',
  ),
  new RegExp(
    String.raw`[Đđ]ường\s*thẳng\s+${TEN}\s+cắt\s+(?:đường\s*thẳng\s+)${TEN}\s+(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![\p{L}\d'])`,
    'gu',
  ),
];

export const namedLinesMeetRule: LanguageRule = {
  id: 'namedLinesMeet',
  priority: 46, // sau named-line (63) dựng đường; trên intersection (45).
  languages: ['vi'],
  patterns: [/đường\s*thẳng\s+[a-z]{1,2}[0-9]?'?\s+(?:và|cắt)/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const re of RE) {
        re.lastIndex = 0;
        for (const m of c.text.matchAll(re)) {
          const [, d1, d2, p] = m;
          if (d1 === d2) continue;
          out.push({ ruleId: 'namedLinesMeet', clauseIds: [c.id], intents: [addPoint(p, { kind: 'intersection', of: [d1, d2] })] });
        }
      }
    }
    return out;
  },
};
