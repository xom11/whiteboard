// src/stamps/geometry-2d/ai/rules/circleRadius.ts
//
// Đường tròn theo TÂM: bán kính số hoặc "đi qua <điểm>".
//   - "đường tròn (tâm) O bán kính 3"        → centerRadius {center:'O', radius:3}
//   - "(O; 3)" / "(O, 3)"                     → centerRadius {center:'O', radius:3}
//   - "đường tròn tâm O đi qua A"             → centerThrough {center:'O', through:'A'}
//
// CHỈ emit khi có bán kính SỐ hoặc có "đi qua <điểm>". "(O)" trơ (không số, không
// "đi qua") → bỏ qua (chỉ tham chiếu; rule khác/AI xử lý). Bán kính là CHỮ ("R")
// không phải số → bỏ qua để escalate.
//
// GOTCHA segmentation: segmentClauses() tách trên '.' ';' ',' nên ký hiệu gọn
// "(O; 3)" / "(O, 2.5)" BỊ cắt ngang clause ("(O" và "3)" thành 2 clause). Vì
// vậy nhánh PAREN quét trên TOÀN đề (ctx.problem) rồi gán match cho clause chứa
// fragment "(<tâm>". Nhánh WORDS / THROUGH segment nguyên vẹn → quét per-clause.
//
// GOTCHA \b: \b của JS dựa ASCII word-char nên KHÔNG khớp quanh ký tự Việt
// ("đ","ề","ạ"…). Mọi regex chứa ký tự Việt dùng cờ 'u' + lookaround \p{L}.
import type { LanguageRule, RuleMatch } from './_types';
import type { Clause } from '../deterministic/coverage';
import { drawCircle } from './_shared';

// "đường tròn tâm O bán kính 3" / "(O) bán kính 3" / "O bán kính 3".
// Tâm 1 ký tự HOA; "tâm" optional; có thể bọc trong ngoặc "(O)".
//
// GLOBAL (/gu) vì 1 clause có thể nêu NHIỀU đường tròn ("tâm I bán kính 2 và
// tâm O bán kính 5" không có dấu câu tách → cùng clause). matchAll quét hết.
//
// Gap tâm→"bán kính" dùng tempered quantifier `(?:(?!đường|và\s)[^A-Z])*?` để
// KHÔNG nhảy qua một "đường tròn" khác hay liên từ "và " (ranh giới giữa 2 hình).
// Nếu nhảy qua được, "tâm O và … tâm I bán kính 5" sẽ bind nhầm 5 vào O. Chặn ở
// đây ⇒ match bắt đầu từ O thất bại, regex tự dời tới "tâm I bán kính 5" (đúng),
// còn "tâm O" trơ (không số) không bị nuốt → không claim → escalate phần đó.
const CENTER_RADIUS_WORDS_G =
  /đường\s*tròn\s*(?:\(\s*)?(?:tâm\s+)?([A-Z])(?:\s*\))?(?:(?!đường|và\s)[^A-Z])*?bán\s*kính\s+(\d+(?:[.,]\d+)?)/gu;

// "đường tròn tâm O đi qua A" / "(O) đi qua A" / "O đi qua A".
// GLOBAL: nhiều "đường tròn … đi qua …" trong 1 clause.
const CENTER_THROUGH_G =
  /đường\s*tròn\s*(?:\(\s*)?(?:tâm\s+)?([A-Z])(?:\s*\))?\s+đi\s+qua\s+([A-Z])/gu;

// Phần "đi qua B và C" (≥2 điểm surface): chưa hỗ trợ (DSL centerThrough 1 điểm).
// Phát hiện để SKIP match đó → điểm thứ 2 (C) thiếu trong DSL → named-entity
// guard escalate AI (an toàn) thay vì render thiếu C.
const THROUGH_MULTI = /đi\s+qua\s+[A-Z]\s*(?:và|,)\s*[A-Z]/u;

// Ký hiệu gọn "(O; 3)" / "(O, 3)" — quét toàn đề (global) vì có thể nhiều.
const CENTER_RADIUS_PAREN_G = /\(\s*([A-Z])\s*[;,]\s*(\d+(?:[.,]\d+)?)\s*\)/gu;

/** "3" / "3.5" / "3,5" → number. NaN nếu không parse được. */
function parseNum(raw: string): number {
  return Number(raw.replace(',', '.'));
}

/** Clause chứa fragment "(<center>" (ký hiệu gọn bị segmentation cắt vào đây). */
function findParenClauseId(
  clauses: readonly Clause[],
  center: string,
): number | undefined {
  const frag = new RegExp(`\\(\\s*${center}(?![A-Z])`, 'u');
  for (const c of clauses) if (frag.test(c.text)) return c.id;
  return undefined;
}

export const circleRadiusRule: LanguageRule = {
  id: 'circleRadius',
  priority: 75,
  languages: ['vi'],
  patterns: [CENTER_RADIUS_WORDS_G, CENTER_THROUGH_G, /\(\s*[A-Z]\s*[;,]\s*\d/u],
  match(ctx) {
    const out: RuleMatch[] = [];

    // --- Per-clause: dạng "bán kính <số>" + "đi qua <điểm>" (segment nguyên) ---
    for (const c of ctx.clauses) {
      // 1) "đi qua <điểm>" (centerThrough). GLOBAL: nhiều đường tròn / clause.
      //    "đi qua B và C" (≥2 điểm) → SKIP toàn bộ centerThrough clause này:
      //    chưa hỗ trợ multi-surface-point, để guard escalate (không render thiếu).
      const throughMulti = THROUGH_MULTI.test(c.text);
      if (!throughMulti) {
        CENTER_THROUGH_G.lastIndex = 0;
        let ct: RegExpExecArray | null;
        while ((ct = CENTER_THROUGH_G.exec(c.text)) !== null) {
          const center = ct[1];
          const through = ct[2];
          out.push({
            ruleId: 'circleRadius',
            clauseIds: [c.id],
            intents: [drawCircle(center, 'centerThrough', { center, through })],
          });
        }
      }

      // 2) "bán kính <số>". GLOBAL: "tâm I bán kính 2 và tâm O bán kính 5" emit
      //    2 intent. Gap tempered (xem CENTER_RADIUS_WORDS_G) ⇒ không bind nhầm.
      //    radius CHỮ ("R") → \d không match → bỏ qua → escalate.
      CENTER_RADIUS_WORDS_G.lastIndex = 0;
      let crw: RegExpExecArray | null;
      while ((crw = CENTER_RADIUS_WORDS_G.exec(c.text)) !== null) {
        const center = crw[1];
        const radius = parseNum(crw[2]);
        if (!Number.isFinite(radius) || radius <= 0) continue;
        out.push({
          ruleId: 'circleRadius',
          clauseIds: [c.id],
          intents: [drawCircle(center, 'centerRadius', { center, radius })],
        });
      }
    }

    // --- Toàn đề: ký hiệu gọn "(O; 3)" / "(O, 3)" (bị segmentation cắt) -------
    CENTER_RADIUS_PAREN_G.lastIndex = 0;
    let pm: RegExpExecArray | null;
    while ((pm = CENTER_RADIUS_PAREN_G.exec(ctx.problem)) !== null) {
      const center = pm[1];
      const radius = parseNum(pm[2]);
      if (!Number.isFinite(radius) || radius <= 0) continue;
      const clauseId = findParenClauseId(ctx.clauses, center);
      out.push({
        ruleId: 'circleRadius',
        clauseIds: clauseId === undefined ? [] : [clauseId],
        intents: [drawCircle(center, 'centerRadius', { center, radius })],
      });
    }

    return out;
  },
};
