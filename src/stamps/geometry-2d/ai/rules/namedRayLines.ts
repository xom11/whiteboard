// src/stamps/geometry-2d/ai/rules/namedRayLines.ts
//
// Tia/đường ĐẶT TÊN theo gốc ("Ax", "By") kẻ ⊥ / ∥ một đoạn, rồi được dùng ở mệnh đề
// SAU để cắt nhau / cắt đoạn khác (lớp 8, tam giác đồng dạng):
//   "Từ A kẻ tia Ax vuông góc với AC, từ B kẻ tia By vuông góc với BC.
//    Tia Ax và By cắt nhau tại K."
//   "Từ B kẻ tia Bx ⊥ AB, tia Bx cắt AH tại K."
//
// Khai báo → draw-line tên chính là "Ax" (perpThrough/parallelThrough qua gốc A).
// Giao: "(tia)? Ax và By cắt nhau tại K" → K = Ax ∩ By; "(tia)? Bx cắt (đường
// thẳng|cạnh)? AH tại K" → K = Bx ∩ AH. Tên tia chưa được khai báo ⊥/∥ → bỏ qua.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /[A-Z][xyzt](?![\p{L}\d])/u;
const TIA = String.raw`([A-Z][xyzt])(?![\p{L}\d])`;

// "(kẻ|vẽ|dựng) (tia|đường thẳng)? Ax (lần lượt)? (vuông góc|⊥|song song|//) (với)? (cạnh|đoạn)? XY"
const KHAI_BAO = new RegExp(
  String.raw`(?:kẻ|vẽ|dựng|Kẻ|Vẽ|Dựng)\s+(?:tia\s+|đường\s*thẳng\s+)?${TIA}\s*(vuông\s*góc|⊥|song\s*song|\/\/|∥)\s*(?:với\s+)?(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+|đường\s*thẳng\s+)?([A-Z]{2})(?![A-Z])`,
  'gu',
);
const CAT_NHAU = new RegExp(
  String.raw`(?:[Tt]ia\s+|[Hh]ai\s+tia\s+)?${TIA}\s+và\s+(?:tia\s+)?${TIA}\s+cắt\s+nhau\s+(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![A-Z'′])`,
  'gu',
);
const CAT_DOAN = new RegExp(
  String.raw`(?:[Tt]ia\s+)?${TIA}\s+cắt\s+(?:tia\s+|đường\s*thẳng\s+|cạnh\s+|đoạn(?:\s+thẳng)?\s+)?([A-Z]{2})(?![A-Z])\s+(?:tại|ở)\s+(?:điểm\s+)?([A-Z])(?![A-Z'′])`,
  'gu',
);

export const namedRayLinesRule: LanguageRule = {
  id: 'namedRayLines',
  priority: 57,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    // Khai báo toàn đề: tên tia → [clauseId, intent]
    const khai = new Map<string, { cid: number; intent: IntentT }>();
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(KHAI_BAO)) {
        const [, ten, kw, ref] = m;
        const goc = ten[0];
        const ss = /song|\/\/|∥/u.test(kw);
        if (ss && ref.includes(goc)) continue;
        if (khai.has(ten)) continue;
        khai.set(ten, {
          cid: c.id,
          intent: drawLine(ten, ss ? 'parallelThrough' : 'perpThrough', { through: goc, to: ref }),
        });
      }
    }
    if (khai.size === 0) return [];
    const out: RuleMatch[] = [];
    for (const [, k] of khai) out.push({ ruleId: 'namedRayLines', clauseIds: [k.cid], intents: [k.intent] });
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(CAT_NHAU)) {
        const [, t1, t2, ten] = m;
        if (!khai.has(t1) || !khai.has(t2) || t1 === t2 || ten === t1[0] || ten === t2[0]) continue;
        out.push({ ruleId: 'namedRayLines', clauseIds: [c.id], intents: [addPoint(ten, { kind: 'intersection', of: [t1, t2] })] });
      }
      for (const m of c.text.matchAll(CAT_DOAN)) {
        const [, t, seg, ten] = m;
        if (!khai.has(t) || seg.includes(ten) || ten === t[0]) continue;
        out.push({ ruleId: 'namedRayLines', clauseIds: [c.id], intents: [addPoint(ten, { kind: 'intersection', of: [t, seg] })] });
      }
    }
    return out;
  },
};
