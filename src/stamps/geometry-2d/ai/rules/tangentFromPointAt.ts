// src/stamps/geometry-2d/ai/rules/tangentFromPointAt.ts
//
// Tiếp tuyến TỪ điểm ngoài, tiếp xúc đường tròn TẠI một tiếp điểm ĐẶT TÊN:
//   "từ P kẻ tiếp tuyến tiếp xúc với (O) tại M"   (Bài 7)
//   "Từ P kẻ tiếp tuyến tiếp xúc đường tròn (O) tại M"
//
// → 1 tiếp tuyến từ P (which:'first') + tiếp điểm M (tangentPoint which 0).
//
// TÁCH RIÊNG khỏi tangentFromExt (priority 65) vì điểm ngoài `from` ở đây có thể
// là điểm PHÁI SINH dựng muộn (vd P = điểm-trên-tiếp-tuyến, priority 55). Đặt
// priority THẤP HƠN point-on-tangent-ray (55) để P được dựng TRƯỚC khi tiếp
// tuyến/tiếp điểm tham chiếu (intentsToDsl xử lý theo priority DESC, không
// topo-sort) — nếu không sẽ transpile-fail (UNKNOWN_REF P).
//
// Circle ref emit THÔ ("O") — resolveCircleNames map "O"→"O_c" (tangentPoint +
// draw-line.circle đều được rewrite) khi đường tròn là circleDiameter "O_c".
//
// GOTCHA \b: regex chứa ký tự Việt dùng cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /tiếp\s*tuyến\s+tiếp\s*xúc/u;

// "(với|tới|đến) (đường tròn)? (X)" hoặc "đường tròn (X)" → circle (1 chữ tâm).
const CIRCLE_TARGET = String.raw`(?:đường\s*tròn\s*)?\(\s*([A-Z])(?:['′]?)\s*\)`;

// "[Tt]ừ P ... (kẻ|vẽ) (một)? tiếp tuyến tiếp xúc (với|tới|đến)? <circle> tại M".
const PATTERN = new RegExp(
  String.raw`(?<!\p{L})[Tt]ừ\s+(?:điểm\s+)?([A-Z])(?:['′]?)(?!\p{L})[^.]{0,30}?(?:[Kk]ẻ|[Vv]ẽ)\s+(?:một\s+)?tiếp\s*tuyến\s+tiếp\s*xúc\s+(?:với\s+|tới\s+|đến\s+)?` +
    CIRCLE_TARGET +
    String.raw`\s+tại\s+([A-Z])(?![A-Za-z])`,
  'u',
);

export const tangentFromPointAtRule: LanguageRule = {
  id: 'tangent-from-point-at',
  // Dưới point-on-tangent-ray (55): điểm ngoài (P) có thể dựng ở priority 55.
  priority: 50,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = PATTERN.exec(c.text);
      if (!m) continue;
      const from = m[1];
      const circle = m[2];
      const tp = m[3];
      if (!circle || tp === from) continue;
      const intents: IntentT[] = [
        drawLine('t', 'tangentFromExt', { from, circle, which: 'first' }),
        addPoint(tp, { kind: 'tangentPoint', from, circle, which: 0 }),
      ];
      out.push({ ruleId: 'tangent-from-point-at', clauseIds: [c.id], intents });
    }
    return out;
  },
};
