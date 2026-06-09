// src/stamps/geometry-2d/ai/rules/angleBisectorAngle.ts
//
// Phân giác theo GÓC (3-point angle, KHÔNG đặt tên chân) — Issue #46 nhóm A.
//
// Phrasing đề thi RẤT phổ biến: "Vẽ tia phân giác của góc BAC", "phân giác góc
// BAC", "đường phân giác của góc A"… → vẽ phân giác TRONG của góc, VISIBLE,
// KHÔNG có tên chân (khác hẳn cevian "phân giác AD" foot-named).
//
// Emit 1 intent draw-line/angleBisector (VISIBLE), KHÔNG add-point foot, KHÔNG
// connect. vertex = đỉnh góc:
//   - "góc XYZ" (3 ký tự HOA): vertex = chữ GIỮA (Y), p1=X, p2=Z.
//   - "góc A"  (1 ký tự, trong tam giác): vertex=A, p1/p2 = 2 đỉnh còn lại
//     (suy như cevian opposite). Không có tam giác để suy 2 tia → escalate.
//
// Discriminator: PHẢI có "góc" + (cụm 3 HOA HOẶC 1 HOA là đỉnh tam giác). KHÔNG
// đụng cevian "phân giác AD"/"phân giác ngoài AD" (2 ký tự foot-named): cevian
// pattern yêu cầu cặp HOA NGAY sau "phân giác", nhưng ở đây sau "phân giác" là
// "góc" (chữ thường) → cevian không khớp → KHÔNG double-emit.
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { drawLine } from './_shared';

// Tam giác từ toàn đề (cần để suy 2 cạnh cho "góc A"). \b không khớp quanh ký
// tự Việt → dùng class trực tiếp, cờ 'u'.
const TRI = /tam\s*giác(?:\s+(?:vuông|cân|đều|nhọn|tù))?\s+([A-Z])([A-Z])([A-Z])/u;

// === EN (issue #46 group B) =================================================
// Tam giác tiếng Anh: "triangle ABC" (first-letter case flex [Tt], KHÔNG cờ 'i'
// — sẽ phá [A-Z] nhãn). Nhãn = ĐÚNG 3 ký tự HOA liền, neo (?![A-Z]). Không cần
// 'g' (chỉ cần tam giác đầu tiên để fallback suy 2 cạnh, như TRI VN).
const TRI_EN = /[Tt]riangle\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/u;

// Prefilter: VN cần "phân giác" + "góc"; EN cần "angle bisector" (Form B) hoặc
// "bisector of (the)? angle/∠" (Form A). `.some` → ANY khớp là trigger match().
// "languages" là metadata thuần (runRules prefilter theo `patterns`, BỎ QUA nó).
const PREFILTER = [
  /[Pp]hân\s*giác/u,
  /góc/u,
  /[Aa]ngle\s+bisector/u, // Form B EN
  /[Bb]isector\s+of\s+(?:the\s+)?(?:[Aa]ngle|∠)/u, // Form A EN
];

// "phân giác … góc XYZ" (3 ký tự HOA liền). (?![A-Z]) chặn cụm 4+ ký tự.
// Cho phép cụm dẫn "(đường|tia) phân giác (của)? góc" — bổ ngữ optional.
const ANGLE3 =
  /phân\s*giác\s+(?:(?:của|cho)\s+)?góc\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/giu;
// "phân giác … góc A" (1 ký tự HOA, không theo sau bởi HOA khác → không phải 3-point).
const ANGLE1 =
  /phân\s*giác\s+(?:(?:của|cho)\s+)?góc\s+([A-Z])(?![A-Z])/giu;

// "chân (của)? (đường|tia)? " NGAY TRƯỚC "phân giác" → cụm "CHÂN phân giác" là
// FOOT (điểm), thuộc angleBisectorFoot.ts. angleBisectorAngle né để KHÔNG vẽ tia
// phân giác trùng (foot builder đã tự dựng tia bên trong) → tránh double-emit.
const CHAN_BEFORE = /chân\s+(?:của\s+)?(?:đường\s*|tia\s+)?$/u;

