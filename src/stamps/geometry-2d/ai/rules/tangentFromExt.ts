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

// Target đường tròn: PHẢI có dấu hiệu đường tròn — "(X)" hoặc "đường tròn X".
// KHÔNG nhận chữ HOA TRẦN (vd "tiếp tuyến từ A đến BC": "BC" là đoạn thẳng, không
// phải đường tròn → không claim, escalate). Hai alternative → 2 capture nhóm,
// caller lấy nhóm nào khớp.
const CIRCLE_TARGET = String.raw`(?:đường\s*tròn\s*([A-Z])(?:['′]?)|\(\s*([A-Z])(?:['′]?)\s*\))`;

// "(kẻ|vẽ) (hai)? tiếp tuyến từ (điểm)? A (đến|tới|với) <đường tròn>"
//   - động từ kẻ/vẽ BẮT BUỘC: chặn ngữ cảnh TÍNH/giả thiết ("Độ dài tiếp tuyến
//     từ A đến (O) bằng 5" → không có kẻ/vẽ → không match, escalate).
//   - "hai"/"một" optional (1 hay 2 nhánh vẫn coi là tiếp tuyến từ điểm ngoài).
//   - from = 1 ký tự HOA sau "từ (điểm)?".
//   - giới từ đến/tới/với nối qua đường tròn (bắt buộc có dấu hiệu — CIRCLE_TARGET).
const FROM_FORM = new RegExp(
  String.raw`(?:[Kk]ẻ|[Vv]ẽ)\s+(?:một\s+|hai\s+)?tiếp\s*tuyến\s+từ\s+(?:điểm\s+)?([A-Z])(?:['′]?)\s+(?:đến|tới|với)\s+` +
    CIRCLE_TARGET,
  'u',
);

// Biến thể đảo: "Từ (điểm)? A ... (kẻ|vẽ) (hai)? tiếp tuyến (đến|tới|với) <đường tròn>".
//   - kẻ|vẽ vẫn bắt buộc (đã có sẵn trong cú pháp đảo).
const TU_FORM = new RegExp(
  String.raw`(?<!\p{L})[Tt]ừ\s+(?:điểm\s+)?([A-Z])(?:['′]?)(?!\p{L})[^.]{0,40}?(?:[Kk]ẻ|[Vv]ẽ)\s+(?:một\s+|hai\s+)?tiếp\s*tuyến\s+(?:đến|tới|với)\s+` +
    CIRCLE_TARGET,
  'u',
);

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
      // circle bắt qua 1 trong 2 alternative ("đường tròn X" = m[2], "(X)" = m[3]).
      const circle = m[2] ?? m[3];
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
