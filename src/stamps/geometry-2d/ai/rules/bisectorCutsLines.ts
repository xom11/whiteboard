// src/stamps/geometry-2d/ai/rules/bisectorCutsLines.ts
//
// Tia phân giác của một góc CẮT các đường khác tại điểm đặt tên (lớp 8 — tính chất
// đường phân giác, đồng dạng):
//   "Tia phân giác của góc ABC lần lượt cắt các đoạn thẳng AM, AC tại điểm D, E"
//   "Tia phân giác của góc B cắt AH, AC lần lượt tại D, E"
//   "Tia phân giác của góc B cắt AH tại D và cắt AC tại E"
//   "Đường phân giác của góc AMB cắt AB tại D và đường phân giác góc AMC cắt AC tại E"
//
// Cạnh đối của góc (nối hai đầu cạnh góc) → chân phân giác (angleBisectorFoot, nằm
// trên ĐOẠN); đường khác → giao với tia phân giác (tên line trùng quy ước
// angleBisectorAngle 'bis'+p1+đỉnh+p2 nên intent draw-line trùng JSON, dedup).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /phân\s*giác[^.;]{0,40}?cắt/u;
const TRI = /[Tt]am\s*giác(?:\s+(?:vuông|cân|đều|nhọn|tù))?\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/u;
const GOC = String.raw`(?:[Tt]ia\s+|[Đđ]ường\s+)?phân\s*giác\s+(?:trong\s+)?(?:của\s+)?góc\s+([A-Z]{3}|[A-Z])(?![A-Z])`;
const DOAN = String.raw`(?:(?:các\s+)?(?:đoạn(?:\s+thẳng)?|cạnh|đường\s*thẳng)\s+)?`;
const TT = String.raw`(?:(?:lần\s*lượt|theo\s+thứ\s+tự)\s+)?`;
// A: danh sách
const LIST = new RegExp(
  String.raw`${GOC}\s+${TT}cắt\s+${DOAN}([A-Z]{2})\s*(?:,|và)\s*${DOAN}([A-Z]{2})(?![A-Z])\s*,?\s*${TT}(?:tại|ở)\s+(?:các\s+điểm\s+|điểm\s+)?([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z'′])`,
  'gu',
);
// C: "cắt L1 tại P và (cắt)? L2 tại Q"
const HAI = new RegExp(
  String.raw`${GOC}\s+cắt\s+${DOAN}([A-Z]{2})(?![A-Z])\s+(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![A-Z'′])\s*(?:,\s*)?và\s+(?:cắt\s+)?${DOAN}([A-Z]{2})(?![A-Z])\s+(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![A-Z'′])`,
  'gu',
);
// B: đơn (nhiều lần trong mệnh đề)
const DON = new RegExp(
  String.raw`${GOC}\s+cắt\s+${DOAN}([A-Z]{2})(?![A-Z])\s+(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![A-Z'′])`,
  'gu',
);

const key = (s: string) => s.split('').sort().join('');

export const bisectorCutsLinesRule: LanguageRule = {
  id: 'bisectorCutsLines',
  priority: 61,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const tri = TRI.exec(ctx.problem);
    const goc = (g: string): [string, string, string] | null => {
      if (g.length === 3) return g[0] !== g[2] && g[1] !== g[0] && g[1] !== g[2] ? [g[0], g[1], g[2]] : null;
      if (!tri) return null;
      const t = [tri[1], tri[2], tri[3]];
      if (!t.includes(g)) return null;
      const [p1, p2] = t.filter((x) => x !== g);
      return [p1, g, p2];
    };
    const diem = (g: [string, string, string], L: string, P: string): IntentT[] | null => {
      const [p1, v, p2] = g;
      if (L.includes(P) || P === v) return null;
      if (key(L) === key(p1 + p2)) return [addPoint(P, { kind: 'angleBisectorFoot', from: v, onLine: L })];
      if (L.includes(v)) return null; // đường qua đỉnh góc: giao là chính đỉnh
      const ten = `bis${p1}${v}${p2}`;
      return [
        drawLine(ten, 'angleBisector', { p1, vertex: v, p2 }),
        addPoint(P, { kind: 'intersection', of: [ten, L] }),
      ];
    };
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const intents: IntentT[] = [];
      const xong = new Set<string>();
      let hong = false;
      const them = (g: string, L: string, P: string) => {
        if (xong.has(P)) return;
        const gg = goc(g);
        const r = gg ? diem(gg, L, P) : null;
        if (!r) { hong = true; return; }
        intents.push(...r);
        xong.add(P);
      };
      for (const m of c.text.matchAll(LIST)) { them(m[1], m[2], m[4]); them(m[1], m[3], m[5]); }
      for (const m of c.text.matchAll(HAI)) { them(m[1], m[2], m[3]); them(m[1], m[4], m[5]); }
      for (const m of c.text.matchAll(DON)) them(m[1], m[2], m[3]);
      if (hong || intents.length === 0) continue;
      out.push({ ruleId: 'bisectorCutsLines', clauseIds: [c.id], intents });
    }
    return out;
  },
};
