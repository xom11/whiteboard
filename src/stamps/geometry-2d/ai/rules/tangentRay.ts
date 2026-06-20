// src/stamps/geometry-2d/ai/rules/tangentRay.ts
//
// Tiếp tuyến TẠI đầu mút đường kính, ĐẶT TÊN bằng token tia (Ax/Bx/By):
//   "Kẻ tiếp tuyến Ax"            (Bài 7 — (O;R) đường kính AB)
//   "Kẻ tiếp tuyến Bx"           (Bài 9 — nửa đường tròn đường kính AB)
//   "Từ A và B kẻ hai tiếp tuyến Ax, By"
//
// Tiếp tuyến tại đầu mút A của đường kính AB = tiếp tuyến của đường tròn TẠI A.
// → draw-line kind tangentAt {through:<endpoint>, circle:'O'} đặt tên theo token
//   tia (Ax). Endpoint nằm TRÊN đường tròn nên tangentAt hợp lệ.
//
// Circle ref emit THÔ là chữ tâm "O" — resolveCircleNames map "O"→"O_c" (vì
// circleDiameter đặt circle "O_c" + point "O"; base "O" không phải circle thật).
//
// GOTCHA \b: regex chứa ký tự Việt dùng cờ 'u' + lookaround (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawLine } from './_shared';

// Prefilter: phải có "tiếp tuyến" + 1 token tia (chữ HOA + x/y/z/t thường).
const PREFILTER = /tiếp\s*tuyến\s+[A-Z][xyzt](?![A-Za-z])/u;

// Đường tròn đường kính: "(O; R) đường kính AB" / "(O) đường kính AB" / "tâm O
// đường kính AB". Lấy tâm O + 2 đầu mút đường kính (A,B) để validate token tia
// neo đúng đầu mút. circleDiameter dựng circle "O_c" + point O cho cả hai cách
// viết tâm (ngoặc lẫn "tâm O"); resolveCircleNames map "O"→"O_c".
const CIRCLE_CENTER = /\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)|tâm\s+([A-Z])(?![A-Za-z])/u;
const DIAMETER_ENDS = /đường\s*kính\s+([A-Z])([A-Z])(?![A-Z])/u;

// Token tia "Ax" = 1 chữ HOA (đầu mút) + 1 chữ thường x/y/z/t.
// "tiếp tuyến <list>" — bắt CỤM ngay sau "tiếp tuyến(s)" rồi quét mọi token tia
// trong cụm (xử lý cả dạng đơn "tiếp tuyến Ax" lẫn liệt kê "tiếp tuyến Ax, By").
const AFTER_TANGENT = /tiếp\s*tuyến\s+((?:[A-Z][xyzt](?![A-Za-z])\s*[,và\s]*)+)/gu;
const RAY_TOKEN = /([A-Z])([xyzt])(?![A-Za-z])/gu;

// Đỉnh CHO SẴN của 1 hình (tam giác/tứ giác … được "Cho/cho" với toạ độ tự do):
// nếu tiếp điểm là đỉnh hình cho-sẵn thì điểm đã có toạ độ → KHÔNG onCircle.
// CHỈ tính shape mở đầu bằng "Cho" (định nghĩa) — KHÔNG tính "Dựng/Vẽ hình …"
// (dựng từ điểm có sẵn, đỉnh = consumer; vd "Dựng hình bình hành AECD" dùng lại
// tiếp điểm A nên A vẫn cần onCircle).
const SHAPE_VERTICES =
  /[Cc]ho\s+(?:tam\s*giác|tứ\s*giác|hình\s+(?:vuông|chữ\s*nhật|thang|bình\s*hành|thoi))\s+([A-Z]{3,})/gu;

