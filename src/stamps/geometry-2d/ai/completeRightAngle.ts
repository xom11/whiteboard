// src/stamps/geometry-2d/ai/completeRightAngle.ts
//
// Stage 1.5c (deterministic): bắt cấu hình "góc vuông nhìn đoạn" trong đề
// tiếng Việt → đảm bảo có add-point intent với constraint rightAngleViewing.
// LLM thường không nhận ra cần dựng đường tròn đường kính (Thales) để đặt M,
// nên ta inject deterministic. Pure function, idempotent.
//
//   ∠ a-M-b = 90°  (hoặc Ma ⊥ Mb)  +  "M trên <LINE>"
//   → add-point M { kind: 'rightAngleViewing', a, b, onLine: LINE }

import type { IntentT } from './intent';

interface RightAngleSpec {
  vertex: string;
  a: string;
  b: string;
  onLine: string;
}

// ∠AMB = 90° / góc AMB = 90 độ / góc AMB vuông
const ANGLE_EQ_RE = /(?:góc|∠)\s*([A-Z])\s*([A-Z])\s*([A-Z])\s*(?:=|bằng|là)?\s*90\s*(?:°|độ|o\b)/i;
const ANGLE_VUONG_RE = /(?:góc|∠)\s*([A-Z])\s*([A-Z])\s*([A-Z])\s*vuông/i;
// MA ⊥ MB / MA vuông góc (với) MB
const PERP_RE = /([A-Z])([A-Z])\s*(?:⊥|vuông\s*góc(?:\s*với)?)\s*([A-Z])([A-Z])/i;

/** Tìm đường mà điểm `vertex` nằm trên: "M (là (một) điểm) trên|thuộc|nằm trên (đường…)? <LINE>". */
function findOnLine(problem: string, vertex: string): string | null {
  const re = new RegExp(
    `${vertex}\\s*(?:là\\s+(?:một\\s+)?điểm\\s+)?(?:trên|thuộc|nằm\\s+trên)\\s*` +
      `(?:đường\\s*thẳng|đường\\s*cao|đường|cạnh|tia)?\\s*([A-Za-z]{1,2})`,
    'i',
  );
  const m = problem.match(re);
  if (!m) return null;
  return m[1];
}

function detectSpec(problem: string): RightAngleSpec | null {
  // 1. Angle = 90 / vuông: vertex là chữ GIỮA.
  for (const re of [ANGLE_EQ_RE, ANGLE_VUONG_RE]) {
    const m = problem.match(re);
    if (m) {
      const [, a, vertex, b] = m;
      const onLine = findOnLine(problem, vertex);
      if (onLine) return { vertex, a, b, onLine };
    }
  }
  // 2. Perp: chữ chung của 2 cặp là vertex.
  const p = problem.match(PERP_RE);
  if (p) {
    const [, x1, x2, y1, y2] = p;
    let vertex: string | null = null;
    let a: string | null = null;
    let b: string | null = null;
    if (x1 === y1) { vertex = x1; a = x2; b = y2; }
    else if (x1 === y2) { vertex = x1; a = x2; b = y1; }
    else if (x2 === y1) { vertex = x2; a = x1; b = y2; }
    else if (x2 === y2) { vertex = x2; a = x1; b = y1; }
    if (vertex && a && b) {
      const onLine = findOnLine(problem, vertex);
      if (onLine) return { vertex, a, b, onLine };
    }
  }
  return null;
}

export function completeRightAngle(
  intents: readonly IntentT[],
  problem: string,
): IntentT[] {
  const spec = detectSpec(problem);
  if (!spec) return [...intents];

  const injected: IntentT = {
    op: 'add-point',
    name: spec.vertex,
    constraint: { kind: 'rightAngleViewing', a: spec.a, b: spec.b, onLine: spec.onLine },
  };

  const idx = intents.findIndex((i) => i.op === 'add-point' && i.name === spec.vertex);
  if (idx === -1) {
    // inject ở cuối (sau khi các điểm phụ thuộc onLine đã được định nghĩa)
    return [...intents, injected];
  }

  const existing = intents[idx];
  if (existing.op === 'add-point' && existing.constraint.kind === 'rightAngleViewing') {
    return [...intents]; // keep
  }
  // replace in place
  const out = [...intents];
  out[idx] = injected;
  return out;
}
