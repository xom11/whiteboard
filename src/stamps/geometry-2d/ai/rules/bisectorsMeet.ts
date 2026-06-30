// src/stamps/geometry-2d/ai/rules/bisectorsMeet.ts
//
// Điểm = GIAO của HAI tia PHÂN GIÁC góc.
//
//   "phân giác ∠DAB và ∠ABC cắt nhau tại M"
//     → bisDAB = angleBisector(D,A,B); bisABC = angleBisector(A,B,C);
//       M = bisDAB ∩ bisABC.
//
// Phân phối nhiều cặp trong 1 clause (C24 — tứ giác ABCD, 4 cặp phân giác giao
// nhau tại M,N,P,Q). matchAll quét từng cụm "phân giác … và … cắt nhau tại …".
//
// COMPOSE primitive sẵn (giống twoPerpLinesMeet): angleBisector (draw-line) +
// add-point intersection {of:[bisName1, bisName2]}. resolveSegmentRef trả nguyên
// tên shape → builder lấy giao 2 named-line. Tên bisector theo quy ước
// angleBisectorAngle ("bis"+3 chữ) → dedup JSON nếu angleBisectorAngle đã emit
// cùng tia (chỉ cần KHỚP name + payload).
//
// Nhận angle: ∠XYZ (glyph), "góc XYZ", HOẶC cụm 3-HOA TRẦN (OCR rớt glyph "∠" —
// C24 vế thứ hai của cặp M là "ABC" không có ∠). Angle ĐẦU phải có "∠"/"góc"
// (neo chắc sau "phân giác"); angle SAU (sau "và") cho phép trần. vertex = chữ
// GIỮA (3-point: p1=đầu, vertex=giữa, p2=cuối) — đồng quy ước angleBisectorAngle.
//
// Precision-first: cụm mangled OCR ("Z4DC", "ZGCBD" của cặp N) KHÔNG khớp
// (?:∠|góc)?[A-Z]{3} sạch → tự bỏ qua (escalate điểm N), KHÔNG đoán bừa.
//
// GOTCHA \b: ký tự Việt → cờ 'u' + (?!\p{L}).
import type { LanguageRule, RuleMatch } from './_types';
import type { IntentT } from '../intent';
import { addPoint, drawLine } from './_shared';

// Cụm 3-HOA liền, optional "∠"/"góc" trước; (?![A-Z]) chặn cụm 4+ ký tự.
// Angle ĐẦU: BẮT BUỘC "∠" hoặc "góc" (anchor sau "phân giác" — tránh nuốt cụm
// HOA bất kỳ). Angle SAU: "∠"/"góc" optional (OCR rớt glyph).
const ANG_HEAD = '(?:∠\\s*|góc\\s+)([A-Z])([A-Z])([A-Z])(?![A-Z])';
const ANG_TAIL = '(?:∠\\s*|góc\\s+)?([A-Z])([A-Z])([A-Z])(?![A-Z])';

// "phân giác <ANG1> và <ANG2> cắt nhau (tại|ở) (điểm)? <P>".
const RE = new RegExp(
  '[Pp]hân\\s*giác\\s+' +
    ANG_HEAD +
    '\\s+và\\s+' +
    ANG_TAIL +
    '\\s+(?:cắt|giao)\\s+nhau\\s+(?:tại|ở)\\s+(?:điểm\\s+)?([A-Z])(?![A-Z])',
  'gu',
);

const PREFILTER = /[Pp]hân\s*giác[^.]{0,80}?(?:cắt|giao)\s+nhau\s+(?:tại|ở)/u;

export const bisectorsMeetRule: LanguageRule = {
  id: 'bisectorsMeet',
  // Trên intersection (45) để các tia phân giác (draw-line) + điểm giao gom cùng
  // 1 match; intent-layer order-retry topo lo thứ tự build. 49 = ngang
  // twoPerpLinesMeet (cùng họ "2 đường đặt-tên giao nhau").
  priority: 49,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      RE.lastIndex = 0;
      for (const m of c.text.matchAll(RE)) {
        const a1 = [m[1], m[2], m[3]] as const; // p1, vertex, p2 (góc 1)
        const a2 = [m[4], m[5], m[6]] as const; // p1, vertex, p2 (góc 2)
        const p = m[7];
        const n1 = `bis${a1[0]}${a1[1]}${a1[2]}`;
        const n2 = `bis${a2[0]}${a2[1]}${a2[2]}`;
        const intents: IntentT[] = [
          drawLine(n1, 'angleBisector', { p1: a1[0], vertex: a1[1], p2: a1[2] }),
          drawLine(n2, 'angleBisector', { p1: a2[0], vertex: a2[1], p2: a2[2] }),
        ];
        // Điểm giao: bỏ qua nếu tên giao trùng đỉnh của 1 trong 2 góc (degenerate
        // / vòng định nghĩa) hoặc 2 tia trùng tên (cùng 1 góc). Fail-safe: vẫn
        // emit 2 tia phân giác (dedup), chỉ KHÔNG dựng điểm giao vô nghĩa.
        const angleLetters = new Set([...a1, ...a2]);
        if (n1 !== n2 && !angleLetters.has(p)) {
          intents.push(addPoint(p, { kind: 'intersection', of: [n1, n2] }));
        }
        out.push({ ruleId: 'bisectorsMeet', clauseIds: [c.id], intents });
      }
    }
    return out;
  },
};