// Tiếp tuyến Ax với A là TIẾP ĐIỂM TỰ DO trên đường tròn trần "(O)" (không
// đường kính, A chưa định nghĩa) → A onCircle + tia tiếp tuyến tại A.
function matchFreeTangentPoint(
  ctx: { problem: string; clauses: readonly { id: number; text: string }[] },
  cm: RegExpExecArray | null,
): RuleMatch[] {
  const center = cm ? (cm[1] ?? cm[2]) : undefined;
  if (!center) return []; // không có đường tròn trần → bỏ
  // Tập đỉnh hình đã biết (đã có toạ độ) — tiếp điểm là đỉnh hình thì bỏ.
  const known = new Set<string>();
  SHAPE_VERTICES.lastIndex = 0;
  for (const m of ctx.problem.matchAll(SHAPE_VERTICES)) {
    for (const ch of m[1]) known.add(ch);
  }
  const out: RuleMatch[] = [];
  for (const c of ctx.clauses) {
    const intents: IntentT[] = [];
    const seen = new Set<string>();
    AFTER_TANGENT.lastIndex = 0;
    for (const grp of c.text.matchAll(AFTER_TANGENT)) {
      RAY_TOKEN.lastIndex = 0;
      for (const m of grp[1].matchAll(RAY_TOKEN)) {
        const endpoint = m[1];
        const token = `${m[1]}${m[2]}`;
        if (known.has(endpoint)) continue; // đỉnh hình → đã có toạ độ
        if (seen.has(token)) continue;
        seen.add(token);
        // A onCircle (tiếp điểm tự do) + tia tiếp tuyến tại A.
        intents.push(
          addPoint(endpoint, { kind: 'onCircle', circle: center, theta: 0.7 }),
          drawLine(token, 'tangentAt', { through: endpoint, circle: center }),
        );
      }
    }
    if (intents.length > 0) {
      out.push({ ruleId: 'tangent-ray', clauseIds: [c.id], intents });
    }
  }
  return out;
}

export const tangentRayRule: LanguageRule = {
  id: 'tangent-ray',
  // Cao hơn point-on-ray (55) + intersect-ray (48): token tia phải được dựng
  // TRƯỚC khi điểm-trên-tia / giao-với-tia tham chiếu nó (intentsToDsl xử lý
  // theo priority DESC, không topo-sort).
  priority: 63,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const cm = CIRCLE_CENTER.exec(ctx.problem);
    const dm = DIAMETER_ENDS.exec(ctx.problem);
    // KHÔNG có đường kính nhưng có đường tròn TRẦN "(O)"/"tâm O" → tiếp tuyến Ax
    // mà A là TIẾP ĐIỂM TỰ DO trên đường tròn (chưa được định nghĩa): dựng A
    // onCircle + tia tiếp tuyến tại A. Vd "Cho (O) và tiếp tuyến Ax." (vao10:168).
    if (!dm) return matchFreeTangentPoint(ctx, cm);
    // "(O)" → cm[1]; "tâm O" → cm[2]; KHÔNG tên tâm → đường tròn đường kính vô
    // danh "kXY" (diameterCircleSecant đặt tên vậy). Tiếp tuyến tại đầu mút A của
    // đường kính AB = tiếp tuyến tại A của đường tròn đó.
    const center = cm ? (cm[1] ?? cm[2]) : `k${dm[1]}${dm[2]}`;
    const ends = new Set([dm[1], dm[2]]);

    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      const intents: IntentT[] = [];
      const seen = new Set<string>();
      AFTER_TANGENT.lastIndex = 0;
      for (const grp of c.text.matchAll(AFTER_TANGENT)) {
        RAY_TOKEN.lastIndex = 0;
        for (const m of grp[1].matchAll(RAY_TOKEN)) {
          const endpoint = m[1];
          const token = `${m[1]}${m[2]}`;
          if (!ends.has(endpoint)) continue; // tia không neo đầu mút đường kính → bỏ
          if (seen.has(token)) continue;
          seen.add(token);
          intents.push(
            drawLine(token, 'tangentAt', { through: endpoint, circle: center }),
          );
        }
      }
      if (intents.length > 0) {
        out.push({ ruleId: 'tangent-ray', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
