// src/stamps/geometry-2d/ai/rules/parallelThroughCutsCircle.ts
//
// Đường thẳng QUA 1 điểm P, SONG SONG với 1 đường tham chiếu, rồi CẮT đường tròn
// (O) (và optionally 1 đường thẳng khác) tại điểm đặt tên — kể cả dạng PHÂN PHỐI
// 2 điểm.
//
//   A) Phân phối (Bài 65/69): "Các đường thẳng qua hai điểm C và B song song với
//      đường thẳng AO cắt đường tròn (O) lần lượt tại E và F"
//        → C: drawLine(parC, parallelThrough C→AO) + E = secondIntersection(parC,O,other=C)
//          B: drawLine(parB, parallelThrough B→AO) + F = secondIntersection(parB,O,other=B)
//      ("qua C và B … cắt (O) lần lượt tại E và F" zip C↔E, B↔F.)
//
//   B) Đường đặt tên chữ thường, cắt 2 thứ ở 2 clause (Bài 111): "Qua B kẻ đường
//      thẳng d song song với CD. Đường thẳng d cắt đường thẳng AC tại E, cắt đường
//      tròn (O) tại F (F khác B)."
//        → drawLine(parB, parallelThrough B→CD)
//          E = intersection(parB, AC);  F = secondIntersection(parB,O,other=B)
//      Đường "d" khai báo ở 1 clause, tham chiếu "Đường thẳng d" ở clause sau →
//      map d → parB (CÙNG quy ước parallelPerp 'par'+P nên draw-line dedup nếu
//      parallelPerp cũng khớp khai báo).
//
// `other` (giao đã biết của đường song song với (O)) = chính điểm qua P (P nằm
// trên (O) trong các đề này). Emit kèm — transpile validate.
//
// GOTCHA \b: dùng (?!\p{L}) + cờ 'u' quanh ký tự Việt.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { drawLine, addPoint } from './_shared';

// --- A) Phân phối 1 clause: "qua C và B … song song … AO … cắt (O) … lần lượt
//        tại E và F". groups: 1=P1 2=P2 3+4=ref 5=circle 6=pt1 7=pt2.
const DISTRIB = new RegExp(
  String.raw`(?:[CcNn]ác\s+)?đường\s*thẳng\s+qua\s+(?:hai\s+điểm\s+)?([A-Z])(?!\p{L})\s+và\s+([A-Z])(?!\p{L})` +
    String.raw`\s+song\s*song\s+(?:với\s+)?(?:đường\s*thẳng\s+)?([A-Z])([A-Z])(?!\p{L})` +
    String.raw`[^.]{0,30}?cắt\s+(?:đường\s*tròn\s*)?\(\s*([A-Z])\s*\)` +
    String.raw`[^.]{0,30}?lần\s*lượt\s+(?:ở|tại)\s+([A-Z])\s+và\s+([A-Z])(?!\p{L})`,
  'gu',
);

// --- B-decl) Khai báo đường đặt tên chữ thường: "Qua P kẻ đường thẳng <lc> song
//        song với <ref>". groups: 1=P 2=tên-đường(chữ thường) 3+4=ref.
const DECL_NAMED = new RegExp(
  String.raw`(?:[Qq]ua|[Tt]ừ)\s+(?:điểm\s+)?([A-Z])(?!\p{L})` +
    String.raw`\s+(?:kẻ|vẽ|dựng)\s+đường\s*thẳng\s+([a-z])(?!\p{L})` +
    String.raw`\s+song\s*song\s+(?:với\s+)?(?:đường\s*thẳng\s+)?([A-Z])([A-Z])(?!\p{L})`,
  'u',
);

// --- B-cut) Tham chiếu đường đặt tên ở clause sau: "Đường thẳng <lc> cắt (đường
//        thẳng)? <X> tại E, cắt (đường tròn)? (O) tại F". groups: 1=tên-đường
//        2+3=line2 4=E 5=circle 6=F.
const NAMED_CUT_BOTH = new RegExp(
  String.raw`[Đđ]ường\s*thẳng\s+([a-z])(?!\p{L})` +
    String.raw`\s+cắt\s+(?:đường\s*thẳng\s+|cạnh\s+|đoạn\s+)?([A-Z])([A-Z])(?!\p{L})\s+(?:ở|tại)\s+(?:điểm\s+)?([A-Z])(?!\p{L})` +
    String.raw`[^.]{0,8}?cắt\s+(?:đường\s*tròn\s*)?\(\s*([A-Z])\s*\)\s+(?:ở|tại)\s+(?:điểm\s+(?:thứ\s+hai\s+)?)?(?:là\s+)?([A-Z])(?!\p{L})`,
  'u',
);

