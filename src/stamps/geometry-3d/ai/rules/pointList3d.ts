import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { addPoint3d, splitVertexToken, residualHasGeometry } from './_shared';

// Danh sách điểm "lần lượt là trung điểm / trọng tâm" dạng tổng quát (N điểm, nhãn có prime/chỉ số,
// phân cách "," hoặc "và", "(của) (các|hai|ba) (cạnh|đoạn|tam giác)"). midpoint3d/centroid3d
// chỉ phủ "M, N lần lượt là trung điểm AB, CD" (2 điểm, dấu phẩy, không prime) — đây là
// dạng phổ biến nhất còn sót (≈50 mệnh đề trong 3 bộ lớp 11). Trùng intent với midpoint3d thì
// dedup JSON gộp lại (cùng name + cùng constraint).
const PT = "[A-Z](?:['′]|\\d)?";
const SEP = '\\s*(?:,|và)\\s*';
const NAMES = `((?:${PT}${SEP})+${PT})`;
const SEG = `${PT}${PT}`;
const TRI = `${PT}${PT}${PT}`;

const MID = new RegExp(
  `(?<![\\p{L}'′])${NAMES}\\s+(?:lần\\s+lượt|tương\\s+ứng)\\s+là\\s+(?:các\\s+)?trung\\s+điểm\\s+(?:của\\s+)?(?:các\\s+|hai\\s+|ba\\s+)?(?:cạnh\\s+|đoạn\\s+(?:thẳng\\s+)?)?((?:${SEG}${SEP})+${SEG})(?![\\p{L}'′\\d])`,
  'u',
);
const CEN = new RegExp(
  `(?<![\\p{L}'′])${NAMES}\\s+(?:lần\\s+lượt|tương\\s+ứng)\\s+là\\s+(?:các\\s+)?trọng\\s+tâm\\s+(?:của\\s+)?(?:các\\s+|hai\\s+|ba\\s+)?(?:tam\\s+giác\\s+|∆\\s*|Δ\\s*)?((?:${TRI}${SEP}(?:tam\\s+giác\\s+|∆\\s*|Δ\\s*)?)+${TRI})(?![\\p{L}'′\\d])`,
  'u',
);

const splitList = (s: string) => s.split(/\s*(?:,|và)\s*/u).map((x) => x.replace(/^(?:tam\s+giác\s+|∆\s*|Δ\s*)/u, '').trim()).filter(Boolean);

export const pointList3dRule: LanguageRule3D = {
  id: 'pointList3d',
  priority: 62,
  languages: ['vi'],
  patterns: [/(?:lần\s+lượt|tương\s+ứng)\s+là\s+(?:các\s+)?(?:trung\s+điểm|trọng\s+tâm)/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const out: RuleMatch3D[] = [];
    for (const c of ctx.clauses) {
      const intents: Intent3DT[] = [];
      const understood: string[] = [];
      const m = MID.exec(c.text);
      if (m) {
        const names = splitList(m[1]);
        const segs = splitList(m[2]).map(splitVertexToken);
        if (names.length === segs.length && segs.every((s) => s.length === 2 && s[0] !== s[1])) {
          names.forEach((n, i) => intents.push(addPoint3d(n, { kind: 'midpoint', p1: segs[i][0], p2: segs[i][1] })));
          understood.push(m[0]);
        }
      }
      const g = CEN.exec(c.text);
      if (g) {
        const names = splitList(g[1]);
        const tris = splitList(g[2]).map(splitVertexToken);
        if (names.length === tris.length && tris.every((t) => t.length === 3 && new Set(t).size === 3)) {
          names.forEach((n, i) => intents.push(addPoint3d(n, { kind: 'centroid', vertices: tris[i] })));
          understood.push(g[0]);
        }
      }
      // Mệnh đề còn nội dung khác chưa hiểu ⇒ vẫn dựng điểm nhưng KHÔNG claim (tránh FULL giả).
      if (intents.length) out.push({ ruleId: this.id, clauseIds: residualHasGeometry(c.text, understood) ? [] : [c.id], intents });
    }
    return out;
  },
};
