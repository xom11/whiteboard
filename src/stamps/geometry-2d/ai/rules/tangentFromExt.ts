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
import { drawLine, addPoint } from './_shared';

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

// === EN patterns (issue #46 group B) ========================================
// Target đường tròn EN: "(X)" (language-agnostic, giống VN) HOẶC "circle X" /
// "circle (X)". KHÔNG nhận chữ HOA TRẦN ("from A to BC": BC là đoạn → không
// claim → escalate). Hai alternative → 2 capture nhóm (caller lấy nhóm nào khớp).
//   - nhóm 1: ([A-Z]) sau "circle" (có thể bọc "(...)").
//   - nhóm 2: ([A-Z]) trong "(...)" trần (không từ "circle").
// First-letter flex [Cc]; KHÔNG cờ 'i' (giữ [A-Z] strict cho nhãn).
const CIRCLE_TARGET_EN = String.raw`(?:[Cc]ircle\s*\(?\s*([A-Z])(?:['′]?)\s*\)?|\(\s*([A-Z])(?:['′]?)\s*\))`;

// "(Draw|Construct) (the|two)? tangent(s)? (lines)? from (the)? A to (the)? <circle>"
//   - động từ Draw/Construct BẮT BUỘC: chặn ngữ cảnh TÍNH ("The length of the
//     tangent from A to (O) is 5" → không có Draw/Construct → không match,
//     escalate). Mirror ràng buộc verb của FROM_FORM (VN).
//   - giới từ "from <A> to <circle>" BẮT BUỘC: phân biệt với tangentAt
//     ("tangent ... at A" → không có "from ... to" → không match ở đây).
//   - from = 1 ký tự HOA sau "from (the)?".
//   - circle bắt buộc có dấu hiệu (CIRCLE_TARGET_EN — "(X)" hoặc "circle X").
// GROUP INDEX: from = nhóm 1; circle = nhóm 2 ("circle X") HOẶC nhóm 3 ("(X)").
const FROM_FORM_EN = new RegExp(
  String.raw`(?:[Dd]raw|[Cc]onstruct)\s+(?:the\s+|two\s+|the\s+two\s+)?tangents?(?:\s+lines?)?\s+from\s+(?:the\s+)?([A-Z])(?:['′]?)\s+to\s+(?:the\s+)?` +
    CIRCLE_TARGET_EN,
  'u',
);

// Biến thể đảo EN: "From (the)? A, ... (draw|construct) (the|two)? tangent(s)?
// (lines)? to (the)? <circle>".
//   - verb draw/construct vẫn bắt buộc (nằm sau "From A").
//   - "from A ... to <circle>" vẫn đầy đủ (from ở đầu, to trước circle).
// GROUP INDEX: from = nhóm 1; circle = nhóm 2 ("circle X") HOẶC nhóm 3 ("(X)").
const FROM_INV_EN = new RegExp(
  String.raw`(?<![A-Za-z])[Ff]rom\s+(?:the\s+)?([A-Z])(?:['′]?)(?![A-Za-z])[^.]{0,40}?(?:[Dd]raw|[Cc]onstruct)\s+(?:the\s+|two\s+|the\s+two\s+)?tangents?(?:\s+lines?)?\s+to\s+(?:the\s+)?` +
    CIRCLE_TARGET_EN,
  'u',
);

// === NAMED tangent points (issue #46) =======================================
// "Vẽ hai tiếp tuyến AB, AC từ A đến (O)" — B, C LÀ tiếp điểm (named). Khác với
// nhánh UNNAMED ở trên (regex unnamed FAIL vì "AB, AC" chen giữa "tiếp tuyến" và
// "từ"). Hai regex dưới bắt 2 đoạn tiếp tuyến + đường tròn trong 1 match.
//   GROUP INDEX (cả VN & EN): m[1]=chữ đầu đoạn 1 (điểm ngoài x1),
//     m[2]=tiếp điểm 1 (B), m[3]=chữ đầu đoạn 2 (x2), m[4]=tiếp điểm 2 (C),
//     m[5]/m[6] = circle (qua CIRCLE_TARGET / CIRCLE_TARGET_EN).
const NAMED_FROM_VN = new RegExp(
  String.raw`(?:[Kk]ẻ|[Vv]ẽ)\s+(?:một\s+|hai\s+)?tiếp\s*tuyến\s+([A-Z])([A-Z])\s*(?:,|và)\s*([A-Z])([A-Z])(?![A-Z])[^.]{0,40}?(?:đến|tới|với)\s+` +
    CIRCLE_TARGET,
  'u',
);
const NAMED_FROM_EN = new RegExp(
  String.raw`(?:[Dd]raw|[Cc]onstruct)\s+(?:the\s+|two\s+|the\s+two\s+)?tangents?(?:\s+lines?)?\s+([A-Z])([A-Z])\s*(?:,|and)\s*([A-Z])([A-Z])(?![A-Z])[^.]{0,40}?to\s+(?:the\s+)?` +
    CIRCLE_TARGET_EN,
  'u',
);

export const tangentFromExtRule: LanguageRule = {
  id: 'tangentFromExt',
  priority: 65,
  languages: ['vi', 'en'],
  // EN prefilter "tangent" để runRules (prefilter qua patterns[], bỏ qua
  // languages) chạy match() cho đề EN thuần (không có "tiếp tuyến").
  patterns: [HAS_TANGENT, /[Tt]angent/u],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      // === NAMED tangent points (issue #46): "tiếp tuyến AB, AC ... (O)" → dựng
      // tiếp điểm B,C (tangentPointExt) cộng với 2 tiếp tuyến. from = chữ cái đầu
      // CHUNG của 2 đoạn (điểm ngoài); tiếp điểm = chữ cái thứ 2 mỗi đoạn.
      const named = NAMED_FROM_VN.exec(c.text) ?? NAMED_FROM_EN.exec(c.text);
      if (named) {
        const from = named[1];
        const tpB = named[2];
        const x2 = named[3];
        const tpC = named[4];
        const circle = named[5] ?? named[6];
        // Hợp lệ: cùng điểm ngoài (m1===m3), 2 tiếp điểm phân biệt & khác điểm ngoài.
        if (
          circle && from === x2 &&
          tpB !== from && tpC !== from && tpB !== tpC
        ) {
          out.push({
            ruleId: 'tangentFromExt',
            clauseIds: [c.id],
            intents: [
              drawLine('t', 'tangentFromExt', { from, circle, which: 'both' }),
              addPoint(tpB, { kind: 'tangentPoint', from, circle, which: 0 }),
              addPoint(tpC, { kind: 'tangentPoint', from, circle, which: 1 }),
            ],
          });
          continue; // clause handled — skip unnamed path
        }
        // not valid named form → fall through to unnamed logic (will likely escalate)
      }
      // VN trước (FROM_FORM / TU_FORM), giữ nguyên hành vi cũ; EN sau (FROM_FORM_EN
      // / FROM_INV_EN). circle bắt qua 1 trong các alternative capture group.
      const m =
        FROM_FORM.exec(c.text) ??
        TU_FORM.exec(c.text) ??
        FROM_FORM_EN.exec(c.text) ??
        FROM_INV_EN.exec(c.text);
      if (!m) continue;
      const from = m[1];
      // circle bắt qua 1 trong 2 alternative:
      //   VN: "đường tròn X" = m[2], "(X)" = m[3].
      //   EN: "circle X" = m[2], "(X)" = m[3] (cùng index — cả 2 dạng đều có
      //       circle ở nhóm 2/3 vì from luôn là nhóm 1, CIRCLE_TARGET(_EN) có 2
      //       alternative nhóm 2 & 3).
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
