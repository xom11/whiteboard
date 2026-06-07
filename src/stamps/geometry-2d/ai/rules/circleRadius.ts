// src/stamps/geometry-2d/ai/rules/circleRadius.ts
//
// Đường tròn theo TÂM: bán kính số / bán kính ký hiệu CHỮ / "đi qua <điểm>".
//   - "đường tròn (tâm) O bán kính 3"        → centerRadius {center:'O', radius:3}
//   - "(O; 3)" / "(O, 3)"                     → centerRadius {center:'O', radius:3}
//   - "(O; R)" / "(I; r)" / "bán kính R"      → centerRadius bán kính CANONICAL
//                                               (issue #46 nhóm A — xem dưới)
//   - "đường tròn tâm O đi qua A"             → centerThrough {center:'O', through:'A'}
//
// CHỈ emit khi có bán kính SỐ, bán kính ký hiệu CHỮ (R/r), hoặc "đi qua <điểm>".
// "(O)" trơ (không số/chữ/"đi qua") → bỏ qua (chỉ tham chiếu; rule khác/AI xử lý).
//
// BÁN KÍNH KÝ HIỆU CHỮ (issue #46): "Cho đường tròn (O; R)" cực phổ biến ở đề thi.
// R là KÝ HIỆU (giá trị thực không cho) → vẽ với bán kính CANONICAL dương để minh
// hoạ (fail-safe: không sai ngữ nghĩa — đường tròn tâm O bán kính tuỳ ý). CHỈ nhận
// đúng [Rr] đứng riêng: hệ số "2R" (defer Cụm C) và chữ khác "(A; B)" → bỏ qua.
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

/**
 * Bán kính CANONICAL (board units) khi đề cho bán kính KÝ HIỆU CHỮ ("(O; R)",
 * "bán kính R"). Giá trị thực là ký hiệu → vẽ minh hoạ; khớp scale với bán kính
 * số mặc định nhỏ (vd "(O; 3)"). circleCR yêu cầu radius > 0.
 */
export const SYMBOLIC_RADIUS = 3;

// Ký hiệu gọn bán kính CHỮ "(O; R)" / "(I; r)" — quét toàn đề. Bán kính CHỈ [Rr]
// đứng RIÊNG (theo sau là ')'): "2R" (hệ số, defer) và chữ khác "(A; B)" KHÔNG
// khớp → escalate (fail-safe). Center 1 ký tự HOA như nhánh số.
const CENTER_RADIUS_LETTER_PAREN_G = /\(\s*([A-Z])\s*[;,]\s*[Rr]\s*\)/gu;

// "đường tròn tâm O bán kính R" — words, bán kính CHỮ. Mirror tempered của
// CENTER_RADIUS_WORDS_G; (?![A-Za-z]) chặn "Ra"/"Rồi"… và phần số ("2R") để
// nhánh số lo. GLOBAL: nhiều đường tròn / clause.
const CENTER_RADIUS_LETTER_WORDS_G =
  /đường\s*tròn\s*(?:\(\s*)?(?:tâm\s+)?([A-Z])(?:\s*\))?(?:(?!đường|và\s)[^A-Z])*?bán\s*kính\s+[Rr](?![A-Za-z])/gu;

/** "3" / "3.5" / "3,5" → number. NaN nếu không parse được. */
function parseNum(raw: string): number {
  return Number(raw.replace(',', '.'));
}

/**
 * Circle này là đường tròn NGOẠI/NỘI TIẾP tam giác? ("tam giác ABC nội tiếp
 * đường tròn (O; 3)") → circleTriangle sở hữu (through3/inscribedIn theo 3 đỉnh);
 * circleRadius KHÔNG emit thêm 1 đường tròn rời (sẽ chồng + không nhất quán).
 * Bán kính chỉ là chú thích — circumcircle xác định bởi 3 đỉnh, bỏ radius là OK.
 */
