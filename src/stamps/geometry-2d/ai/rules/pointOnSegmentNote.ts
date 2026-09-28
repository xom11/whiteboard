// src/stamps/geometry-2d/ai/rules/pointOnSegmentNote.ts
//
// Chú thích vị trí dạng ký hiệu "(D ∈ AB)" cho một điểm KHÔNG được định nghĩa ở
// đâu khác — điểm tự do trên đoạn (lớp 8, Thalès):
//   "Từ điểm D (D ∈ AB) kẻ đường thẳng song song với BC cắt AC tại E"
//
// "∈" không được onSegmentPoint đọc (chỉ "thuộc"), nên D thiếu ⇒ cả hình hỏng. Rule
// này priority THẤP NHẤT (38) — "Kẻ DE ⊥ AB (E ∈ AB)", "Qua E kẻ EM // CD (M ∈ AD)"
// đã có rule định nghĩa chính xác chạy trước; add-point first-wins nên chú thích chỉ
// áp khi không ai định nghĩa điểm đó.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

const PREFILTER = /∈/u;
// Chú thích phải đứng NGAY SAU tên điểm được giới thiệu: "điểm D (D ∈ AB)". Dạng
// "Kẻ DE ⊥ AB (E ∈ AB)" (chú thích cho đầu mút của đoạn vừa kẻ) KHÔNG khớp — nếu rule
// định nghĩa E trượt, để nó thiếu (escalate) chứ không đặt E tự do sai điều kiện ⊥.
const RE = /(?<![A-Z])([A-Z])\s*\(\s*\1\s*∈\s*(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+)?([A-Z]{2})(?![A-Z])\s*\)/gu;

export const pointOnSegmentNoteRule: LanguageRule = {
  id: 'pointOnSegmentNote',
  priority: 38,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      for (const m of c.text.matchAll(RE)) {
        const [, p, seg] = m;
        if (seg.includes(p) || seg[0] === seg[1]) continue;
        // Không claim mệnh đề: phần dựng hình còn lại của mệnh đề phải do rule khác phủ.
        out.push({ ruleId: 'pointOnSegmentNote', clauseIds: [], intents: [addPoint(p, { kind: 'onSegment', of: seg })] });
      }
    }
    return out;
  },
};
