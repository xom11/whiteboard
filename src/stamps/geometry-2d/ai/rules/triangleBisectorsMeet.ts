// src/stamps/geometry-2d/ai/rules/triangleBisectorsMeet.ts
//
// Hai phân giác của HAI GÓC TAM GIÁC cắt nhau — dạng lớp 7 chỉ nêu ĐỈNH góc:
//
//   "Các tia phân giác của góc B và C cắt nhau ở I"            → I = tâm nội tiếp
//   "Hai tia phân giác của góc B và góc C cắt nhau tại I"      → I = tâm nội tiếp
//   "Các đường phân giác ngoài tại đỉnh B và C cắt nhau ở E"   → E = tâm bàng tiếp góc A
//   "Các đường phân giác các góc ngoài tại đỉnh A và C cắt nhau ở K" → bàng tiếp góc B
//
// Hai phân giác trong của tam giác giao nhau ĐÚNG tại tâm nội tiếp; hai phân giác
// ngoài tại X, Y giao nhau ĐÚNG tại tâm bàng tiếp ứng với đỉnh thứ ba → dựng
// chính xác bằng incenter/excenter có sẵn, nối X–giao, Y–giao.
//
// `bisectorsMeet` chỉ nhận góc 3 chữ (∠ABC); `angleBisectorAngle` vẽ một tia nhưng
// không đặt tên giao điểm → trước rule này đề thiếu điểm I (transpile-fail).
//
// Thà thiếu còn hơn sai: trộn "phân giác trong góc B và phân giác ngoài góc C"
// không khớp (vế sau chỉ được là tên đỉnh); đỉnh phải thuộc tam giác và khác nhau.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const TRI = /tam\s*giác(?:\s+(?:vuông|cân|đều|nhọn|tù))?\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/u;

const RE = new RegExp(
  String.raw`[Pp]hân\s*giác((?:\s+(?:ngoài|trong|của|các|hai|góc|tại|đỉnh))*)\s+([A-Z])\s+và\s+(?:(?:góc|đỉnh)\s+)?([A-Z])(?![\p{L}\d'′])` +
    String.raw`(?:\s+(?:của|trong)\s+tam\s*giác\s+[A-Z]{3}(?![A-Z]))?\s*,?\s*(?:cắt|giao)\s+nhau\s+(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![\p{L}\d'′])`,
  'gu',
);

export const triangleBisectorsMeetRule: LanguageRule = {
  id: 'triangleBisectorsMeet',
  // Trên intersection (45) / bisectorsMeet (49): đặt tên giao điểm trước.
  priority: 50,
  languages: ['vi'],
  patterns: [/[Pp]hân\s*giác[^.]{0,80}?(?:cắt|giao)\s+nhau/u],
  match(ctx) {
    const tm = TRI.exec(ctx.problem);
    if (!tm) return [];
    const tri = [tm[1], tm[2], tm[3]];
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const [, mid, v1, v2, name] = m;
        if (v1 === v2 || !tri.includes(v1) || !tri.includes(v2) || tri.includes(name)) continue;
        const ngoai = /ngoài/u.test(mid);
        const third = tri.find((v) => v !== v1 && v !== v2)!;
        const constraint = ngoai
          ? { kind: 'excenter', of: tri, opposite: third }
          : { kind: 'incenter', of: tri };
        out.push({
          ruleId: 'triangleBisectorsMeet',
          clauseIds: [c.id],
          intents: [addPoint(name, constraint), connect(v1, name, 'segment'), connect(v2, name, 'segment')],
        });
      }
    }
    return out;
  },
};
