// src/stamps/geometry-2d/ai/rules/perpChordThroughPoint.ts
//
// Dây cung VUÔNG GÓC kẻ qua một điểm, của đường tròn ĐƯỜNG KÍNH có sẵn:
//   "Qua M kẻ dây cung DE vuông góc với AB"
//     → đường ⊥ qua M tới AB (prpM) + D,E = giao(prpM, đường tròn (O)) 2 nhánh + đoạn DE.
//
// Đây KHÁC chord.ts ("dây AB" → 2 glider tự do trên đường tròn minh hoạ): ở đây dây
// được RÀNG BUỘC ⊥ với một đoạn và đi qua một điểm cho trước, nên 2 đầu mút D,E là
// GIAO ĐIỂM của đường vuông góc với đường tròn ĐÃ TỒN TẠI trong đề (đường tròn đường
// kính, do circleDiameter dựng tên "<tâm>_c"). chord.ts đã có guard bỏ qua dây có
// "vuông góc" để rule này sở hữu.
//
// Tên đường tròn: tìm "(O) ... đường kính XY" trong đề → tâm O → circle "O_c". Emit
// ref TRỰC TIẾP "O_c" (resolveCircleNames KHÔNG rewrite circle-ref trong constraint
// 'intersection', nên KHÔNG dựa vào rewrite O→O_c — phải đặt tên đã-resolve sẵn).
//
// Priority CAO (70) > perpFoot(65) > intersection(45): "kẻ BI vuông góc với CD tại I"
// (perpFoot) tham chiếu D, nên D phải được dựng TRƯỚC (intentsToDsl chạy priority DESC,
// KHÔNG topo-sort).
//
// GOTCHA \b: regex chứa ký tự Việt dùng cờ 'u' + lookaround, KHÔNG \b.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect, drawLine, DUONG_KW, CIRCLE_KW } from './_shared';

// "(O) ... đường kính XY" → tâm O. (nửa) đường tròn (tâm)? (O hoặc tâm O) ... đường kính.
const DIAMETER_CIRCLE = new RegExp(
  String.raw`(?:${CIRCLE_KW}|nửa\s+${CIRCLE_KW})\s*(?:\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)|tâm\s+([A-Z]))[^.;\n]{0,40}?` +
    DUONG_KW +
    String.raw`\s*kính\s+[A-Z][A-Z](?![A-Z])`,
  'u',
);

// "Qua|Từ <P> kẻ|vẽ|dựng dây (cung)? <D><E> vuông góc với <X><Y>"
//   g1=through point | g2,g3=chord endpoints | g4=segment the chord ⊥ to (2-char)
const PERP_CHORD = new RegExp(
  String.raw`(?:Qua|Từ)\s+([A-Z])(?![A-Z])\s+(?:kẻ|vẽ|dựng|vạch)\s+dây(?:\s+cung)?\s+([A-Z])([A-Z])(?![A-Z])\s+(?:⊥|vuông\s*góc(?:\s+với)?)\s+(?:với\s+)?(?:đường\s*thẳng\s+|cạnh\s+|đoạn\s+)?([A-Z]{2})(?![A-Z])`,
  'gu',
);

/** Tâm đường tròn đường kính trong đề → undefined nếu không có. */
function diameterCircleCenter(problem: string): string | undefined {
  const m = DIAMETER_CIRCLE.exec(problem);
  if (!m) return undefined;
  return m[1] ?? m[2];
}

const PREFILTER = /dây/u;

export const perpChordThroughPointRule: LanguageRule = {
  id: 'perp-chord-through-point',
  priority: 70,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const center = diameterCircleCenter(ctx.problem);
    if (!center) return []; // không có đường tròn đường kính → để chord/escalate lo
    const circle = `${center}_c`;

    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      PERP_CHORD.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = PERP_CHORD.exec(c.text)) !== null) {
        const through = m[1];
        const d = m[2];
        const e = m[3];
        const perpTo = m[4];
        if (d === e) continue; // dây suy biến
        // tên đường ⊥ duy nhất theo điểm qua (prp<through>); intersection ref dùng tên này.
        const line = `prp${through}`;
        out.push({
          ruleId: 'perp-chord-through-point',
          clauseIds: [c.id],
          intents: [
            drawLine(line, 'perpThrough', { through, to: perpTo }),
            addPoint(d, { kind: 'intersection', of: [line, circle], branch: 0 }),
            addPoint(e, { kind: 'intersection', of: [line, circle], branch: 1 }),
            connect(d, e, 'segment'),
          ],
        });
      }
    }
    return out;
  },
};
