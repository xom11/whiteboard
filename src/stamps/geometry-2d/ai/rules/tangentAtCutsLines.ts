// src/stamps/geometry-2d/ai/rules/tangentAtCutsLines.ts
//
// "Tiếp tuyến của (O) tại C cắt AD, AB lần lượt tại P, Q"
//   → draw-line tC (tangentAt C của đường tròn) + P=tC∩AD, Q=tC∩AB.
//
// Bổ sung tangentAt (vốn chỉ bắt "tiếp tuyến TẠI X …", bỏ lỡ "tiếp tuyến CỦA
// (O) tại X cắt …"). Chấp nhận cả 2 thứ tự "của (O) tại C" và "tại C của (O)".
// Đường tròn lấy từ toàn đề (1 "(O)"/"tâm O" duy nhất).
//
// \b không khớp ký tự Việt → (?!\p{L}) + cờ 'u'.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawLine } from './_shared';

const PREFILTER = /[Tt]iếp\s*tuyến[^.]{0,30}?tại\s+[A-Z][^.]{0,40}?cắt|Qua\s+(?:điểm\s+)?[A-Z][^.]{0,40}?tiếp\s*tuyến[^.]{0,20}?cắt/u;
const CIRCLE_REF = /đường\s*tròn\s*(?:tâm\s+)?\(?\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)?/u;
const UNNAMED_DIAMETER = /(?:nửa\s+)?đường\s*tròn\s+đường\s*kính\s+([A-Z])([A-Z])(?![A-Z])/u;

