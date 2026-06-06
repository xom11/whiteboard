// src/stamps/geometry-2d/ai/rules/tangentFromExt.ts
//
// Tiếp tuyến TỪ điểm NGOÀI đường tròn (2 nhánh):
//   "Kẻ hai tiếp tuyến từ A đến (O)"          → drawLine(t, tangentFromExt, {from:'A', circle:'O', which:'both'})
//   "Vẽ tiếp tuyến từ điểm A tới đường tròn O" → drawLine(t, tangentFromExt, {from:'A', circle:'O', which:'both'})
//   "Từ A vẽ tiếp tuyến với (O)"               → drawLine(t, tangentFromExt, {from:'A', circle:'O', which:'both'})
//
// Phân biệt với tangentAt ("tiếp tuyến TẠI A của (O)") — chỗ đó dùng "tại",
// còn ở đây là "từ <điểm ngoài>". Rule này CHỈ match "từ"/"Từ ... vẽ tiếp tuyến".
//
// GOTCHA: \b của JS dựa ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề","ạ"…). Mọi regex chứa ký tự Việt dùng cờ 'u' + lookaround \p{L}.
// from / circle là 1 ký tự HOA; name của line default 't' (LabelZ cho phép).
import type { LanguageRule, RuleMatch } from './_types';
import { drawLine } from './_shared';

// Prefilter toàn đề: phải có "tiếp tuyến".
const HAS_TANGENT = /tiếp\s*tuyến/u;

// "(kẻ|vẽ) (hai)? tiếp tuyến từ (điểm)? A (đến|tới|với) (đường tròn)? (O)"
//   - động từ kẻ/vẽ optional (câu có thể bắt đầu "Từ A kẻ ...").
//   - "hai" optional (1 hay 2 nhánh vẫn coi là tiếp tuyến từ điểm ngoài).
//   - from = 1 ký tự HOA sau "từ (điểm)?".
//   - giới từ đến/tới/với nối qua đường tròn.
//   - circle = ký tự HOA, có thể bọc "(O)" hoặc đứng sau "đường tròn".
const FROM_FORM =
  /(?:kẻ|vẽ)?\s*(?:hai\s+)?tiếp\s*tuyến\s+từ\s+(?:điểm\s+)?([A-Z])(?:['′]?)\s+(?:đến|tới|với)\s+(?:đường\s*tròn\s*)?\(?\s*([A-Z])\s*\)?/u;

// Biến thể đảo: "Từ (điểm)? A (kẻ|vẽ) (hai)? tiếp tuyến (đến|tới|với) (đường tròn)? (O)".
const TU_FORM =
  /(?<!\p{L})Từ\s+(?:điểm\s+)?([A-Z])(?:['′]?)\b[^.]{0,40}?(?:kẻ|vẽ)\s+(?:hai\s+)?tiếp\s*tuyến\s+(?:đến|tới|với)\s+(?:đường\s*tròn\s*)?\(?\s*([A-Z])\s*\)?/u;

export const tangentFromExtRule: LanguageRule = {
  id: 'tangentFromExt',
  priority: 65,
  languages: ['vi'],
  patterns: [HAS_TANGENT],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const m = FROM_FORM.exec(c.text) ?? TU_FORM.exec(c.text);
      if (!m) continue;
      const from = m[1];
      const circle = m[2];
      // Không xác định được from hoặc circle → bỏ qua (escalate AI).
      if (!from || !circle) continue;
      out.push({
        ruleId: 'tangentFromExt',
        clauseIds: [c.id],
        intents: [
          drawLine('t', 'tangentFromExt', { from, circle, which: 'both' }),
        ],
      });
    }
    return out;
  },
};
