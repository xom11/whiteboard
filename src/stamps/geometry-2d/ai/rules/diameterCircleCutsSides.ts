// src/stamps/geometry-2d/ai/rules/diameterCircleCutsSides.ts
//
// "Đường tròn đường kính BC cắt AB, AC tại M và N" — đường tròn đường kính một
// cạnh cắt hai cạnh kề tại các điểm phái sinh (phân phối 1-1):
//
//   Cho tam giác ABC nhọn, đường tròn đường kính BC cắt AB, AC tại M và N.
//
// Bản chất: đường tròn đường kính PQ đi qua P, Q. Cạnh AB (chứa B ∈ đường kính)
// cắt đường tròn tại B và một điểm thứ hai M (= chân đường cao hạ từ C, ∠BMC=90°
// Thales). Vì luôn biết điểm chung (đỉnh dùng chung giữa cạnh và đường kính), ta
// dựng M bằng `secondIntersection` (JSXGraph otherintersection loại điểm chung) —
// robust hơn `intersection`+branch (không phụ thuộc thứ tự index JSXGraph).
//
// Phân phối: "cắt L1, L2 tại X, Y" → zip L1↔X, L2↔Y (kèm biến thể "lần lượt",
// nối "và", tiền tố "cạnh"/"các cạnh"). Đường tròn KHÔNG tự dựng tam giác (triangle
// rule lo) — chỉ emit đường tròn + các giao điểm.
//
// Fail-safe (escalate, thà thiếu hơn dựng sai):
//   - số cạnh ≠ số điểm → bỏ qua.
//   - cạnh không chia sẻ ĐÚNG 1 đỉnh với đường kính (0 → không biết điểm chung;
//     2 → cạnh trùng đường kính, suy biến) → bỏ qua.
//   - tên điểm trùng đỉnh cạnh/đường kính (định nghĩa vòng) → bỏ qua.
//
// GOTCHA \b: \b của JS theo ASCII. Vùng tên điểm ("M và N", "M, N") các chữ HOA
// luôn cách bởi dấu cách/phẩy nên \b[A-Z]\b an toàn; vẫn dùng cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawCircle, CIRCLE_KW, DUONG_KW } from './_shared';

// Anchor "đường tròn đường kính PQ cắt <cạnh…> (lần lượt)? tại <điểm…>".
// lineRegion lazy tới "tại" đầu tiên; pointRegion tới hết clause (không . ; \n).
// Global: một clause có thể chứa NHIỀU "đường tròn đường kính … cắt … tại …"
// (vd Bài 13: hai nửa đường tròn). pointRegion bắt CHẶT (chỉ HOA + ,/và) để
// không nuốt sang construct kế trong cùng clause.
const PATTERN = new RegExp(
  CIRCLE_KW +
    '\\s+' +
    // tên tâm xen giữa: "đường tròn (I) đường kính AH" / "đường tròn tâm I đường kính AH".
    '(?:(?:\\(\\s*[A-Z]\\s*\\)|tâm\\s+[A-Z])\\s+)?' +
    DUONG_KW +
    '\\s*kính\\s+([A-Z])([A-Z])(?![A-Z])\\s+cắt\\s+([^.;\\n]*?)\\s+(?:lần\\s*lượt\\s+)?tại\\s+([A-Z](?!\\p{L})(?:\\s*(?:,|và)\\s*[A-Z](?!\\p{L}))*)',
  'gu',
);

const PREFILTER = new RegExp(DUONG_KW + '\\s*kính', 'u');

/** Đỉnh chung DUY NHẤT giữa cạnh "AB" và đường kính "BC" (vd "B"). */
function sharedVertex(line: string, dia: string): string | undefined {
  const shared = [line[0], line[1]].filter((ch) => dia.includes(ch));
  return shared.length === 1 ? shared[0] : undefined;
}

export const diameterCircleCutsSidesRule: LanguageRule = {
  // THẤP HƠN triangle (100): cần A,B,C dựng trước khi secondIntersection tham
  // chiếu cạnh/đỉnh. Đặt 66 (cùng họ diameterCirclePairwise) — đủ thấp so với 100.
  id: 'diameter-circle-cuts-sides',
  priority: 66,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      PATTERN.lastIndex = 0;
      for (const m of c.text.matchAll(PATTERN)) {
      const d0 = m[1];
      const d1 = m[2];
      const dia = d0 + d1; // "BC"
      const lines = m[3].match(/[A-Z][A-Z](?![A-Z])/gu) ?? [];
      const points = m[4].match(/\b[A-Z]\b/gu) ?? [];

      // Phân phối 1-1: cần ≥1 cạnh và số cạnh == số điểm.
      if (lines.length === 0 || lines.length !== points.length) continue;

      const circle = `k${dia}`;
      const intents: IntentT[] = [
        drawCircle(circle, 'diameter', { endpoints: [d0, d1] }),
      ];

      let ok = true;
      const seen = new Set<string>();
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const pt = points[i];
        const other = sharedVertex(line, dia);
        // Cần đúng 1 đỉnh chung (điểm đã biết trên cả cạnh lẫn đường tròn).
        if (!other) { ok = false; break; }
        // Tên điểm phải MỚI, không trùng đỉnh cạnh/đường kính.
        if (line.includes(pt) || dia.includes(pt) || seen.has(pt)) { ok = false; break; }
        seen.add(pt);
        intents.push(addPoint(pt, { kind: 'secondIntersection', line, circle, other }));
      }
      if (!ok) continue;

      out.push({ ruleId: 'diameter-circle-cuts-sides', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
