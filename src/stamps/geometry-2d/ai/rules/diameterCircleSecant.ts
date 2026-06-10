// src/stamps/geometry-2d/ai/rules/diameterCircleSecant.ts
//
// Đường tròn đường kính KHÔNG nêu tâm (chỉ 2 đầu mút) + các đường cắt nó:
//   "vẽ đường tròn đường kính MC. BM cắt đường tròn tại D. AD cắt đường tròn tại S"
//     → circle kMC (diameter M,C) ; D = secondIntersection(BM, kMC, other=M) ;
//       S = secondIntersection(AD, kMC, other=D).
//
// KHÁC circleDiameter ("(O) đường kính AB" — có tên tâm O): ở đây "đường tròn"
// đứng NGAY trước "đường kính" (không "(X)" chen giữa) → không tên tâm → tự đặt
// "k<XY>" (cùng quy ước diameterCircleCutsSides) và sở hữu LUÔN các "… cắt đường
// tròn tại …" (đường tròn KHÔNG tên, lineCircleIntersection bỏ qua vì cần "(X)").
//
// `other` (điểm chung line∩circle đã biết) = đầu mút line nằm trên đường tròn:
// theo dõi tập điểm ĐÃ biết trên circle (2 đầu mút đường kính + các giao đã dựng),
// chọn đầu mút line ∈ tập đó. Không xác định được → bỏ (escalate fail-safe).
//
// GOTCHA \b: ký tự Việt → cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawCircle } from './_shared';

// "đường tròn đường kính XY" KHÔNG tên tâm (không "(.)" giữa "tròn" và "đường kính").
const DIAMETER = /(?:nửa\s+)?đường\s*tròn\s+đường\s*kính\s+([A-Z])([A-Z])(?![A-Z])/u;
// "PQ cắt đường tròn (ở|tại) (điểm (thứ hai)?)? Z" — đường tròn KHÔNG "(X)".
const CUTS = /([A-Z]{2})(?![A-Z])\s+cắt\s+đường\s*tròn\s+(?:ở|tại)\s+(?:điểm\s+(?:thứ\s+hai\s+)?)?([A-Z])(?![A-Z])/gu;

export const diameterCircleSecantRule: LanguageRule = {
  id: 'diameterCircleSecant',
  priority: 46,
  languages: ['vi'],
  patterns: [/đường\s*tròn\s+đường\s*kính\s+[A-Z]{2}/u],
  match(ctx) {
    const dm = DIAMETER.exec(ctx.problem);
    if (!dm) return [];
    const [d0, d1] = [dm[1], dm[2]];
    const dia = d0 + d1;
    const circle = `k${dia}`;
    const onCircle = new Set<string>([d0, d1]); // điểm đã biết trên đường tròn
    const out: RuleMatch[] = [];

    // 1) Dựng đường tròn đường kính (clause chứa "đường kính XY").
    for (const c of ctx.clauses) {
      if (!DIAMETER.test(c.text)) continue;
      out.push({
        ruleId: 'diameterCircleSecant',
        clauseIds: [c.id],
        intents: [drawCircle(circle, 'diameter', { endpoints: [d0, d1] })],
      });
      break;
    }

    // 2) Các đường cắt đường tròn (theo thứ tự xuất hiện) — other = đầu mút ∈ onCircle.
    for (const c of ctx.clauses) {
      CUTS.lastIndex = 0;
      for (const m of c.text.matchAll(CUTS)) {
        const line = m[1];
        const z = m[2];
        if (line.includes(z) || onCircle.has(z)) continue;
        const other = onCircle.has(line[0]) ? line[0] : onCircle.has(line[1]) ? line[1] : undefined;
        if (!other) continue; // không xác định điểm chung → escalate
        onCircle.add(z);
        const intent: IntentT = addPoint(z, { kind: 'secondIntersection', line, circle, other });
        out.push({ ruleId: 'diameterCircleSecant', clauseIds: [c.id], intents: [intent] });
      }
    }
    return out;
  },
};
