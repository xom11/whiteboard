// src/stamps/geometry-2d/ai/rules/concurrencyCenter.ts
//
// Điểm đồng quy gọi theo ĐƯỜNG (cách nói lớp 7, chưa dùng chữ "tâm"/"trọng tâm"):
//
//   "Gọi I là giao điểm của ba đường phân giác của tam giác ABC"   → tâm nội tiếp
//   "Gọi G là giao điểm các đường trung tuyến của tam giác"         → trọng tâm
//   "Gọi H là giao điểm của ba đường cao"                            → trực tâm
//   "Gọi O là giao điểm của ba đường trung trực của tam giác ABC"   → tâm ngoại tiếp
//   "I là giao điểm của hai tia phân giác góc B và góc C"            → tâm nội tiếp
//   "I, J lần lượt là giao điểm các đường phân giác trong của tam giác ABH, tam giác ACH"
//
// Hai/ba đường cùng loại của một tam giác đồng quy tại đúng một điểm đặc biệt →
// dựng bằng incenter/centroid/orthocenter/circumcenter có sẵn, không cần vẽ đường.
//
// Thà thiếu còn hơn sai: "phân giác NGOÀI" bỏ qua; tam giác lấy từ chính cụm
// ("của tam giác ABH") hoặc tam giác ĐẦU của đề; "hai tia phân giác góc B và C" thì
// hai đỉnh phải thuộc tam giác đó.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const TRI = /tam\s*giác(?:\s+(?:vuông|cân|đều|nhọn|tù))?\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/u;
const KIND = String.raw`(phân\s*giác(?:\s+trong)?(?!\s+ngoài)|trung\s*tuyến|đường\s*cao|cao|trung\s*trực)`;
const TAMGIAC = String.raw`(?:\s+(?:của|trong)\s+(?:tam\s*giác(?:\s+([A-Z]{3})(?![A-Z]))?|nó))?`;
const DAU = String.raw`(?:giao\s*điểm|điểm\s+đồng\s+quy)\s+(?:của\s+)?(?:ba\s+|các\s+|hai\s+)?(?:đường\s+|tia\s+)?`;

// Tên đứng trước (một tên).
const MOT = new RegExp(String.raw`(?<![\p{L}\d'′])([A-Z])\s+(?:là\s+)?` + DAU + KIND + TAMGIAC + String.raw`(?![\p{L}])`, 'gu');
// Phân phối: "I, J lần lượt là giao điểm … của tam giác ABH, (tam giác)? ACH".
const PHAN_PHOI = new RegExp(
  String.raw`(?<![\p{L}\d'′])([A-Z])\s*(?:,|và)\s*([A-Z])\s+(?:lần\s*lượt\s+|theo\s+thứ\s+tự\s+)?là\s+` + DAU + KIND +
    String.raw`\s+(?:của\s+)?(?:các\s+)?tam\s*giác\s+([A-Z]{3})(?![A-Z])\s*(?:,|và)\s*(?:tam\s*giác\s+)?([A-Z]{3})(?![A-Z])`,
  'gu',
);
// "I là giao điểm của hai tia phân giác (của) (các) góc B và (góc) C"
const HAI_PG = new RegExp(
  String.raw`(?<![\p{L}\d'′])([A-Z])\s+(?:là\s+)?giao\s*điểm\s+(?:của\s+)?(?:hai\s+|các\s+)?(?:đường\s+|tia\s+)?phân\s*giác(?:\s+trong)?\s+(?:của\s+)?(?:các\s+|hai\s+)?(?:góc\s+)?([A-Z])\s+và\s+(?:góc\s+)?([A-Z])(?![\p{L}\d'′])`,
  'gu',
);

function loai(kw: string): 'incenter' | 'centroid' | 'orthocenter' | 'circumcenter' {
  if (/phân/u.test(kw)) return 'incenter';
  if (/tuyến/u.test(kw)) return 'centroid';
  if (/trực/u.test(kw)) return 'circumcenter';
  return 'orthocenter';
}

export const concurrencyCenterRule: LanguageRule = {
  id: 'concurrencyCenter',
  priority: 66,
  languages: ['vi'],
  patterns: [/(?:giao\s*điểm|đồng\s+quy)[^.]{0,30}(?:phân\s*giác|trung\s*tuyến|đường\s*cao|trung\s*trực)/u],
  match(ctx) {
    const tm = TRI.exec(ctx.problem);
    const tri0 = tm ? [tm[1], tm[2], tm[3]] : null;
    const out: RuleMatch[] = [];
    const push = (id: number, name: string, kind: string, tri: string[]) => {
      if (tri.includes(name) || new Set(tri).size !== 3) return;
      out.push({ ruleId: 'concurrencyCenter', clauseIds: [id], intents: [addPoint(name, { kind, of: tri })] });
    };
    for (const c of ctx.clauses) {
      const used = new Set<number>();
      for (const m of c.text.matchAll(PHAN_PHOI)) {
        const [, n1, n2, kw, t1, t2] = m;
        if (n1 === n2) continue;
        push(c.id, n1, loai(kw), t1.split(''));
        push(c.id, n2, loai(kw), t2.split(''));
        used.add(m.index ?? 0);
      }
      for (const m of c.text.matchAll(HAI_PG)) {
        const [, name, v1, v2] = m;
        if (!tri0 || v1 === v2 || !tri0.includes(v1) || !tri0.includes(v2)) continue;
        push(c.id, name, 'incenter', tri0);
      }
      for (const m of c.text.matchAll(MOT)) {
        const [whole, name, kw, triTxt] = m;
        const tri = triTxt ? triTxt.split('') : tri0;
        if (!tri) continue;
        // Phải là NHIỀU đường cùng loại ("ba/các/hai") hoặc nêu rõ "của tam giác".
        if (!/(?:giao\s*điểm|đồng\s+quy)\s+(?:của\s+)?(?:ba|các|hai)\s/u.test(whole) && !triTxt) continue;
        const rest = c.text.slice((m.index ?? 0) + whole.length);
        // "giao điểm của đường cao AH và trung tuyến BM" — hai loại khác nhau → không đoán.
        const khac = /^\s*(?:[A-Z]{2}\s*)?(?:,\s*)?và\s+(?:đường\s+|tia\s+)?(phân\s*giác|trung\s*tuyến|cao|trung\s*trực)/u.exec(rest);
        if (khac && loai(khac[1]) !== loai(kw)) continue;
        // "hai đường trung trực của AB và CD" — các đoạn nêu ra phải là cạnh của tam giác.
        const doan = /^\s*(?:của\s+)?(?:các\s+|hai\s+)?(?:cạnh\s+|đoạn\s+(?:thẳng\s+)?)?([A-Z])([A-Z])(?![A-Z])\s*(?:,|và)\s*(?:cạnh\s+|đoạn\s+(?:thẳng\s+)?)?([A-Z])([A-Z])(?![A-Z])/u.exec(rest);
        if (doan && ![doan[1], doan[2], doan[3], doan[4]].every((v) => tri.includes(v))) continue;
        push(c.id, name, loai(kw), tri);
      }
    }
    return out;
  },
};
