// src/stamps/geometry-2d/ai/rules/lineThroughCutsTwoLines.ts
//
// Đường thẳng BẤT KÌ / TÙY Ý qua 1 điểm P, cắt HAI đường L1, L2 tại E, F:
//   "Một đường thẳng bất kì qua H cắt AC, AB lần lượt tại E, F"  (hinh9 #76)
//     → E = điểm TỰ DO trên L1 (=AC)
//       F = giao( đường(H,E) , L2=AB )
//
// KHÔNG có primitive "đường thẳng bất kì" (hướng tuỳ ý). Ta mô hình hoá TRUNG
// THỰC bằng cách: chọn 1 điểm free E trên L1, rồi lấy giao của đường (P,E) với
// L2 ⇒ ba điểm P, E, F THẲNG HÀNG ⇒ đúng là một đường thẳng đi qua P. E phải
// được emit TRƯỚC F vì ref 'HE' (= P+E nối chuỗi) của F cần E đã tồn tại.
//
// Khác perpThroughCutsLines / parallelPerp: hai rule kia sở hữu hướng ⊥ / ∥
// ("vuông góc"/"song song"). Rule này CHỈ neo vào lời "bất kì/tùy ý" → KHÔNG
// đụng. Prefilter cũng neo "đường thẳng bất kì|tùy ý qua <P>" để loại bài ⊥/∥.
//
// GOTCHA \b: dùng cờ 'u' + (?!\p{L}) quanh ký tự Việt, KHÔNG dùng \b ASCII.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// "(Một)? đường thẳng (bất kì|bất kỳ|tùy ý) qua P cắt L1 , L2 (lần lượt)? tại E , F"
//   group1 = P (1 HOA);  group2 = L1 (cặp HOA);  group3 = L2 (cặp HOA);
//   group4 = E (1 HOA);  group5 = F (1 HOA).
const RE = new RegExp(
  '(?:[Mm]ột\\s+)?đường\\s*thẳng\\s+(?:bất\\s*k[iìyỳ]|tùy\\s*ý)\\s+(?:nào\\s+)?(?:đi\\s+)?qua\\s+(?:điểm\\s+)?([A-Z])(?!\\p{L})' +
    '[^.]{0,20}?cắt\\s+(?:các\\s+)?(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn(?:\\s+thẳng)?\\s+)?' +
    '([A-Z]\\s*[A-Z])(?![A-Z])\\s*(?:,|và)\\s*([A-Z]\\s*[A-Z])(?![A-Z])' +
    '[^.]{0,20}?(?:lần\\s*lượt\\s+|theo\\s+thứ\\s+tự\\s+)?(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])\\s*(?:,|và)\\s*([A-Z])(?![A-Z])',
  'gu',
);

// Prefilter: chỉ kích hoạt khi có "đường thẳng bất kì/tùy ý qua <HOA>" — né hẳn
// các bài hướng ⊥/∥ (perpThroughCutsLines / parallelPerp sở hữu).
const PREFILTER = [/đường\s*thẳng\s+(?:bất\s*k[iìyỳ]|tùy\s*ý)\s+(?:nào\s+)?(?:đi\s+)?qua\s+[A-Z]/u];

export const lineThroughCutsTwoLinesRule: LanguageRule = {
  id: 'lineThroughCutsTwoLines',
  priority: 44,
  languages: ['vi'],
  patterns: PREFILTER,
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const through = m[1];
        const line1 = m[2].replace(/\s+/g, '');
        const line2 = m[3].replace(/\s+/g, '');
        const e = m[4];
        const f = m[5];
        // Validate: P 1 HOA, L1/L2 cặp HOA, E/F 1 HOA, tất cả phân biệt.
        if (!/^[A-Z]{2}$/u.test(line1) || !/^[A-Z]{2}$/u.test(line2)) continue;
        if (line1 === line2) continue;
        if (e === f) continue;
        // E/F không được là chính P; E phải nằm trên L1 (không trùng đầu mút L1).
        const names = new Set([through, e, f]);
        if (names.size !== 3) continue;
        if (line1.includes(e)) continue; // E trùng đầu mút L1 → không phải điểm mới
        const ref = through + e; // 'H' + 'E' → 'HE' (resolveSegmentRef tách lại)
        out.push({
          ruleId: 'lineThroughCutsTwoLines',
          clauseIds: [c.id],
          intents: [
            // E TRƯỚC F: ref 'HE' của F cần E đã có.
            addPoint(e, { kind: 'onSegment', of: line1 }),
            addPoint(f, { kind: 'intersection', of: [ref, line2] }),
          ],
        });
      }
    }
    return out;
  },
};
