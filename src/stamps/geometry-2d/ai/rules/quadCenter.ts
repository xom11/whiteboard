// src/stamps/geometry-2d/ai/rules/quadCenter.ts
//
// TÂM của hình bình hành / chữ nhật / thoi / vuông nêu ngay sau tên hình — cách viết
// chuẩn chương Vectơ lớp 10:
//   "Cho hình bình hành ABCD tâm O."          "Cho hình vuông ABCD có tâm O, cạnh a."
// Tâm = giao hai đường chéo AC, BD (dựng như diagonalsMeetNamed: vẽ hai đường chéo).
// Trước đây "tâm O" bị bỏ qua mà hình vẫn "đủ" (guard không coi "tâm O" là tên được
// giới thiệu) — O thiếu hẳn trên hình, mọi vectơ OA, OB… không có điểm gốc.
//
// Hình thang / tứ giác thường KHÔNG có "tâm" ⇒ không nhận.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const RE = /[Hh]ình\s+(?:bình\s+hành|chữ\s+nhật|thoi|vuông)\s+([A-Z])([A-Z])([A-Z])([A-Z])(?![A-Z])\s*,?\s*(?:có\s+)?tâm\s+(?:là\s+)?([A-Z])(?![A-Z'′\p{L}])/gu;

// "O là tâm (của) hình vuông ABCD" — tên tâm đứng trước.
const RE_TRUOC = /(?<![A-Z])([A-Z])(?![A-Z'′])\s+là\s+tâm\s+(?:của\s+)?[Hh]ình\s+(?:bình\s+hành|chữ\s+nhật|thoi|vuông)\s+([A-Z])([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;

export const quadCenterRule: LanguageRule = {
  id: 'quadCenter',
  // Dưới quad (100): cần 4 đỉnh đã có; addPoint intersection chỉ tham chiếu đỉnh.
  priority: 97,
  languages: ['vi'],
  patterns: [/tâm/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const hits = [
        ...[...c.text.matchAll(RE)].map((m) => [m[1], m[2], m[3], m[4], m[5]]),
        ...[...c.text.matchAll(RE_TRUOC)].map((m) => [m[2], m[3], m[4], m[5], m[1]]),
      ];
      for (const [a, b, cc, d, o] of hits) {
        if (new Set([a, b, cc, d, o]).size !== 5) continue;
        out.push({
          ruleId: 'quadCenter',
          clauseIds: [c.id],
          intents: [
            connect(a, cc, 'segment'),
            connect(b, d, 'segment'),
            addPoint(o, { kind: 'intersection', of: [a + cc, b + d] }),
          ],
        });
      }
    }
    return out;
  },
};