// Prefilter toàn đề (NON-global cho .test). HAI nhánh:
//  A) dạng phân phối/1-câu: "qua … song song … cắt" trong cùng 1 câu ([^.]).
//  B) dạng đường đặt tên cross-clause: khai báo "Qua P kẻ đường thẳng <lc> song
//     song …" KẾT THÚC bằng '.' rồi câu sau "Đường thẳng <lc> … cắt …(" — '.'
//     chen giữa nên nhánh A ([^.]) không bắt được. Nhánh B chỉ cần đồng-hiện
//     "kẻ đường thẳng <lc> song song" (match() tự validate phần "cắt (O)").
const PREFILTER =
  /(?:[Qq]ua|đường\s*thẳng\s+qua)\s+[^.]{0,60}?song\s*song[^.]{0,80}?cắt|(?:[Qq]ua|[Tt]ừ)\s+(?:điểm\s+)?[A-Z][^.]{0,20}?(?:kẻ|vẽ|dựng)\s+đường\s*thẳng\s+[a-z]\s+song\s*song/u;

function lineNameOf(through: string): string {
  return 'par' + through;
}

// Tìm đường tròn duy nhất nêu tên trong đề ("(O)"/"đường tròn (O)") → 1 ký tự HOA.
function resolveCircle(problem: string): string | undefined {
  const m = /đường\s*tròn\s*\(\s*([A-Z])\s*\)|\(\s*([A-Z])\s*\)/u.exec(problem);
  if (!m) return undefined;
  return m[1] ?? m[2];
}

function secondIntersection(name: string, line: string, circle: string, other: string): IntentT {
  return addPoint(name, { kind: 'secondIntersection', line, circle, other });
}

export const parallelThroughCutsCircleRule: LanguageRule = {
  id: 'parallelThroughCutsCircle',
  priority: 46,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const circle = resolveCircle(ctx.problem);
    if (!circle) return []; // không có đường tròn duy nhất → escalate
    const out: RuleMatch[] = [];

    // Map tên-đường chữ thường (vd "d") → {through, lineName} từ clause khai báo.
    // Dùng cho dạng B (tham chiếu cross-clause).
    const namedLines = new Map<string, { through: string; lineName: string }>();

    for (const c of ctx.clauses) {
      // --- A) Phân phối trong 1 clause ----------------------------------------
      DISTRIB.lastIndex = 0;
      let matchedDistrib = false;
      for (const m of c.text.matchAll(DISTRIB)) {
        const [p1, p2] = [m[1], m[2]];
        const to = m[3] + m[4];
        const cir = m[5];
        const [e, f] = [m[6], m[7]];
        if (p1 === p2 || e === f) continue;
        // song song với đường CHỨA chính điểm qua → degenerate, bỏ.
        if (to.includes(p1) || to.includes(p2)) continue;
        const intents: IntentT[] = [];
        for (const [p, pt] of [
          [p1, e],
          [p2, f],
        ] as const) {
          const lineName = lineNameOf(p);
          intents.push(
            drawLine(lineName, 'parallelThrough', { through: p, to }),
            secondIntersection(pt, lineName, cir, p),
          );
        }
        out.push({ ruleId: 'parallelThroughCutsCircle', clauseIds: [c.id], intents });
        matchedDistrib = true;
      }
      if (matchedDistrib) continue;

      // --- B-decl) Học mapping tên-đường chữ thường --------------------------
      const decl = DECL_NAMED.exec(c.text);
      if (decl) {
        const through = decl[1];
        const named = decl[2];
        const to = decl[3] + decl[4];
        if (!to.includes(through)) {
          namedLines.set(named, { through, lineName: lineNameOf(through) });
          // Emit luôn draw-line (dedup nếu parallelPerp cũng khớp khai báo này).
          out.push({
            ruleId: 'parallelThroughCutsCircle',
            clauseIds: [c.id],
            intents: [drawLine(lineNameOf(through), 'parallelThrough', { through, to })],
          });
        }
        continue;
      }

      // --- B-cut) Tham chiếu "Đường thẳng <d> cắt <X> tại E, cắt (O) tại F" ---
      const cut = NAMED_CUT_BOTH.exec(c.text);
      if (cut) {
        const named = cut[1];
        const decl2 = namedLines.get(named);
        if (!decl2) continue; // chưa thấy khai báo đường này → bỏ (an toàn)
        const { through, lineName } = decl2;
        const line2 = cut[2] + cut[3];
        const e = cut[4];
        const cir = cut[5];
        const f = cut[6];
        if (e === f || line2.includes(e) || lineName === e) continue;
        out.push({
          ruleId: 'parallelThroughCutsCircle',
          clauseIds: [c.id],
          intents: [
            addPoint(e, { kind: 'intersection', of: [lineName, line2] }),
            secondIntersection(f, lineName, cir, through),
          ],
        });
      }
    }
    return out;
  },
};
