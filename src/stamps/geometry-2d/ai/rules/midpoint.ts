// src/stamps/geometry-2d/ai/rules/midpoint.ts
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, pairFromToken, SIDE_PREFIX } from './_shared';

// LƯU Ý: \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề"…). Mọi regex chứa ký tự Việt dùng cờ 'u' + lookaround \p{L}.

// Prefilter toàn đề. "trung điểm" KHÔNG khớp "trung trực" (an toàn, rule khác lo).
const MIDPOINT = /trung\s*điểm/u;

// Dạng A (GLOBAL): tên điểm ĐỨNG TRƯỚC "(là) trung điểm (của (cạnh|đoạn)) <PAIR>".
//   "Gọi M là trung điểm BC" | "M là trung điểm của BC" | "M trung điểm cạnh BC"
//   | "M là trung điểm cạnh huyền BC" | "trung điểm đoạn thẳng AC"
// Tên = ký tự HOA NGAY TRƯỚC cụm trung điểm (cục bộ quanh match, KHÔNG quét intro).
const NAME_BEFORE_G = new RegExp(
  `([A-Z])(?:['′]?)\\s+(?:là\\s+|=\\s+)?trung\\s*điểm\\s+(?:của\\s+)?${SIDE_PREFIX}([A-Z])([A-Z])(?!\\p{L})`,
  'gu',
);

// Dạng B (GLOBAL): tên điểm ĐỨNG SAU "trung điểm <NAME> của (cạnh|đoạn) <PAIR>".
//   "trung điểm I của (cạnh huyền) AB" | "trung điểm I của đoạn thẳng BC"
const NAME_AFTER_G = new RegExp(
  `trung\\s*điểm\\s+([A-Z])(?:['′]?)\\s+của\\s+${SIDE_PREFIX}([A-Z])([A-Z])(?!\\p{L})`,
  'gu',
);

// Distributive "lần lượt": "M, N (, P) lần lượt là trung điểm AB, AC (, BC)" →
// zip 1-1: M=mid(AB), N=mid(AC), P=mid(BC). group1 = blob tên (≥2, phẩy),
// group2 = blob cặp đỉnh (≥2, phẩy). Số tên PHẢI bằng số cặp (else bỏ qua,
// escalate — không đoán lệch). SIDE_PREFIX cho "(các) cạnh/đoạn" trước blob cặp.
const DISTRIB = new RegExp(
  `((?:[A-Z](?:['′]?)\\s*,\\s*)+[A-Z](?:['′]?))\\s+lần\\s*lượt\\s+(?:là\\s+)?(?:điểm\\s+)?trung\\s*điểm\\s+(?:của\\s+)?(?:các\\s+)?${SIDE_PREFIX}((?:[A-Z][A-Z]\\s*,\\s*)+[A-Z][A-Z])`,
  'u',
);

