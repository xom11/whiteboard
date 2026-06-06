// src/stamps/geometry-2d/ai/rules/midpoint.ts
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, pairFromToken } from './_shared';

// LƯU Ý: \b của JS dựa trên ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề"…). Mọi regex chứa ký tự Việt dùng cờ 'u' + lookaround \p{L}.

// Prefilter toàn đề. "trung điểm" KHÔNG khớp "trung trực" (an toàn, rule khác lo).
const MIDPOINT = /trung\s*điểm/u;

// Dạng A (GLOBAL): tên điểm ĐỨNG TRƯỚC "(là) trung điểm (của (cạnh|đoạn)) <PAIR>".
//   "Gọi M là trung điểm BC" | "M là trung điểm của BC" | "M trung điểm cạnh BC"
// Tên = ký tự HOA NGAY TRƯỚC cụm trung điểm (cục bộ quanh match, KHÔNG quét intro).
const NAME_BEFORE_G =
  /([A-Z])(?:['′]?)\s+(?:là\s+|=\s+)?trung\s*điểm\s+(?:của\s+)?(?:cạnh\s+|đoạn\s+)?([A-Z])([A-Z])(?!\p{L})/gu;

// Dạng B (GLOBAL): tên điểm ĐỨNG SAU "trung điểm <NAME> của (cạnh|đoạn) <PAIR>".
//   "trung điểm I của (cạnh) AB"
const NAME_AFTER_G =
  /trung\s*điểm\s+([A-Z])(?:['′]?)\s+của\s+(?:cạnh\s+|đoạn\s+)?([A-Z])([A-Z])(?!\p{L})/gu;

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
  languages: ['vi'],
  patterns: [MIDPOINT],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      if (!MIDPOINT.test(c.text)) continue;

      // Theo dõi vị trí cụm "trung điểm" đã được dạng A claim, để dạng B không
      // nhân đôi cùng một occurrence.
      const consumed = new Set<number>();

      const emit = (name: string, pairToken: string, clauseId: number) => {
        const pair = pairFromToken(pairToken);
        if (!name || pair.length !== 2) return;
        out.push({
          ruleId: 'midpoint',
          clauseIds: [clauseId],
          intents: [addPoint(name, { kind: 'midpoint', of: pair.join('') })],
        });
      };

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
    return out;
  },
};
