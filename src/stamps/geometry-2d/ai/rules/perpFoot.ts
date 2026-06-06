// src/stamps/geometry-2d/ai/rules/perpFoot.ts
//
// Hình chiếu vuông góc / chân đường vuông góc (đường cao):
//   "Gọi H là hình chiếu (vuông góc) của A trên/lên/xuống (đường thẳng|cạnh)? BC"
//   "Gọi H là chân đường vuông góc (hạ|kẻ) từ A (đến|xuống) BC"
// → addPoint('H', { kind:'perpFoot', from:'A', onLine:'BC' })
//
// onLine giữ nguyên token sau giới từ (pair 'BC' hoặc tên đường 1 ký tự 'd').
// Tên điểm dẫn nhập qua extractPointName. Không trích được tên/nguồn → bỏ qua
// clause (để pipeline escalate AI thay vì đoán sai).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, extractPointName } from './_shared';

// LƯU Ý: \b của JS dựa ASCII word-char nên KHÔNG khớp quanh ký tự Việt. Mọi
// regex chứa ký tự Việt dùng cờ 'u' + tránh \b.

// Prefilter toàn đề: có nói tới "hình chiếu" hoặc "chân đường (cao|vuông góc)".
const PREFILTER = /hình\s*chiếu|chân\s+(?:của\s+)?đường\s+(?:cao|vuông\s*góc)/u;

// onLine token: tên đường 1 ký tự HOA (vd 'd' viết hoa hiếm, nhưng đường thường
// đặt 1 ký tự) HOẶC cặp đỉnh 2 ký tự HOA (vd 'BC'). Chấp nhận tiền tố
// "đường thẳng" / "cạnh" / "đoạn" trước token.
const ONLINE = '(?:đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+)?([A-Z]{1,2})(?![A-Z])';

// "hình chiếu (vuông góc) của A (trên|lên|xuống|đến|tới) [cạnh|đường thẳng] BC"
const PROJECTION = new RegExp(
  `hình\\s*chiếu\\s+(?:vuông\\s*góc\\s+)?(?:của\\s+)?([A-Z])\\s+(?:trên|lên|xuống|đến|tới)\\s+${ONLINE}`,
  'u',
);

// "chân đường (vuông góc|cao) (hạ|kẻ|vẽ|dựng)? (từ)? A (đến|xuống|tới|trên|lên) BC"
const PERP_FOOT = new RegExp(
  `chân\\s+(?:của\\s+)?đường\\s+(?:vuông\\s*góc|cao)\\s*(?:hạ\\s+|kẻ\\s+|vẽ\\s+|dựng\\s+)?(?:từ\\s+)?([A-Z])\\s+(?:đến|xuống|tới|trên|lên)\\s+${ONLINE}`,
  'u',
);

/**
 * Mỗi clause khớp một trong hai phrasing → 1 add-point perpFoot.
 * from = đỉnh nguồn (1 ký tự), onLine = token đường/cạnh giữ nguyên ('BC' | 'd').
 */
export const perpFootRule: LanguageRule = {
  id: 'perpFoot',
  priority: 65,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = PROJECTION.exec(c.text) ?? PERP_FOOT.exec(c.text);
      if (!m) continue;
      const name = extractPointName(c.text);
      if (!name) continue; // không trích được tên điểm → escalate AI
      const from = m[1];
      const onLine = m[2];
      out.push({
        ruleId: 'perpFoot',
        clauseIds: [c.id],
        intents: [addPoint(name, { kind: 'perpFoot', from, onLine })],
      });
    }
    return out;
  },
};