// === EN regex (issue #46 group B) ===========================================
// First-letter flex [Bb]/[Aa] (KHÔNG cờ 'i' — sẽ phá [A-Z] nhãn). Nhãn HOA
// strict, neo (?![A-Z]). Cờ 'g' để emit-all + matchAll. Yêu cầu chữ
// "angle"/∠ → KHÔNG khớp "perpendicular bisector of BC" (không có "angle").
//
// Form A: "(the)? bisector of (the)? (angle|∠) XYZ" — bổ ngữ "the" optional.
//   "Draw the bisector of angle BAC." → {p1:B, vertex:A, p2:C}
// Form B: "(the)? angle bisector of XYZ" — "of" sau "bisector", KHÔNG "angle/∠".
//   "The angle bisector of MNP." → {M,N,P}
const ANGLE3_EN_A =
  /[Bb]isector\s+of\s+(?:the\s+)?(?:[Aa]ngle|∠)\s*([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;
const ANGLE3_EN_B =
  /[Aa]ngle\s+bisector\s+of\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/gu;
// 1-letter "angle A" (Form A only — Form B "angle bisector of A" hiếm/mơ hồ,
// defer). Cần tam giác EN để suy 2 cạnh.
const ANGLE1_EN_A =
  /[Bb]isector\s+of\s+(?:the\s+)?(?:[Aa]ngle|∠)\s*([A-Z])(?![A-Z])/gu;

/** 2 đỉnh còn lại của tam giác (≠ vertex), giữ thứ tự xuất hiện trong tri. */
function others(tri: readonly string[], vertex: string): string[] {
  return tri.filter((v) => v !== vertex);
}

interface Hit {
  clauseId: number;
  p1: string;
  vertex: string;
  p2: string;
}

/**
 * "phân giác (của) góc XYZ/A" → draw-line/angleBisector VISIBLE (1 intent,
 * không foot, không connect). vertex = chữ giữa (3-point) hoặc đỉnh tam giác
 * (1-letter, suy 2 cạnh từ tam giác). Mơ hồ / không suy được 2 tia → escalate.
 */
export const angleBisectorAngleRule: LanguageRule = {
  id: 'angleBisectorAngle',
  // Cao hơn cevian (60) — chạy trước; tuy nhiên 2 rule không tranh chấp vì
  // discriminator "góc" loại cevian khỏi cụm này.
  priority: 62,
  languages: ['vi', 'en'],
  patterns: PREFILTER,
  match(ctx) {
    // Tam giác fallback (suy 2 cạnh cho "góc A"/"angle A"): VN trước, EN sau.
    // Đề VN không chứa "triangle" và đề EN không chứa "tam giác" → KHÔNG đụng
    // nhau (VN byte-identical).
    const triMatch = TRI.exec(ctx.problem);
    const triMatchEN = TRI_EN.exec(ctx.problem);
    const tri = triMatch
      ? [triMatch[1], triMatch[2], triMatch[3]]
      : triMatchEN
        ? [triMatchEN[1], triMatchEN[2], triMatchEN[3]]
        : null;

    const hits: Hit[] = [];
    const seen = new Set<string>(); // "p1|vertex|p2" dedup

    for (const c of ctx.clauses) {
      // ── 3-point "góc XYZ": vertex = chữ giữa, không cần tam giác ──
      ANGLE3.lastIndex = 0;
      for (const m of c.text.matchAll(ANGLE3)) {
        if (CHAN_BEFORE.test(c.text.slice(0, m.index))) continue; // "chân … phân giác" = foot
        const [p1, vertex, p2] = [m[1], m[2], m[3]];
        const key = `${p1}|${vertex}|${p2}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({ clauseId: c.id, p1, vertex, p2 });
      }

      // ── 1-letter "góc A": cần tam giác để suy 2 cạnh ──
      // Dùng pattern ANGLE1 nhưng BỎ QUA những match đã bị ANGLE3 nuốt (cùng vị
      // trí bắt đầu): so vị trí của vertex 1-letter với các 3-point đã thấy.
      ANGLE1.lastIndex = 0;
      for (const m of c.text.matchAll(ANGLE1)) {
        if (CHAN_BEFORE.test(c.text.slice(0, m.index))) continue; // "chân … phân giác" = foot
        const vertex = m[1];
        if (!tri) continue;                 // không tam giác → escalate
        if (!tri.includes(vertex)) continue; // đỉnh ngoài tam giác → bỏ qua
        const rest = others(tri, vertex);
        if (rest.length !== 2) continue;     // không suy được 2 tia → bỏ qua
        const [p1, p2] = rest;
        const key = `${p1}|${vertex}|${p2}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({ clauseId: c.id, p1, vertex, p2 });
      }

      // ── EN 3-point: Form A "(bisector of) angle XYZ" + Form B "angle bisector
      //    of XYZ". vertex = chữ giữa, không cần tam giác. seen dedup chung VN.
      for (const re of [ANGLE3_EN_A, ANGLE3_EN_B]) {
        re.lastIndex = 0;
        for (const m of c.text.matchAll(re)) {
          const [p1, vertex, p2] = [m[1], m[2], m[3]];
          const key = `${p1}|${vertex}|${p2}`;
          if (seen.has(key)) continue;
          seen.add(key);
          hits.push({ clauseId: c.id, p1, vertex, p2 });
        }
      }

      // ── EN 1-letter "angle A" (Form A): cần tam giác EN/VN để suy 2 cạnh.
      ANGLE1_EN_A.lastIndex = 0;
      for (const m of c.text.matchAll(ANGLE1_EN_A)) {
        const vertex = m[1];
        if (!tri) continue;                  // không tam giác → escalate
        if (!tri.includes(vertex)) continue; // đỉnh ngoài tam giác → bỏ qua
        const rest = others(tri, vertex);
        if (rest.length !== 2) continue;     // không suy được 2 tia → bỏ qua
        const [p1, p2] = rest;
        const key = `${p1}|${vertex}|${p2}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({ clauseId: c.id, p1, vertex, p2 });
      }
    }

    return hits.map<RuleMatch>((h) => ({
      ruleId: 'angleBisectorAngle',
      clauseIds: [h.clauseId],
      intents: [
        drawLine(`bis${h.p1}${h.vertex}${h.p2}`, 'angleBisector', {
          p1: h.p1,
          vertex: h.vertex,
          p2: h.p2,
        }) as IntentT,
      ],
    }));
  },
};
