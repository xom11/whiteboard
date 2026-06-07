// src/stamps/geometry-2d/ai/rules/reflection.ts
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, extractPointName } from './_shared';

// LƯU Ý: \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề"…). Mọi regex chứa ký tự Việt dùng cờ 'u' + tránh \b.

// Prefilter toàn đề: "đối xứng" (cho phép viết liền "đốixứng" hiếm gặp → giữ \s*).
const REFLECT = /đối\s*xứng/u;

// Dạng A: tên điểm ĐỨNG TRƯỚC.
//   "D đối xứng (với) H qua BC"
//   "D là (điểm) đối xứng (của|với) H qua (đường thẳng|cạnh|trục) <Z>"
// Z bắt mở (chữ cái + dấu phẩy/′), phân loại điểm/đường ở dưới.
const NAME_BEFORE =
  /([A-Z])(?:['′]?)\s+(?:là\s+)?(?:điểm\s+)?đối\s*xứng\s+(?:của\s+|với\s+)?([A-Z])(?:['′]?)\s+qua\s+(?:đường\s*thẳng\s+|cạnh\s+|đoạn\s+|trục\s+|trung\s*điểm\s+|điểm\s+)?([A-Za-z][A-Za-z′']?)/u;

// Dạng B: KHÔNG có tên dẫn trước "đối xứng" (lấy tên từ lời dẫn "Gọi/Lấy …").
//   "Gọi D là điểm đối xứng của H qua BC"
//   "Lấy điểm đối xứng của H qua M"
const NAME_AFTER =
  /(?:điểm\s+)?đối\s*xứng\s+(?:của\s+|với\s+)?([A-Z])(?:['′]?)\s+qua\s+(?:đường\s*thẳng\s+|cạnh\s+|đoạn\s+|trục\s+|trung\s*điểm\s+|điểm\s+)?([A-Za-z][A-Za-z′']?)/u;

// === EN (issue #46 group B) ===
// "<Name> is/be the reflection of <Of> (over|across|in|about|through) (the)? (line|point|segment)? <Z>"
// Name đứng TRƯỚC (qua "is"/"be the" — gồm "Let D be the reflection..."). KHÔNG cờ 'i'.
// (?<![A-Za-z]) đảm bảo Name là nhãn đơn. Z phân loại bằng classifyThrough (reuse).
const REFLECT_EN =
  /(?<![A-Za-z])([A-Z])(?:['′]?)\s+(?:is|be)\s+the\s+reflection\s+of\s+([A-Z])(?:['′]?)\s+(?:over|across|in|about|through)\s+(?:the\s+)?(?:line\s+|point\s+|segment\s+)?([A-Za-z][A-Za-z′']?)/u;
const REFLECT_EN_PRE = /[Rr]eflection/u;

// Phân loại token Z (đã strip dấu phẩy/′):
//   "M"  → điểm (1 ký tự HOA)              → reflectPoint
//   "BC" → đường (cặp 2 ký tự HOA)         → reflectLine
//   "d"  → đường (tên đường, chữ thường)   → reflectLine
function classifyThrough(raw: string): { kind: 'point' | 'line'; value: string } | undefined {
  const z = raw.replace(/['′]/gu, '').trim();
  if (/^[A-Z]$/u.test(z)) return { kind: 'point', value: z };
  if (/^[A-Z][A-Z]$/u.test(z)) return { kind: 'line', value: z };
  // tên đường thẳng chữ thường (d, d1, a, xy…) → đường
  if (/^[a-z][A-Za-z0-9]*$/u.test(z)) return { kind: 'line', value: z };
  return undefined;
}

/**
 * Đối xứng (Cụm A reflection):
 *   "D đối xứng H qua BC"          → reflectLine  (qua ĐƯỜNG: cặp đỉnh BC / tên đường d)
 *   "Q đối xứng P qua M"           → reflectPoint (qua ĐIỂM: 1 ký tự HOA)
 *   "D là điểm đối xứng của H qua đường thẳng d" → reflectLine (through='d')
 *
 * name (điểm ảnh) = ký tự HOA đứng trước "đối xứng" (dạng A) hoặc lời dẫn
 * "Gọi/Lấy …" (dạng B). of = điểm gốc (X). through = Z, phân loại bằng
 * classifyThrough. Không trích đủ name / of / through hợp lệ → BỎ QUA clause
 * (đừng bịa tên) để pipeline escalate AI.
 */
export const reflectionRule: LanguageRule = {
  id: 'reflection',
  priority: 55,
  languages: ['vi', 'en'],
  patterns: [REFLECT, REFLECT_EN_PRE],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      if (!REFLECT.test(c.text) && !REFLECT_EN_PRE.test(c.text)) continue;

      let name: string | undefined;
      let of: string | undefined;
      let throughRaw: string | undefined;

      const before = NAME_BEFORE.exec(c.text);
      if (before) {
        name = before[1];
        of = before[2];
        throughRaw = before[3];
      } else {
        const after = NAME_AFTER.exec(c.text);
        if (after) {
          // Không có tên đứng trước → lấy từ lời dẫn ("Gọi D là …").
          name = extractPointName(c.text);
          of = after[1];
          throughRaw = after[2];
        } else {
          // --- EN (issue #46 group B) — chỉ chạy khi cả 2 dạng VN fail. ---
          const en = REFLECT_EN.exec(c.text);
          if (en) {
            name = en[1];
            of = en[2];
            throughRaw = en[3];
          }
        }
      }

      if (!name || !of || !throughRaw) continue;

      const through = classifyThrough(throughRaw);
      if (!through) continue;

      const constraint =
        through.kind === 'point'
          ? { kind: 'reflectPoint', of, through: through.value }
          : { kind: 'reflectLine', of, through: through.value };

      out.push({
        ruleId: 'reflection',
        clauseIds: [c.id],
        intents: [addPoint(name, constraint)],
      });
    }
    return out;
  },
};
