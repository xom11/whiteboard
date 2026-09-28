// src/stamps/geometry-2d/ai/rules/perpAtPointCutsLine.ts
//
// "Đường (thẳng)? vuông góc/song song với <L1> tại <P> cắt <L2> (ở|tại) <Q>"
//   "Đường vuông góc với AB tại B cắt CD ở I"
//     → draw-line prpB (perpThrough B→AB); Q = giao(prpB, L2).
//
// KHÁC perpThroughCutsLines (dạng "Qua P kẻ … cắt 2 đường tại H,K"): ở đây mệnh
// đề mở bằng "Đường … với L1 tại P" và CHỈ cắt 1 đường (1 giao điểm). Tên đường
// theo cùng quy ước parallelPerp ('prp'/'par'+P) để dedup nếu trùng.
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

// group1+2 = đường tham chiếu (L1), 3 = kind, 4 = điểm qua (P), 5+6 = đường bị
// cắt (L2), 7 = giao điểm (Q).
const RE = new RegExp(
  'Đường\\s*(?:thẳng\\s+)?(vuông\\s*góc|song\\s*song)\\s+(?:với\\s+)?(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+|đường\\s*thẳng\\s+)?' +
    '([A-Z])([A-Z])(?!\\p{L})\\s+tại\\s+([A-Z])(?!\\p{L})' +
    '[^.]{0,24}?cắt\\s+(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+)?([A-Z])([A-Z])(?!\\p{L})\\s+(?:ở|tại)\\s+([A-Z])(?![A-Z])',
  'gu',
);

// Biến thể cắt ĐƯỜNG TRÒN: "Đường vuông góc với AB tại C cắt (nửa)? đường tròn
// (O) (ở|tại) E" → E = giao đường vuông góc với đường tròn (branch 0). circle
// raw (resolveCircleNames map "_c"). group1+2=L1, 3=qua P, 4=tâm O, 5=giao E.
const RE_CIRCLE = new RegExp(
  'Đường\\s*(?:thẳng\\s+)?vuông\\s*góc\\s+(?:với\\s+)?(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+|đường\\s*thẳng\\s+)?' +
    '([A-Z])([A-Z])(?!\\p{L})\\s+tại\\s+([A-Z])(?!\\p{L})' +
    "[^.]{0,24}?cắt\\s+(?:nửa\\s+)?đường\\s*tròn\\s*\\(\\s*([A-Z](?:['′])?)\\s*\\)\\s+(?:ở|tại)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])",
  'gu',
);

// HAI đường bị cắt: "Đường thẳng vuông góc với MN tại N cắt các tiếp tuyến Ax, By
// của nửa đường tròn (O) lần lượt ở C và D", "… vuông góc với AB tại H cắt dây CB
// và tia AC lần lượt tại D và E". g1 kind, g2g3 L1, g4 qua, g5/g6 hai đường, g7/g8
// hai giao.
const LTOK2 = String.raw`(?:dây\s+(?:cung\s+)?|tia\s+|cạnh\s+|đoạn(?:\s+thẳng)?\s+|đường\s*thẳng\s+|tiếp\s*tuyến\s+)?([A-Z](?:[A-Z]|[xyzt]))(?![A-Za-z])`;
const RE_TWO = new RegExp(
  '[Đđ]ường\\s*(?:thẳng\\s+)?(vuông\\s*góc|song\\s*song)\\s+(?:với\\s+)?(?:cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+|đường\\s*thẳng\\s+)?' +
    '([A-Z])([A-Z])(?!\\p{L})\\s+tại\\s+([A-Z])(?!\\p{L})' +
    String.raw`[^.]{0,24}?cắt\s+(?:các\s+|hai\s+)?(?:tiếp\s*tuyến\s+|đường\s*thẳng\s+|cạnh\s+|tia\s+)?` + LTOK2 + String.raw`\s*(?:,|và)\s*` + LTOK2 +
    String.raw`[^.]{0,40}?(?:lần\s*lượt|theo\s+thứ\s+tự|thứ\s+tự)\s+(?:ở|tại)\s+(?:các\s+điểm\s+)?([A-Z])\s*(?:,|và)\s*([A-Z])(?![A-Z])`,
  'gu',
);

const PREFILTER = /[Đđ]ường\s*(?:thẳng\s+)?(?:vuông\s*góc|song\s*song)[^.]{0,40}?tại\s+[A-Z][^.]{0,24}?cắt/u;

export const perpAtPointCutsLineRule: LanguageRule = {
  id: 'perpAtPointCutsLine',
  priority: 50,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      let haiDuong = false;
      RE_TWO.lastIndex = 0;
      for (const m of c.text.matchAll(RE_TWO)) {
        const isParallel = /song/.test(m[1]);
        const l1 = m[2] + m[3];
        const through = m[4];
        const [d1, d2, q1, q2] = [m[5], m[6], m[7], m[8]];
        if (q1 === q2 || d1.includes(q1) || d2.includes(q2) || through === q1 || through === q2) continue;
        const name = (isParallel ? 'par' : 'prp') + through;
        haiDuong = true;
        out.push({
          ruleId: 'perpAtPointCutsLine',
          clauseIds: [c.id],
          intents: [
            drawLine(name, isParallel ? 'parallelThrough' : 'perpThrough', { through, to: l1 }),
            addPoint(q1, { kind: 'intersection', of: [name, d1] }),
            addPoint(q2, { kind: 'intersection', of: [name, d2] }),
          ],
        });
      }
      RE.lastIndex = 0;
      for (const m of haiDuong ? [] : c.text.matchAll(RE)) {
        const isParallel = /song/.test(m[1]);
        const l1 = m[2] + m[3];
        const through = m[4];
        const l2 = m[5] + m[6];
        const q = m[7];
        // degenerate: điểm qua không thuộc L1 thì ⊥ vẫn hợp lệ; nhưng L2 chứa Q
        // (giao trùng đầu mút) hoặc qua điểm = giao → bỏ.
        if (l2.includes(q) || through === q) continue;
        const kind = isParallel ? 'parallelThrough' : 'perpThrough';
        const name = (isParallel ? 'par' : 'prp') + through;
        out.push({
          ruleId: 'perpAtPointCutsLine',
          clauseIds: [c.id],
          intents: [
            drawLine(name, kind, { through, to: l1 }),
            addPoint(q, { kind: 'intersection', of: [name, l2] }),
          ],
        });
      }

      // Cắt ĐƯỜNG TRÒN: "Đường vuông góc với AB tại C cắt (nửa)? đường tròn (O) tại E".
      RE_CIRCLE.lastIndex = 0;
      for (const m of c.text.matchAll(RE_CIRCLE)) {
        const l1 = m[1] + m[2];
        const through = m[3];
        const circle = m[4];
        const e = m[5];
        if (l1.includes(e) || through === e) continue;
        const name = `prp${through}`;
        out.push({
          ruleId: 'perpAtPointCutsLine',
          clauseIds: [c.id],
          intents: [
            drawLine(name, 'perpThrough', { through, to: l1 }),
            addPoint(e, { kind: 'intersection', of: [name, circle], branch: 0 }),
          ],
        });
      }
    }
    return out;
  },
};