// "Qua (điểm)? M … (kẻ)? tiếp tuyến (thứ ba)? cắt (các tiếp tuyến)? Ax, By (lần
// lượt)? (ở|tại) C, D" → tiếp tuyến TẠI M (M trên đường tròn) cắt 2 tia → C,D.
// group1=M(tiếp điểm), 2+3=2 đường/tia bị cắt, 4+5=2 giao điểm.
const QUA_RE = new RegExp(
  'Qua\\s+(?:điểm\\s+)?([A-Z])(?!\\p{L})[^.]{0,40}?tiếp\\s*tuyến\\s+(?:thứ\\s+(?:ba|3|hai|2)\\s+)?cắt\\s+' +
    '(?:các\\s+)?(?:(?:các\\s+)?tiếp\\s*tuyến\\s+|đường\\s*thẳng\\s+|cạnh\\s+)?' +
    '([A-Z](?:[A-Z]|[xyzt]))\\s*(?:,|và)\\s*([A-Z](?:[A-Z]|[xyzt]))(?!\\p{L})(?:\\s+kéo\\s+dài)?\\s+(?:lần\\s*lượt\\s+)?(?:ở|tại)\\s+([A-Z])\\s*(?:,|và)\\s*(?:(?:tại|ở)\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

// SINGLE: "Tiếp tuyến tại A (của (O))? cắt (tia)? BC tại D" → 1 đường + 1 giao.
//   group1=tiếp điểm, group2=đường bị cắt (1-2 ký tự), group3=giao điểm.
const SINGLE_RE = new RegExp(
  '[Tt]iếp\\s*tuyến\\s+(?:của\\s+[^.]{0,14}?\\s+)?tại\\s+(?:điểm\\s+)?([A-Z])(?!\\p{L})' +
    '(?:\\s+của\\s+[^.]{0,14}?)?\\s+cắt\\s+(?:tia\\s+|đường\\s*thẳng\\s+|cạnh\\s+|đoạn\\s+)?' +
    '([A-Z]{1,2})(?![A-Z])\\s+(?:tại|ở)\\s+([A-Z])(?![A-Z])',
  'gu',
);

// group1 = tangent point, 2+3 = 2 đường bị cắt, 4+5 = 2 giao điểm.
// - "của|với" cho cụm circle SAU tiếp điểm ("tiếp tuyến tại C với đường tròn cắt …").
// - "kéo dài" optional sau cặp đường ("AD kéo dài lần lượt tại …").
// - cho phép "tại|ở" lặp lại trước giao-điểm thứ hai ("tại E và tại F").
const RE = new RegExp(
  '[Tt]iếp\\s*tuyến\\s+(?:(?:của|với)\\s+[^.]{0,14}?\\s+)?tại\\s+(?:điểm\\s+)?([A-Z])(?!\\p{L})' +
    '(?:\\s+(?:của|với)\\s+[^.]{0,14}?)?\\s+cắt\\s+(?:các\\s+)?(?:(?:các\\s+)?tiếp\\s*tuyến\\s+|đường\\s*thẳng\\s+|cạnh\\s+)?' +
    // Đường bị cắt: cặp đỉnh "AD" HOẶC token tia đã đặt tên "Ax"/"By" (1 HOA +
    // x/y/z/t). tangentRay dựng tia Ax,By (priority 63>62) trước → giao hợp lệ.
    '([A-Z](?:[A-Z]|[xyzt]))\\s*(?:,|và)\\s*([A-Z](?:[A-Z]|[xyzt]))(?!\\p{L})(?:\\s+kéo\\s+dài)?\\s+(?:lần\\s*lượt\\s+)?(?:tại|ở)\\s+([A-Z])\\s*(?:,|và)\\s*(?:(?:tại|ở)\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

function circleName(problem: string): string | undefined {
  const m = CIRCLE_REF.exec(problem);
  if (m) return /đường\s*kính/u.test(problem) ? `${m[1]}_c` : m[1];
  // Không tâm đặt tên → đường tròn đường kính vô danh "kXY" (diameterCircleSecant).
  const dm = UNNAMED_DIAMETER.exec(problem);
  return dm ? `k${dm[1]}${dm[2]}` : undefined;
}

export const tangentAtCutsLinesRule: LanguageRule = {
  id: 'tangentAtCutsLines',
  priority: 62,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const circle = circleName(ctx.problem);
    if (!circle) return [];
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      let matchedTwo = false;

      // "Qua điểm M … tiếp tuyến thứ ba cắt Ax, By ở C, D" → tiếp tuyến tại M.
      QUA_RE.lastIndex = 0;
      for (const m of c.text.matchAll(QUA_RE)) {
        const at = m[1];
        const [l1, l2, p, q] = [m[2], m[3], m[4], m[5]];
        if (p === q || at === p || at === q) continue;
        matchedTwo = true;
        const t = `t${at}`;
        out.push({
          ruleId: 'tangentAtCutsLines',
          clauseIds: [c.id],
          intents: [
            drawLine(t, 'tangentAt', { through: at, circle }),
            addPoint(p, { kind: 'intersection', of: [t, l1] }),
            addPoint(q, { kind: 'intersection', of: [t, l2] }),
          ],
        });
      }

      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        matchedTwo = true;
        const at = m[1];
        const l1 = m[2];
        const l2 = m[3];
        const p = m[4];
        const q = m[5];
        if (p === q) continue;
        const t = `t${at}`;
        out.push({
          ruleId: 'tangentAtCutsLines',
          clauseIds: [c.id],
          intents: [
            drawLine(t, 'tangentAt', { through: at, circle }),
            addPoint(p, { kind: 'intersection', of: [t, l1] }),
            addPoint(q, { kind: 'intersection', of: [t, l2] }),
          ],
        });
      }
      // SINGLE chỉ khi clause KHÔNG khớp dạng 2-đường (tránh double-emit).
      if (matchedTwo) continue;
      SINGLE_RE.lastIndex = 0;
      for (const m of c.text.matchAll(SINGLE_RE)) {
        const at = m[1];
        const line = m[2];
        const z = m[3];
        if (line.includes(z) || line.includes(at)) continue;
        const t = `t${at}`;
        out.push({
          ruleId: 'tangentAtCutsLines',
          clauseIds: [c.id],
          intents: [
            drawLine(t, 'tangentAt', { through: at, circle }),
            addPoint(z, { kind: 'intersection', of: [t, line] }),
          ],
        });
      }
    }
    return out;
  },
};
