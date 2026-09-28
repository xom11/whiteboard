// src/stamps/geometry-2d/ai/rules/centersDistrib.ts
//
// Tâm của NHIỀU tam giác, phân phối theo thứ tự (hay gặp ở đề HSG):
//   "Gọi J, K, L tương ứng là tâm đường tròn ngoại tiếp tam giác ADX, BCX, PAB"
//   "G1, G2 lần lượt là trọng tâm các tam giác ABD, ACD"
// → J = circumcenter(A,D,X), K = circumcenter(B,C,X), … (zip 1-1). centers chỉ bắt
// MỘT tâm/mệnh đề (tam giác đầu tiên), nên trước đây J được dựng sai chỗ (tự do)
// và K, L mất. Số tên ≠ số tam giác ⇒ bỏ qua (không đoán lệch).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const NAME = "[A-Z](?:\\d|['′])?";
const RE = new RegExp(
  String.raw`(${NAME}(?:\s*(?:,|và)\s*${NAME})+)(?![A-Z])\s+(?:lần\s*lượt|tương\s+ứng|theo\s+thứ\s+tự)\s+là\s+(?:các\s+)?` +
    String.raw`(tâm\s*(?:của\s+)?(?:các\s+)?đường\s*tròn\s*ngoại\s*tiếp|tâm\s*(?:của\s+)?(?:các\s+)?đường\s*tròn\s*nội\s*tiếp|trọng\s*tâm|trực\s*tâm)` +
    String.raw`\s+(?:của\s+)?(?:các\s+)?(?:tam\s*giác\s+)?([A-Z]{3}(?:\s*(?:,|và)\s*[A-Z]{3})+)(?![A-Z])`,
  'u',
);

function kindOf(t: string): string {
  if (/ngoại/u.test(t)) return 'circumcenter';
  if (/nội/u.test(t)) return 'incenter';
  if (/trực/u.test(t)) return 'orthocenter';
  return 'centroid';
}

export const centersDistribRule: LanguageRule = {
  id: 'centersDistrib',
  // Trên centers: định nghĩa đủ cho MỌI tên phải thắng bản chỉ-một-tâm.
  priority: 91,
  languages: ['vi'],
  patterns: [/tâm/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = RE.exec(c.text);
      if (!m) continue;
      const names = m[1].split(/\s*,\s*|\s+và\s+/u).map((s) => s.trim().replace('′', "'"));
      const tris = m[3].split(/\s*,\s*|\s+và\s+/u).map((s) => s.trim());
      if (names.length !== tris.length || new Set(names).size !== names.length) continue;
      if (names.some((n, i) => tris[i].includes(n))) continue;
      const kind = kindOf(m[2]);
      out.push({
        ruleId: 'centersDistrib',
        clauseIds: [c.id],
        intents: names.map((n, i) => addPoint(n, { kind, of: [...tris[i]] })),
      });
    }
    return out;
  },
};
