// src/stamps/geometry-2d/ai/rules/intersectionDistrib.ts
//
// Giao điểm PHÂN PHỐI: một đường chung cắt nhiều đường, tên giao điểm liệt kê theo thứ tự:
//   "Gọi M, N theo thứ tự là giao điểm của BD với AF, CE"   → M = BD∩AF, N = BD∩CE
//   "Gọi H, K thứ tự là giao điểm của MN với AO và BC"
//   "Gọi K và F lần lượt là giao điểm của ED với AC và OI"
//
// Rule intersection generic chỉ nhận MỘT giao điểm "giao điểm của AB và CD"; dạng
// phân phối bị bỏ ⇒ incomplete-coverage (cả bài không vẽ đủ). Số tên PHẢI bằng
// số đường bị cắt, else bỏ qua (không đoán lệch).
//
// GOTCHA \b: ký tự Việt → cờ 'u' + lookaround.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /giao\s*điểm\s+(?:của\s+)?(?:đường\s*thẳng\s+)?[A-Z]{2}\s+với/u;

const NAMES = "((?:[A-Z](?:['′])?\\s*(?:,|và)\\s*)+[A-Z](?:['′])?)(?![A-Z])";
const LINES = '((?:[A-Z]{2}\\s*(?:,|và)\\s*)+[A-Z]{2})(?![A-Z])';
const RE = new RegExp(
  String.raw`${NAMES}\s+(?:lần\s*lượt\s+|(?:theo\s+)?thứ\s+tự\s+)?là\s+(?:các\s+)?giao\s*điểm\s+(?:của\s+)?(?:đường\s*thẳng\s+)?([A-Z]{2})(?![A-Z])\s+với\s+(?:các\s+)?(?:đường\s*thẳng\s+)?${LINES}`,
  'gu',
);

const tach = (blob: string) => blob.split(/\s*,\s*|\s+và\s+/u).map((s) => s.trim().replace('′', "'")).filter(Boolean);

export const intersectionDistribRule: LanguageRule = {
  id: 'intersectionDistrib',
  // Như intersection generic (45): đầu mút phái sinh phải có trước (topo retry lo).
  priority: 45,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(RE)) {
        const names = tach(m[1]);
        const common = m[2];
        const lines = tach(m[3]);
        if (names.length < 2 || names.length !== lines.length) continue;
        const intents = [];
        for (let i = 0; i < names.length; i++) {
          const ends = new Set([common[0], common[1], lines[i][0], lines[i][1]]);
          // Hai đường phải khác nhau (≥3 đầu mút phân biệt), tên giao điểm là điểm MỚI.
          if (ends.size < 3 || ends.has(names[i])) { intents.length = 0; break; }
          intents.push(addPoint(names[i], { kind: 'intersection', of: [common, lines[i]] }));
        }
        if (intents.length) out.push({ ruleId: 'intersectionDistrib', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
