// src/stamps/geometry-2d/ai/rules/polygonInscribedCircle.ts
//
// "hình vuông / hình chữ nhật ABCD nội tiếp (đường tròn)? (O)" → đường tròn
// ngoại tiếp đa giác = circle qua 3 đỉnh đầu (đa giác này CYCLIC theo dựng hình:
// vuông + chữ nhật luôn nội tiếp được, 3 đỉnh xác định đường tròn, đỉnh 4 tự nằm
// trên). drawCircle('O', through3, [A,B,C]). resolveCircleNameCollisions sẽ
// inject tâm O (circumcenter) + đổi tên circle O→O_c nếu O bị dùng như point.
//
// CHỈ nhận hình vuông / chữ nhật (cyclic-by-construction). KHÔNG nhận "tứ giác"
// / "hình bình hành" chung (không cyclic theo dựng hình mặc định → through3 sẽ
// sai) → để escalate / rule khác.
//
// \b không khớp ký tự Việt → lookaround \p{L} + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { drawCircle } from './_shared';

const PREFILTER = /(?:hình\s+vuông|hình\s+chữ\s+nhật)[^.]{0,40}?nội\s*tiếp/u;

// "(hình vuông|hình chữ nhật) ABCD ... nội tiếp (đường tròn)? ( (O) | tâm O )".
const POLY_INSCRIBED = new RegExp(
  '(?:hình\\s+vuông|hình\\s+chữ\\s+nhật)\\s+([A-Z])([A-Z])([A-Z])([A-Z])(?![A-Z])' +
    '[^.]{0,30}?nội\\s*tiếp\\s+(?:trong\\s+)?(?:đường\\s*tròn\\s*)?(?:\\(\\s*([A-Z])\\s*\\)|tâm\\s+([A-Z]))',
  'u',
);

export const polygonInscribedCircleRule: LanguageRule = {
  id: 'polygon-inscribed-circle',
  priority: 66,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = POLY_INSCRIBED.exec(c.text);
      if (!m) continue;
      const verts = [m[1], m[2], m[3], m[4]];
      const center = m[5] ?? m[6];
      if (!center) continue;
      // through3 dùng 3 đỉnh đầu — đa giác cyclic nên đỉnh 4 tự nằm trên.
      out.push({
        ruleId: 'polygon-inscribed-circle',
        clauseIds: [c.id],
        intents: [drawCircle(center, 'through3', { points: verts.slice(0, 3) })],
      });
    }
    return out;
  },
};
