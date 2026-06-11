// src/stamps/geometry-2d/ai/rules/rightAngleViewing.ts
//
// "Góc vuông nhìn đoạn": điểm V trên đường L sao cho ∠aVb = 90° (hoặc Va ⊥ Vb)
//   → addPoint(V, { kind:'rightAngleViewing', a, b, onLine: L })
// Builder dựng midpoint(ab) ẩn + đường tròn đường kính ab ẩn (Thales) + giao
// L ∩ circle — xem intent-builders/add-point/rightAngleViewing.ts.
//
// Port từ completeRightAngle.ts (Stage 1.5c của pipeline cũ — chết dead-code khi
// xoá path DSL free-form 2026-06-09) thành rule chính quy để Track A tự dựng.
// Khác bản cũ: (1) token đường sau "trên/thuộc" phải đứng RỜI ((?![\p{L}\d]))
// — bản cũ nuốt "đường tròn" thành "tr"; (2) [A-Z] không kèm cờ i (tên điểm
// phải HOA thật); (3) chặn vertex dính vào cụm in hoa khác ((?<!\p{L})).
//
// Priority 63: TRÊN onSegmentPoint (62) để intent rightAngleViewing của V đứng
// trước intent onSegment cùng tên (builder add-point idempotent first-wins),
// DƯỚI onCirclePoint (64).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// ∠AMB = 90° / góc AMB = 90 độ / góc AMB bằng 90° / góc AMB vuông — vertex GIỮA.
const ANGLE_EQ_RE =
  /(?:[Gg]óc|∠)\s*([A-Z])\s*([A-Z])\s*([A-Z])\s*(?:=|bằng|là)?\s*90\s*(?:°|độ|o(?![A-Za-z]))/u;
const ANGLE_VUONG_RE = /(?:[Gg]óc|∠)\s*([A-Z])\s*([A-Z])\s*([A-Z])\s*vuông/u;
// MA ⊥ MB / MA vuông góc (với) MB — vertex = chữ CHUNG của 2 cặp.
const PERP_RE = /([A-Z])([A-Z])\s*(?:⊥|vuông\s*góc(?:\s*với)?)\s*([A-Z])([A-Z])(?![A-Z])/u;

interface RightAngleSpec {
  vertex: string;
  a: string;
  b: string;
  onLine: string;
}

/**
 * Đường mà `vertex` nằm trên: "V (là (một) điểm)? (nằm trên|trên|thuộc)
 * (đường thẳng|đường cao|cạnh|tia|đoạn)? <TOKEN>" — TOKEN 1-2 chữ cái đứng rời
 * (cặp đỉnh "CK" hoặc đường đặt tên thường "d"). KHÔNG nhận "đường tròn" (điểm
 * trên đường tròn là chuyện của onCirclePoint).
 */
function findOnLine(problem: string, vertex: string): string | null {
  const re = new RegExp(
    `(?<!\\p{L})${vertex}\\s*(?:là\\s+(?:một\\s+)?điểm\\s+)?(?:nằm\\s+trên|trên|thuộc)\\s+` +
      `(?:đường\\s*thẳng\\s+|đường\\s*cao\\s+|cạnh\\s+|tia\\s+|đoạn(?:\\s*thẳng)?\\s+)?` +
      `([A-Za-z][A-Za-z]?)(?![\\p{L}\\d])`,
    'u',
  );
  const m = re.exec(problem);
  return m ? m[1] : null;
}

function detectSpec(problem: string): RightAngleSpec | null {
  // 1. ∠/góc = 90 / vuông: vertex là chữ giữa.
  for (const re of [ANGLE_EQ_RE, ANGLE_VUONG_RE]) {
    const m = re.exec(problem);
    if (m) {
      const [, a, vertex, b] = m;
      if (a === b || a === vertex || b === vertex) continue;
      const onLine = findOnLine(problem, vertex);
      if (onLine) return { vertex, a, b, onLine };
    }
  }
  // 2. Perp 2 cặp chung đỉnh: chữ chung là vertex.
  const p = PERP_RE.exec(problem);
  if (p) {
    const [, x1, x2, y1, y2] = p;
    let vertex: string | null = null;
    let a: string | null = null;
    let b: string | null = null;
    if (x1 === y1) { vertex = x1; a = x2; b = y2; }
    else if (x1 === y2) { vertex = x1; a = x2; b = y1; }
    else if (x2 === y1) { vertex = x2; a = x1; b = y2; }
    else if (x2 === y2) { vertex = x2; a = x1; b = y1; }
    if (vertex && a && b && a !== b) {
      const onLine = findOnLine(problem, vertex);
      if (onLine) return { vertex, a, b, onLine };
    }
  }
  return null;
}

export const rightAngleViewingRule: LanguageRule = {
  id: 'rightAngleViewing',
  priority: 63,
  languages: ['vi'],
  patterns: [
    /(?:[Gg]óc|∠)[^.;\n]{0,18}90/u,
    /(?:[Gg]óc|∠)\s*[A-Z]{3}\s*vuông/u,
    /[A-Z]{2}\s*(?:⊥|vuông\s*góc)\s*[A-Z]{2}/u,
  ],
  match(ctx) {
    const spec = detectSpec(ctx.problem);
    if (!spec) return [];

    // Claim các clause chứa điều kiện góc-vuông hoặc mệnh đề trên-đường của vertex
    // (clause không-geo đã bị lọc khỏi ctx.clauses → claim [] vẫn hợp lệ).
    const clauseIds = ctx.clauses
      .filter(
        (c) =>
          ANGLE_EQ_RE.test(c.text) ||
          ANGLE_VUONG_RE.test(c.text) ||
          PERP_RE.test(c.text) ||
          findOnLine(c.text, spec.vertex) !== null,
      )
      .map((c) => c.id);

    const out: RuleMatch[] = [
      {
        ruleId: 'rightAngleViewing',
        clauseIds,
        intents: [
          addPoint(spec.vertex, {
            kind: 'rightAngleViewing',
            a: spec.a,
            b: spec.b,
            onLine: spec.onLine,
          }),
        ],
      },
    ];
    return out;
  },
};