function isInscribedCircumscribed(problem: string, center: string): boolean {
  // Chiều 1 — quan hệ ĐỨNG TRƯỚC circle: "(tam giác) nội/ngoại tiếp … (O".
  const after = new RegExp(
    `(?:nội|ngoại)\\s*tiếp[^.]{0,30}?(?:đường\\s*tròn\\s*)?\\(?\\s*${center}(?![A-Z])`,
    'u',
  );
  // Chiều 2 — circle ĐỨNG TRƯỚC quan hệ: ký hiệu "(O; R) … ngoại/nội tiếp".
  // circleTriangle sở hữu circumcircle/incircle (qua 3 đỉnh) → circleRadius bỏ
  // để tránh DOUBLE-circle quanh O. [^()]* không vượt ngoặc khác; [^.]{0,30}?
  // không nhảy câu (giữ proximity, tránh false-positive với circle rời khác).
  const before = new RegExp(
    `\\(\\s*${center}\\s*[;,][^()]*\\)[^.]{0,30}?(?:nội|ngoại)\\s*tiếp`,
    'u',
  );
  return after.test(problem) || before.test(problem);
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
  patterns: [
    CENTER_RADIUS_WORDS_G,
    CENTER_THROUGH_G,
    /\(\s*[A-Z]\s*[;,]\s*\d/u,
    /\(\s*[A-Z]\s*[;,]\s*[Rr]\s*\)/u, // ký hiệu bán kính CHỮ "(O; R)"
    /bán\s*kính\s+[Rr](?![A-Za-z])/u, // words bán kính CHỮ "bán kính R"
  ],
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
        if (isInscribedCircumscribed(ctx.problem, center)) continue; // circleTriangle sở hữu
        out.push({
          ruleId: 'circleRadius',
          clauseIds: [c.id],
          intents: [drawCircle(center, 'centerRadius', { center, radius })],
        });
      }

      // 3) "bán kính R/r" (bán kính CHỮ ký hiệu) → centerRadius bán kính canonical.
      //    Clause có "nội/ngoại tiếp" → mơ hồ (circleTriangle/escalate sở hữu) → bỏ
      //    (clause-local, không ảnh hưởng nhánh số ở clause khác).
      if (!/(?:nội|ngoại)\s*tiếp/u.test(c.text)) {
        CENTER_RADIUS_LETTER_WORDS_G.lastIndex = 0;
        let clw: RegExpExecArray | null;
        while ((clw = CENTER_RADIUS_LETTER_WORDS_G.exec(c.text)) !== null) {
          const center = clw[1];
          if (isInscribedCircumscribed(ctx.problem, center)) continue;
          out.push({
            ruleId: 'circleRadius',
            clauseIds: [c.id],
            intents: [drawCircle(center, 'centerRadius', { center, radius: SYMBOLIC_RADIUS })],
          });
        }
      }
    }

    // --- Toàn đề: ký hiệu gọn "(O; 3)" / "(O, 3)" (bị segmentation cắt) -------
    CENTER_RADIUS_PAREN_G.lastIndex = 0;
    let pm: RegExpExecArray | null;
    while ((pm = CENTER_RADIUS_PAREN_G.exec(ctx.problem)) !== null) {
      const center = pm[1];
      const radius = parseNum(pm[2]);
      if (!Number.isFinite(radius) || radius <= 0) continue;
      if (isInscribedCircumscribed(ctx.problem, center)) continue; // circleTriangle sở hữu
      const clauseId = findParenClauseId(ctx.clauses, center);
      out.push({
        ruleId: 'circleRadius',
        clauseIds: clauseId === undefined ? [] : [clauseId],
        intents: [drawCircle(center, 'centerRadius', { center, radius })],
      });
    }

    // --- Toàn đề: ký hiệu bán kính CHỮ "(O; R)" / "(I; r)" (segmenter cắt ';') ---
    // Bán kính ký hiệu → bán kính canonical. Guard 2 chiều bỏ qua khi đường tròn
    // nội/ngoại tiếp tam giác (circleTriangle sở hữu).
    CENTER_RADIUS_LETTER_PAREN_G.lastIndex = 0;
    let lpm: RegExpExecArray | null;
    while ((lpm = CENTER_RADIUS_LETTER_PAREN_G.exec(ctx.problem)) !== null) {
      const center = lpm[1];
      if (isInscribedCircumscribed(ctx.problem, center)) continue; // circleTriangle sở hữu
      const clauseId = findParenClauseId(ctx.clauses, center);
      out.push({
        ruleId: 'circleRadius',
        clauseIds: clauseId === undefined ? [] : [clauseId],
        intents: [drawCircle(center, 'centerRadius', { center, radius: SYMBOLIC_RADIUS })],
      });
    }

    return out;
  },
};
