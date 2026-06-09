// src/stamps/geometry-2d/ai/rules/intersectRay.ts
//
// Hai đường/tia cắt một TIA ĐẶT TÊN (token tia Bx/Ax/By), zip 1-1 ra 2 giao điểm:
//   "Các tia AC và AD cắt Bx lần lượt ở E, F"        (Bài 9)
//   "Tia AC và AD cắt Bx lần lượt tại E và F"
//
// → E = AC ∩ Bx, F = AD ∩ Bx. Mỗi giao = add-point intersection of:[Lk, Ray].
//   builder resolveSegmentRef: "AC" → segment 2 đỉnh; "Bx" → shape draw-line đã
//   có (tangentRay dựng trước, priority cao hơn). Token tia (Bx) KHÔNG phải cặp
//   đỉnh nên generic intersection rule bỏ qua → cần rule riêng này.
//
// GOTCHA \b: regex chứa ký tự Việt dùng cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint } from './_shared';

// L = cặp đỉnh "AC" (2 chữ HOA). Ray = token tia "Bx" (1 HOA + x/y/z/t).
const LINE = '([A-Z][A-Z])(?![A-Z])';
const RAY = '([A-Z][xyzt])(?![A-Za-z])';
const NAME = '([A-Z])(?![A-Za-z])';

// "(các)? tia? L1 và L2 (lần lượt)? cắt <Ray> (lần lượt)? (ở|tại) P1 (,|và) P2"
const PATTERN = new RegExp(
  String.raw`(?:[Cc]ác\s+)?(?:tia\s+)?${LINE}\s+và\s+${LINE}\s+(?:lần\s*lượt\s+)?cắt\s+${RAY}\s+(?:lần\s*lượt\s+)?(?:ở|tại)\s+${NAME}\s*(?:,|và)\s*${NAME}`,
  'u',
);

const PREFILTER = /cắt\s+[A-Z][xyzt](?![A-Za-z])/u;

export const intersectRayRule: LanguageRule = {
  id: 'intersect-ray',
  // Thấp nhất trong cụm tia: tia (63) + điểm-trên-tia (55) phải dựng trước; giao
  // điểm tham chiếu cả tia LẪN các cạnh AC/AD. Trên connect (40).
  priority: 48,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = PATTERN.exec(c.text);
      if (!m) continue;
      const l1 = m[1];
      const l2 = m[2];
      const ray = m[3];
      const p1 = m[4];
      const p2 = m[5];
      // Guard fail-safe: 2 tên giao phân biệt, không trùng nhau, không nằm trong tia.
      if (p1 === p2) continue;
      const intents: IntentT[] = [
        addPoint(p1, { kind: 'intersection', of: [l1, ray] }),
        addPoint(p2, { kind: 'intersection', of: [l2, ray] }),
      ];
      out.push({ ruleId: 'intersect-ray', clauseIds: [c.id], intents });
    }
    return out;
  },
};
