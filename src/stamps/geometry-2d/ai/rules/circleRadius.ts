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
const CENTER_RADIUS_WORDS =
  /đường\s*tròn\s*(?:\(\s*)?(?:tâm\s+)?([A-Z])(?:\s*\))?[^A-Z]*?bán\s*kính\s+(\d+(?:[.,]\d+)?)/u;

// "đường tròn tâm O đi qua A" / "(O) đi qua A" / "O đi qua A".
const CENTER_THROUGH =
  /đường\s*tròn\s*(?:\(\s*)?(?:tâm\s+)?([A-Z])(?:\s*\))?\s+đi\s+qua\s+([A-Z])/u;

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
  patterns: [CENTER_RADIUS_WORDS, CENTER_THROUGH, /\(\s*[A-Z]\s*[;,]\s*\d/u],
  match(ctx) {
    const out: RuleMatch[] = [];

    // --- Per-clause: dạng "bán kính <số>" + "đi qua <điểm>" (segment nguyên) ---
    for (const c of ctx.clauses) {
      // Ưu tiên "đi qua <điểm>" (centerThrough) — loại trừ với "bán kính số".
      const ct = CENTER_THROUGH.exec(c.text);
      if (ct) {
        const center = ct[1];
        const through = ct[2];
        out.push({
          ruleId: 'circleRadius',
          clauseIds: [c.id],
          intents: [drawCircle(center, 'centerThrough', { center, through })],
        });
        continue;
      }

      const crw = CENTER_RADIUS_WORDS.exec(c.text);
      if (crw) {
        const center = crw[1];
        const radius = parseNum(crw[2]);
        if (Number.isFinite(radius) && radius > 0) {
          out.push({
            ruleId: 'circleRadius',
            clauseIds: [c.id],
            intents: [drawCircle(center, 'centerRadius', { center, radius })],
          });
        }
        // radius CHỮ ("R") → crw không match (\d bắt buộc) → bỏ qua escalate.
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
