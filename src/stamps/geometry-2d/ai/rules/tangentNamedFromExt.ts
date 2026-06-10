// src/stamps/geometry-2d/ai/rules/tangentNamedFromExt.ts
//
// Tiếp tuyến TỪ điểm ngoài, tiếp điểm CÓ TÊN — dạng "Kẻ/Vẽ" (KHÁC
// tangentPointsFromExt dùng "Từ A …"). Điểm ngoài = chữ ĐẦU của cặp đỉnh:
//   "Kẻ (các/hai)? tiếp tuyến AB, AC" → A ngoài, B,C tiếp điểm (which 0/1).
//   "Kẻ tiếp tuyến CD"                → C ngoài, D tiếp điểm (which 0).
//   2 tiếp tuyến đơn cùng điểm ngoài (vd "tiếp tuyến AB" … "tiếp tuyến AE")
//     → B which 0, E which 1 (đếm theo thứ tự xuất hiện / điểm ngoài).
//
// Mỗi tiếp điểm → addPoint(tangentPoint, {from, circle, which}) + đoạn from→điểm.
// Điểm ngoài (chữ đầu) phải ĐÃ được dựng bởi rule khác (circleExternalPoint /
// externalPoint / onSegment); rule này KHÔNG tự dựng nó. Circle = "(X)" duy nhất
// trong đề (emit thô; resolveCircleNameCollisions chuẩn hoá base→_c nếu cần).
//
// Phân biệt:
//   - "tiếp tuyến TẠI A" (tangentAt) → "tại" CHỮ THƯỜNG, cặp [A-Z]{2} không khớp.
//   - "tiếp tuyến từ A đến (O)" (tangentFromExt, drawLine) → không cặp HOA sau
//     "tiếp tuyến" (là "từ").
//   - "tiếp tuyến Ax, By" (tia tiếp tuyến) → x,y CHỮ THƯỜNG → không khớp.
//
// GOTCHA \b: ký tự Việt → cờ 'u', lookaround \p{L} thay \b.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect } from './_shared';

const PREFILTER = /(?:[Kk]ẻ|[Vv]ẽ)\s+(?:các\s+|hai\s+)?tiếp\s*tuyến\s+[A-Z]{2}/u;

// 2 tiếp tuyến: "Kẻ (các/hai)? tiếp tuyến XY, XZ". g1g2 = cặp 1, g3g4 = cặp 2.
const TWO = new RegExp(
  '(?:[Kk]ẻ|[Vv]ẽ)\\s+(?:các\\s+|hai\\s+)?tiếp\\s*tuyến\\s+([A-Z])([A-Z])\\s*,\\s*([A-Z])([A-Z])(?!\\p{L})',
  'gu',
);
// 1 tiếp tuyến: "Kẻ tiếp tuyến XY". g1=ngoài, g2=tiếp điểm.
const ONE = new RegExp('(?:[Kk]ẻ|[Vv]ẽ)\\s+tiếp\\s*tuyến\\s+([A-Z])([A-Z])(?![A-Z])', 'gu');

const PAREN_CIRCLE = /\(\s*([A-Z])\s*\)/u;

export const tangentNamedFromExtRule: LanguageRule = {
  id: 'tangentNamedFromExt',
  priority: 50,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const par = PAREN_CIRCLE.exec(ctx.problem);
    const circle = par ? par[1] : 'O';
    const out: RuleMatch[] = [];
    const twoClauses = new Set<number>();
    // đếm số tiếp điểm đã gán theo từng điểm ngoài (gán which 0 rồi 1).
    const whichOf = new Map<string, 0 | 1>();

    // --- 2 tiếp tuyến (ưu tiên: tránh ONE bắt lại cặp đầu) ---
    for (const c of ctx.clauses) {
      TWO.lastIndex = 0;
      for (const m of c.text.matchAll(TWO)) {
        const ext = m[1];
        if (m[3] !== ext) continue; // 2 cặp phải cùng điểm ngoài
        const p = m[2];
        const q = m[4];
        if (p === q || p === ext || q === ext) continue;
        twoClauses.add(c.id);
        whichOf.set(ext, 1); // đã dùng which 0+1
        out.push({
          ruleId: 'tangentNamedFromExt',
          clauseIds: [c.id],
          intents: [
            addPoint(p, { kind: 'tangentPoint', from: ext, circle, which: 0 }),
            addPoint(q, { kind: 'tangentPoint', from: ext, circle, which: 1 }),
            connect(ext, p, 'segment'),
            connect(ext, q, 'segment'),
          ],
        });
      }
    }

    // --- 1 tiếp tuyến (bỏ clause đã khớp 2-tiếp-tuyến) ---
    for (const c of ctx.clauses) {
      if (twoClauses.has(c.id)) continue;
      ONE.lastIndex = 0;
      for (const m of c.text.matchAll(ONE)) {
        const ext = m[1];
        const p = m[2];
        if (p === ext) continue;
        const prev = whichOf.get(ext);
        const which: 0 | 1 = prev === undefined ? 0 : prev === 0 ? 1 : 1;
        if (prev === 1) continue; // điểm ngoài đã có 2 tiếp tuyến → bỏ (chỉ 2)
        whichOf.set(ext, which);
        out.push({
          ruleId: 'tangentNamedFromExt',
          clauseIds: [c.id],
          intents: [
            addPoint(p, { kind: 'tangentPoint', from: ext, circle, which }),
            connect(ext, p, 'segment'),
          ],
        });
      }
    }
    return out;
  },
};
