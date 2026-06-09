// src/stamps/geometry-2d/ai/rules/lineCircleIntersection.ts
//
// Giao đường thẳng/đoạn với đường tròn:
//   "CM cắt (O) tại N" → N = secondIntersection(CM, O), other=C
//   "AD, BE, CF cắt đường tròn (O) lần lượt tại M, N, P"
//     → M/N/P là giao thứ hai, loại A/B/C tương ứng.
//
// `other` lấy là chữ đầu của line token XY. Đây đúng cho các đề phổ biến
// "đường cao AD cắt lại ngoại tiếp tại M", "CM cắt (O) tại N"; dạng cần loại
// chữ thứ hai sẽ phải có rule riêng/fail-safe sau.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /cắt\s+(?:đường\s*tròn\s*)?\(/u;
const CIRCLE = String.raw`(?:đường\s*tròn\s*)?\(\s*([A-Z])(?:['′]?)\s*\)`;

const TRIPLE_DISTRIB = new RegExp(
  String.raw`([A-Z]{2})\s*,\s*([A-Z]{2})\s*,\s*([A-Z]{2})(?![A-Z])[^.]{0,80}?cắt\s+` +
    CIRCLE +
    String.raw`[^.]{0,40}?lần\s*lượt\s+(?:ở|tại)\s+([A-Z])\s*,\s*([A-Z])\s*,\s*([A-Z])(?![A-Z])`,
  'gu',
);

const SINGLE = new RegExp(
  String.raw`([A-Z]{2})(?![A-Z])\s+cắt\s+` + CIRCLE + String.raw`\s+(?:ở|tại)\s+([A-Z])(?![A-Z])`,
  'gu',
);

function secondIntersection(name: string, line: string, circle: string) {
  return addPoint(name, { kind: 'secondIntersection', line, circle, other: line[0] });
}

function valid(name: string, line: string): boolean {
  return /^[A-Z]$/u.test(name) && /^[A-Z]{2}$/u.test(line) && !line.includes(name);
}

export const lineCircleIntersectionRule: LanguageRule = {
  id: 'line-circle-intersection',
  priority: 47,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const intents = [];

      TRIPLE_DISTRIB.lastIndex = 0;
      for (const m of c.text.matchAll(TRIPLE_DISTRIB)) {
        const circle = m[4];
        const pairs: Array<[string, string]> = [[m[1], m[5]], [m[2], m[6]], [m[3], m[7]]];
        if (pairs.every(([line, name]) => valid(name, line))) {
          intents.push(...pairs.map(([line, name]) => secondIntersection(name, line, circle)));
        }
      }

      SINGLE.lastIndex = 0;
      for (const m of c.text.matchAll(SINGLE)) {
        const line = m[1];
        const circle = m[2];
        const name = m[3];
        if (valid(name, line)) intents.push(secondIntersection(name, line, circle));
      }

      if (intents.length > 0) out.push({ ruleId: 'line-circle-intersection', clauseIds: [c.id], intents });
    }
    return out;
  },
};