// Tách 1 token tên trong blob distributive → "M" / "M'" (prime normalize ′→').
function nameToken(raw: string): string | undefined {
  const m = /^([A-Z])(['′]?)/u.exec(raw.trim());
  if (!m) return undefined;
  return m[2] ? `${m[1]}'` : m[1];
}

// === EN patterns (issue #46 group B) ========================================
// Prefilter EN: "midpoint" (first-letter case flex [Mm], KHÔNG cờ 'i' — phá [A-Z]).
const MIDPOINT_EN = /[Mm]idpoint/u;
// EN side/segment prefix tuỳ chọn TRƯỚC cặp đỉnh: "segment BC", "side BC".
const SIDE_PREFIX_EN = '(?:segment\\s+|side\\s+)?';

// EN dạng A (GLOBAL): tên ĐỨNG TRƯỚC. "M is the midpoint of BC" | "let M be the
// midpoint of segment BC". Tên = HOA NGAY TRƯỚC "is/be the midpoint" (cục bộ).
// (?![A-Za-z]) neo cuối cặp đỉnh (chặn "BCD" 3 chữ → escalate-safe).
const NAME_BEFORE_EN_G = new RegExp(
  `([A-Z])(?:['′]?)\\s+(?:is|be)\\s+the\\s+midpoint\\s+of\\s+${SIDE_PREFIX_EN}([A-Z])([A-Z])(?![A-Za-z])`,
  'gu',
);

// EN dạng B (GLOBAL): tên ĐỨNG SAU. "midpoint M of BC" | "midpoint I of segment AB".
const NAME_AFTER_EN_G = new RegExp(
  `[Mm]idpoint\\s+([A-Z])(?:['′]?)\\s+of\\s+${SIDE_PREFIX_EN}([A-Z])([A-Z])(?![A-Za-z])`,
  'gu',
);

/**
 * "Gọi M là trung điểm BC" → add-point M {kind:'midpoint', of:'BC'}.
 *
 * GLOBAL: emit MỌI cụm "trung điểm <PAIR>" trong clause (vd "M là trung điểm BC
 * và N là trung điểm AC" → 2 add-point). Tên điểm bind THEO TỪNG MATCH cục bộ:
 *   - dạng A: ký tự HOA NGAY TRƯỚC "(là) trung điểm" — KHÔNG quét lời dẫn
 *     toàn clause (tránh "Lấy điểm D, gọi M là trung điểm BC" gán nhầm 'D').
 *   - dạng B: ký tự HOA NGAY SAU "trung điểm" ("trung điểm I của AB").
 * Match nào không có tên cục bộ HOẶC cặp đỉnh không hợp lệ → BỎ QUA match đó
 * (escalate AI), không bịa tên.
 */
export const midpointRule: LanguageRule = {
  id: 'midpoint',
  priority: 50,
  languages: ['vi', 'en'],
  patterns: [MIDPOINT, MIDPOINT_EN],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const hasVi = MIDPOINT.test(c.text);
      const hasEn = MIDPOINT_EN.test(c.text);
      if (!hasVi && !hasEn) continue;

      const emit = (name: string, pairToken: string, clauseId: number) => {
        const pair = pairFromToken(pairToken);
        if (!name || pair.length !== 2) return;
        out.push({
          ruleId: 'midpoint',
          clauseIds: [clauseId],
          intents: [addPoint(name, { kind: 'midpoint', of: pair.join('') })],
        });
      };

      if (hasVi) {
        // Distributive "lần lượt" ưu tiên: "M, N lần lượt là trung điểm AB, AC"
        // → M=mid(AB), N=mid(AC). Số tên = số cặp mới emit (else bỏ qua → escalate).
        const dm = DISTRIB.exec(c.text);
        if (dm) {
          const names = dm[1]
            .split(',')
            .map((s) => nameToken(s))
            .filter((x): x is string => !!x);
          const pairs = dm[2].split(',').map((s) => s.trim()).filter(Boolean);
          if (names.length >= 2 && names.length === pairs.length) {
            for (let i = 0; i < names.length; i++) emit(names[i], pairs[i], c.id);
            continue; // clause đã xử lý bằng distributive — skip dạng A/B + EN
          }
        }

        // Theo dõi vị trí cụm "trung điểm" đã được dạng A claim, để dạng B không
        // nhân đôi cùng một occurrence.
        const consumed = new Set<number>();

        // Dạng A — tên đứng trước. Vị trí cụm "trung điểm" = chỉ số bắt đầu match
        // (gần đúng: match bắt đầu ở ký tự tên, "trung điểm" theo ngay sau).
        NAME_BEFORE_G.lastIndex = 0;
        for (const m of c.text.matchAll(NAME_BEFORE_G)) {
          const tdIdx = c.text.indexOf('trung', m.index ?? 0);
          if (tdIdx >= 0) consumed.add(tdIdx);
          emit(m[1], m[2] + m[3], c.id);
        }

        // Dạng B — tên đứng sau "trung điểm". Bỏ qua occurrence đã được dạng A claim.
        NAME_AFTER_G.lastIndex = 0;
        for (const m of c.text.matchAll(NAME_AFTER_G)) {
          const tdIdx = m.index ?? 0;
          if (consumed.has(tdIdx)) continue;
          emit(m[1], m[2] + m[3], c.id);
        }
      }

      // --- EN (issue #46 group B) — dạng A (name before) + B (name after) -----
      // EN dạng A khớp "X is/be the midpoint of …"; dạng B khớp "midpoint X of …".
      // 2 dạng không chồng (A cần "is/be the", B cần HOA ngay sau "midpoint") nên
      // KHÔNG cần consumed-set như VN.
      if (hasEn) {
        NAME_BEFORE_EN_G.lastIndex = 0;
        for (const m of c.text.matchAll(NAME_BEFORE_EN_G)) {
          emit(m[1], m[2] + m[3], c.id);
        }
        NAME_AFTER_EN_G.lastIndex = 0;
        for (const m of c.text.matchAll(NAME_AFTER_EN_G)) {
          emit(m[1], m[2] + m[3], c.id);
        }
      }
    }
    return out;
  },
};
