// src/stamps/geometry-2d/ai/validator.ts
//
// Keyword→kind validator. Sau khi LLM emit DSL, scan đề bài tiếng Việt để
// detect các keyword bắt buộc (trung điểm, chân đường cao, trọng tâm, ...),
// rồi verify DSL có chứa kind tương ứng. Nếu thiếu → trả về missing kinds +
// hint để retry hoặc cảnh báo.
//
// Mục đích: bù lại bias của LLM nhỏ (Gemma 4B) hay output `free` với coord
// tự compute thay vì derived kind. Model-agnostic safety net — không phụ
// thuộc provider.

import type { DslInputT } from '../dsl/schema';

interface KeywordRule {
  /** Tên rule cho debug. */
  readonly id: string;
  /** Regex pattern (case-insensitive) match đề bài. */
  readonly patterns: readonly RegExp[];
  /** Kind BẮT BUỘC phải xuất hiện trong DSL khi rule trigger. */
  readonly expectedKind: string;
  /** Hint tiếng Việt để inject vào retry user prompt. */
  readonly hint: string;
}

// Order matters: rule cụ thể đặt trước rule chung (vd "trung trực" trước
// "trung điểm" để không match nhầm).
const KEYWORD_RULES: readonly KeywordRule[] = [
  {
    id: 'perp-bisector',
    patterns: [/trung\s*trực/i, /đường\s+trung\s+trực/i],
    expectedKind: 'perpBisector',
    hint: 'Đề có "trung trực" → dùng kind:"perpBisector" cho đường thẳng đó, KHÔNG dùng line + 2 free points.',
  },
  {
    id: 'midpoint',
    patterns: [/trung\s*điểm/i, /điểm\s+giữa/i],
    expectedKind: 'midpoint',
    hint: 'Đề có "trung điểm" → dùng kind:"midpoint" với p1, p2 là 2 điểm đầu mút. TUYỆT ĐỐI KHÔNG dùng free với coord trung bình.',
  },
  {
    id: 'perp-foot',
    patterns: [
      /chân\s+(của\s+)?đường\s+cao/i,
      /chân\s+(của\s+)?đường\s+vuông\s+góc/i,
      /hình\s*chiếu\s+vuông\s+góc/i,
    ],
    expectedKind: 'perpFoot',
    hint: 'Đề có "chân đường cao" / "hình chiếu vuông góc" → dùng kind:"perpFoot" với from + onLine.',
  },
  {
    id: 'centroid',
    patterns: [/trọng\s*tâm/i],
    expectedKind: 'centroid',
    hint: 'Đề có "trọng tâm" → dùng kind:"centroid" với vertices:[A,B,C], KHÔNG free.',
  },
  {
    id: 'orthocenter',
    patterns: [/trực\s*tâm/i],
    expectedKind: 'orthocenter',
    hint: 'Đề có "trực tâm" → dùng kind:"orthocenter" với vertices:[A,B,C], KHÔNG free.',
  },
  {
    id: 'incenter',
    patterns: [
      /tâm\s+nội\s*tiếp/i,
      /đường\s+tròn\s+nội\s*tiếp.*tam\s*giác/i,
      /nội\s*tiếp.*tam\s*giác.*tâm/i,
    ],
    expectedKind: 'incenter',
    hint: 'Đề có "tâm nội tiếp" → dùng kind:"incenter" với vertices:[A,B,C].',
  },
  {
    id: 'circumcenter',
    patterns: [
      /ngoại\s*tiếp/i,
      /tâm\s+(đường\s+tròn\s+)?ngoại\s*tiếp/i,
    ],
    expectedKind: 'circumcenter',
    hint: 'Đề có "ngoại tiếp" → dùng kind:"circumcenter" cho tâm O.',
  },
  {
    id: 'angle-bisector',
    patterns: [/phân\s*giác/i, /tia\s+phân\s+giác/i],
    expectedKind: 'angleBisector',
    hint: 'Đề có "phân giác" → dùng shape kind:"angleBisector" với p1, vertex, p2, KHÔNG line(2 free).',
  },
  {
    id: 'tangent',
    patterns: [/tiếp\s*tuyến/i],
    expectedKind: 'tangent',
    hint: 'Đề có "tiếp tuyến" → dùng kind:"tangent" với throughPoint + toCircle.',
  },
  {
    id: 'circle3',
    patterns: [
      /đường\s*tròn\s+(đi\s+)?qua\s+(3|ba)\s+điểm/i,
      /đường\s*tròn\s+ngoại\s*tiếp\s+tam\s*giác/i,
    ],
    expectedKind: 'circle3',
    hint: 'Đề có "đường tròn qua 3 điểm" / "ngoại tiếp tam giác" → dùng kind:"circle3" cho đường tròn.',
  },
  {
    id: 'parallel',
    patterns: [
      /(đường\s+thẳng|tia|đoạn)?\s*qua\s+\S+\s+song\s*song/i,
      /song\s*song\s+(với\s+)?\S+/i,
    ],
    expectedKind: 'parallel',
    hint: 'Đề có "song song qua điểm" → dùng shape kind:"parallel" với throughPoint + toLine.',
  },
  {
    id: 'perpendicular',
    patterns: [
      /(đường\s+thẳng|tia|đoạn)?\s*qua\s+\S+\s+vuông\s*góc/i,
      /vuông\s*góc\s+với\s+\S+\s+(tại|qua)/i,
    ],
    expectedKind: 'perpendicular',
    hint: 'Đề có "qua điểm vuông góc đường thẳng" → dùng shape kind:"perpendicular" với throughPoint + toLine.',
  },
  {
    id: 'intersection',
    patterns: [
      /giao\s+điểm/i,
      /cắt\s+nhau\s+tại/i,
      /(hai|2)\s+đường\s+(thẳng|tròn).*cắt/i,
    ],
    expectedKind: 'intersection',
    hint: 'Đề có "giao điểm" / "cắt nhau tại" → dùng kind:"intersection" với ref1, ref2.',
  },
];

export interface ValidatorIssue {
  readonly ruleId: string;
  readonly expectedKind: string;
  readonly hint: string;
}

export interface ValidatorResult {
  readonly ok: boolean;
  /** Các keyword đã trigger nhưng kind tương ứng KHÔNG xuất hiện trong DSL. */
  readonly missing: readonly ValidatorIssue[];
  /** Các keyword đã trigger và kind đã có (debug). */
  readonly satisfied: readonly string[];
}

// -----------------------------------------------------------------------------
// Concrete DSL stub extraction (Hướng A).
//
// Detect pattern "X là <keyword>" trong đề bài → trả về JSON stub (point +
// dependency shapes) để inject vào retry hint. 4B chỉ cần copy stub thay vì
// tự suy ra format. Cùng infrastructure dùng cho deterministic completion
// (Hướng B) sau này.
// -----------------------------------------------------------------------------

export interface PointStub {
  readonly name: string;
  readonly kind: string;
  /** Fields ngoài name, kind (vd p1, p2, vertices, from, onLine, …). */
  readonly fields: Readonly<Record<string, unknown>>;
}

export interface ShapeStub {
  readonly name: string;
  readonly kind: string;
  readonly fields: Readonly<Record<string, unknown>>;
}

export interface RequirementExtraction {
  /** Points BẮT BUỘC suy ra từ đề bài. */
  readonly points: readonly PointStub[];
  /** Shapes BẮT BUỘC (vd segment BC cho perpFoot onLine='BC'). */
  readonly shapes: readonly ShapeStub[];
}

/**
 * Quét đề bài tiếng Việt → trả về stub point/shape cụ thể.
 *
 * Best-effort regex extraction. Không match được → returns empty arrays
 * (caller fallback về hint generic).
 */
export function extractRequirements(userPrompt: string): RequirementExtraction {
  const points: PointStub[] = [];
  const shapes: ShapeStub[] = [];

  const triVertices = detectTriangleVertices(userPrompt);

  // M là trung điểm BC  /  trung điểm M của BC  /  M trung điểm cạnh BC
  const mid = userPrompt.match(
    /([A-Z])\s+(?:là\s+|=\s+|,\s+)?trung\s*điểm\s+(?:của\s+(?:cạnh\s+|đoạn\s+)?)?(?:cạnh\s+|đoạn\s+)?([A-Z])([A-Z])/i,
  );
  if (mid) {
    points.push({
      name: up(mid[1]),
      kind: 'midpoint',
      fields: { p1: up(mid[2]), p2: up(mid[3]) },
    });
  }

  // H là chân đường cao kẻ từ A xuống BC  /  chân đường vuông góc từ A đến BC
  // Full explicit pattern. Track tên để tránh duplicate ở named-cevian block.
  const seenCevianFeet = new Set<string>(); // tên foot point đã extract
  const foot = userPrompt.match(
    /([A-Z])\s+(?:là\s+)?chân\s+(?:của\s+)?đường\s+(?:cao|vuông\s*góc)[^A-Za-z]*?(?:kẻ\s+)?(?:từ\s+)?([A-Z])[^A-Za-z]*?(?:xuống|đến|tới)\s+(?:cạnh\s+|đoạn\s+)?([A-Z])([A-Z])/i,
  );
  if (foot) {
    const footName = up(foot[1]);
    const vertexName = up(foot[2]);
    const lineId = up(foot[3]) + up(foot[4]);
    points.push({
      name: footName,
      kind: 'perpFoot',
      fields: { from: vertexName, onLine: lineId },
    });
    shapes.push({
      name: lineId,
      kind: 'segment',
      fields: { p1: up(foot[3]), p2: up(foot[4]) },
    });
    // Segment AH (đường cao visible) — đoạn từ đỉnh đến chân. Đây là cái
    // user thật sự muốn THẤY khi viết "đường cao".
    shapes.push({
      name: vertexName + footName,
      kind: 'segment',
      fields: { p1: vertexName, p2: footName },
    });
    seenCevianFeet.add(footName);
  }

  // -----------------------------------------------------------------------
  // Named-cevian patterns (real-world phrasing).
  //
  // User thường viết tên cevian dạng VF (đỉnh + chân), vd "đường cao AH",
  // "AM là trung tuyến", "vẽ phân giác AD". Patterns dưới cover các phrasing
  // phổ biến. Cần triangle context để suy ra cạnh đối diện.
  // -----------------------------------------------------------------------

  if (triVertices && triVertices.length === 3) {
    const cevianMatches: Array<{
      vertex: string;
      foot: string;
      type: 'altitude' | 'median' | 'bisector';
    }> = [];

    const cevianTypes: Array<{
      type: 'altitude' | 'median' | 'bisector';
      patterns: readonly RegExp[];
    }> = [
      {
        type: 'altitude',
        patterns: [
          /đường\s*cao\s+([A-Z])([A-Z])(?![A-Z])/i,
          /\b([A-Z])([A-Z])\s+(?:là\s+|=\s+)?đường\s*cao/i,
          /(?:kẻ|vẽ|hạ|dựng)\s+đường\s*cao\s+([A-Z])([A-Z])(?![A-Z])/i,
        ],
      },
      {
        type: 'median',
        patterns: [
          /trung\s*tuyến\s+([A-Z])([A-Z])(?![A-Z])/i,
          /\b([A-Z])([A-Z])\s+(?:là\s+|=\s+)?trung\s*tuyến/i,
          /(?:kẻ|vẽ|dựng)\s+trung\s*tuyến\s+([A-Z])([A-Z])(?![A-Z])/i,
        ],
      },
      {
        type: 'bisector',
        patterns: [
          /(?:đường\s*phân\s*giác|tia\s+phân\s*giác|phân\s*giác)\s+([A-Z])([A-Z])(?![A-Z])/i,
          /\b([A-Z])([A-Z])\s+(?:là\s+|=\s+)?(?:đường\s*|tia\s+)?phân\s*giác/i,
          /(?:kẻ|vẽ|dựng)\s+(?:đường\s*|tia\s+)?phân\s*giác\s+([A-Z])([A-Z])(?![A-Z])/i,
        ],
      },
    ];

    for (const cp of cevianTypes) {
      for (const re of cp.patterns) {
        const m = userPrompt.match(re);
        if (!m) continue;
        const vertex = up(m[1]);
        const footName = up(m[2]);
        // Vertex phải nằm trong triangle vertices (else có thể match nhầm
        // pair khác như "BD" trong "BD cắt").
        if (!triVertices.includes(vertex)) continue;
        if (seenCevianFeet.has(footName)) continue;
        cevianMatches.push({ vertex, foot: footName, type: cp.type });
        seenCevianFeet.add(footName);
        break;
      }
    }

    for (const c of cevianMatches) {
      const opp = triVertices.filter((v) => v !== c.vertex);
      if (opp.length !== 2) continue;
      const baseSegmentName = opp[0] + opp[1];
      const cevianSegName = c.vertex + c.foot;

      // Đảm bảo base segment có (mọi cevian đều cần để reference).
      if (!shapes.some((s) => s.name === baseSegmentName)) {
        shapes.push({
          name: baseSegmentName,
          kind: 'segment',
          fields: { p1: opp[0], p2: opp[1] },
        });
      }

      if (c.type === 'altitude') {
        points.push({
          name: c.foot,
          kind: 'perpFoot',
          fields: { from: c.vertex, onLine: baseSegmentName },
        });
      } else if (c.type === 'median') {
        points.push({
          name: c.foot,
          kind: 'midpoint',
          fields: { p1: opp[0], p2: opp[1] },
        });
      } else {
        // bisector: foot là giao của đường phân giác với cạnh đối diện
        const bisLineName = 'bis' + c.vertex;
        if (!shapes.some((s) => s.name === bisLineName)) {
          shapes.push({
            name: bisLineName,
            kind: 'angleBisector',
            fields: { p1: opp[0], vertex: c.vertex, p2: opp[1] },
          });
        }
        points.push({
          name: c.foot,
          kind: 'intersection',
          fields: { ref1: bisLineName, ref2: baseSegmentName },
        });
      }

      // Đoạn cevian visible (AH/AM/AD) — cái user muốn thấy.
      shapes.push({
        name: cevianSegName,
        kind: 'segment',
        fields: { p1: c.vertex, p2: c.foot },
      });
    }
  }

  if (triVertices) {
    // G là trọng tâm  /  trọng tâm G của tam giác
    const centroid = userPrompt.match(/([A-Z])\s+(?:là\s+)?trọng\s*tâm/i);
    if (centroid) {
      points.push({
        name: up(centroid[1]),
        kind: 'centroid',
        fields: { vertices: triVertices },
      });
    } else if (/trọng\s*tâm/i.test(userPrompt)) {
      // Đề chỉ nói "dựng trọng tâm" không gán tên → default G.
      points.push({
        name: 'G',
        kind: 'centroid',
        fields: { vertices: triVertices },
      });
    }

    // H là trực tâm — KHÔNG match nếu đề có "trung trực" (đã đặt rule mid trước).
    const ortho = userPrompt.match(/([A-Z])\s+(?:là\s+)?trực\s*tâm/i);
    if (ortho) {
      points.push({
        name: up(ortho[1]),
        kind: 'orthocenter',
        fields: { vertices: triVertices },
      });
    } else if (/trực\s*tâm/i.test(userPrompt)) {
      points.push({
        name: 'H',
        kind: 'orthocenter',
        fields: { vertices: triVertices },
      });
    }

    // Disambiguate circumcircle vs incircle ("nội tiếp" có 2 nghĩa ngược nhau
    // tuỳ ngữ cảnh):
    //   - "tam giác X nội tiếp đường tròn" / "đường tròn ngoại tiếp tam giác"
    //     → circumcircle, O = circumcenter
    //   - "đường tròn nội tiếp tam giác" / "tâm nội tiếp"
    //     → incircle, I = incenter

    const circumPattern =
      /tam\s*giác\s+[A-Z]+\s+nội\s*tiếp\s+đường\s*tròn/i.test(userPrompt) ||
      /đường\s*tròn\s+ngoại\s*tiếp\s+tam\s*giác/i.test(userPrompt) ||
      /ngoại\s*tiếp/i.test(userPrompt);

    const incirclePattern =
      /đường\s*tròn\s+nội\s*tiếp\s+tam\s*giác/i.test(userPrompt) ||
      /tâm\s+nội\s*tiếp/i.test(userPrompt);

    if (circumPattern) {
      // "tâm O" sau "đường tròn" → tên tâm; default O.
      const oMatch =
        userPrompt.match(/đường\s*tròn[^A-Z]*?tâm\s+([A-Z])/i) ||
        userPrompt.match(/tâm\s+([A-Z])/);
      const oName = oMatch ? up(oMatch[1]) : 'O';
      points.push({
        name: oName,
        kind: 'circumcenter',
        fields: { vertices: triVertices },
      });
      shapes.push({
        name: 'omega',
        kind: 'circle3',
        fields: { p1: triVertices[0], p2: triVertices[1], p3: triVertices[2] },
      });
    }

    if (incirclePattern) {
      // "tâm I" theo nhiều order: "tâm I" sau "nội tiếp", hoặc trước.
      const iMatch =
        userPrompt.match(/nội\s*tiếp[^A-Z]*?tâm\s+([A-Z])/i) ||
        userPrompt.match(/tâm\s+([A-Z]).*nội\s*tiếp/i);
      const iName = iMatch ? up(iMatch[1]) : 'I';
      points.push({
        name: iName,
        kind: 'incenter',
        fields: { vertices: triVertices },
      });
    }
  }

  // Đường tròn qua 3 điểm A, B, C
  const c3 = userPrompt.match(
    /đường\s*tròn\s+(?:đi\s+)?qua\s+(?:3|ba)\s+điểm\s+([A-Z])[,\s]+([A-Z])[,\s]+([A-Z])/i,
  );
  if (c3) {
    shapes.push({
      name: 'k',
      kind: 'circle3',
      fields: { p1: up(c3[1]), p2: up(c3[2]), p3: up(c3[3]) },
    });
  }

  return { points, shapes };
}

function up(s: string): string {
  return s.toUpperCase();
}

function detectTriangleVertices(prompt: string): readonly string[] | null {
  const m = prompt.match(/tam\s*giác\s+([A-Z])([A-Z])([A-Z])/i);
  if (!m) return null;
  return [up(m[1]), up(m[2]), up(m[3])];
}

// -----------------------------------------------------------------------------
// Deterministic completion (Hướng B).
//
// Áp dụng extractRequirements(prompt) → inject/replace point/shape vào DSL
// TRƯỚC khi transpile. Mục tiêu:
//   1. Cứu round 1 transpile_error khi LLM output sai struct (vd centroid với
//      ref tới shape không tồn tại) — thay bằng stub đúng → transpile được.
//   2. Bỏ qua retry round 2 cho các case extraction cover được — tiết kiệm
//      latency + token.
//
// Safety:
//   - Chỉ apply khi name có trong extraction (match keyword pattern rõ).
//   - Nếu LLM đã emit point/shape ĐÚNG kind → no-op (skip).
//   - Nếu LLM emit cùng name nhưng kind SAI → REPLACE bằng stub.
// -----------------------------------------------------------------------------

export interface CompletionAction {
  readonly target: 'point' | 'shape';
  readonly name: string;
  readonly kind: string;
  readonly action: 'added' | 'replaced' | 'kept';
}

export interface CompletionResult {
  readonly dsl: DslInputT;
  readonly actions: readonly CompletionAction[];
}

/**
 * Inject/replace point + shape stubs từ extractRequirements vào DSL.
 * Trả về DSL mới (không mutate input) + log actions để debug.
 *
 * NOTE: Cast qua `unknown` vì DslPointT/DslShapeT là discriminated union với
 * field strict theo kind — stub construction từ Record<string,unknown> không
 * strictly assignable, nhưng schema.parse downstream re-validate, an toàn
 * runtime.
 */
export function applyDeterministicCompletion(
  userPrompt: string,
  dsl: DslInputT,
): CompletionResult {
  const extraction = extractRequirements(userPrompt);
  const actions: CompletionAction[] = [];

  type AnyPoint = DslInputT['points'][number];
  type AnyShape = DslInputT['shapes'][number];

  const points: AnyPoint[] = [...dsl.points];
  const shapes: AnyShape[] = [...dsl.shapes];

  for (const stub of extraction.points) {
    const idx = points.findIndex((p) => p.name === stub.name);
    const stubElement = {
      name: stub.name,
      kind: stub.kind,
      ...stub.fields,
    } as unknown as AnyPoint;
    if (idx >= 0) {
      if (points[idx].kind === stub.kind) {
        actions.push({
          target: 'point',
          name: stub.name,
          kind: stub.kind,
          action: 'kept',
        });
        continue;
      }
      points[idx] = stubElement;
      actions.push({
        target: 'point',
        name: stub.name,
        kind: stub.kind,
        action: 'replaced',
      });
    } else {
      points.push(stubElement);
      actions.push({
        target: 'point',
        name: stub.name,
        kind: stub.kind,
        action: 'added',
      });
    }
  }

  for (const stub of extraction.shapes) {
    const idx = shapes.findIndex((s) => s.name === stub.name);
    const stubElement = {
      name: stub.name,
      kind: stub.kind,
      ...stub.fields,
    } as unknown as AnyShape;
    if (idx >= 0) {
      if (shapes[idx].kind === stub.kind) {
        actions.push({
          target: 'shape',
          name: stub.name,
          kind: stub.kind,
          action: 'kept',
        });
        continue;
      }
      shapes[idx] = stubElement;
      actions.push({
        target: 'shape',
        name: stub.name,
        kind: stub.kind,
        action: 'replaced',
      });
    } else {
      shapes.push(stubElement);
      actions.push({
        target: 'shape',
        name: stub.name,
        kind: stub.kind,
        action: 'added',
      });
    }
  }

  return {
    dsl: { ...dsl, points, shapes },
    actions,
  };
}

/**
 * Quét đề bài + DSL output. Trả về missing kinds nếu LLM bỏ qua từ khoá
 * MANDATORY. Không throw — caller quyết định retry hay chỉ warning.
 */
export function validateKindCoverage(
  userPrompt: string,
  dsl: DslInputT,
): ValidatorResult {
  const allKinds = new Set<string>([
    ...dsl.points.map((p) => p.kind),
    ...dsl.shapes.map((s) => s.kind),
  ]);
  const missing: ValidatorIssue[] = [];
  const satisfied: string[] = [];
  const seen = new Set<string>();
  for (const rule of KEYWORD_RULES) {
    if (seen.has(rule.expectedKind)) continue;
    const triggered = rule.patterns.some((rx) => rx.test(userPrompt));
    if (!triggered) continue;
    seen.add(rule.expectedKind);
    if (allKinds.has(rule.expectedKind)) {
      satisfied.push(rule.expectedKind);
    } else {
      missing.push({
        ruleId: rule.id,
        expectedKind: rule.expectedKind,
        hint: rule.hint,
      });
    }
  }
  return { ok: missing.length === 0, missing, satisfied };
}

/**
 * Build hint string để inject vào retry user prompt khi validator phát hiện
 * missing kinds. Nếu pass `extraction`, hint sẽ kèm JSON stub copy-paste-ready
 * cho từng point/shape thiếu — 4B chỉ cần paste vào output.
 */
export function buildRetryHint(
  missing: readonly ValidatorIssue[],
  extraction?: RequirementExtraction,
): string {
  if (missing.length === 0) return '';

  // Stub block (nếu có extraction): JSON cụ thể.
  const missingKinds = new Set(missing.map((m) => m.expectedKind));
  const stubPoints =
    extraction?.points.filter((p) => missingKinds.has(p.kind)) ?? [];
  // Include shapes if: (a) kind is missing, OR (b) some included point
  // references them via `onLine` / `toLine` / `toCircle` (forward dep).
  const refNames = new Set<string>();
  for (const p of stubPoints) {
    for (const v of Object.values(p.fields)) {
      if (typeof v === 'string') refNames.add(v);
    }
  }
  const stubShapes =
    extraction?.shapes.filter(
      (s) => missingKinds.has(s.kind) || refNames.has(s.name),
    ) ?? [];

  const blocks: string[] = ['SỬA LẠI: output trước thiếu kind BẮT BUỘC theo đề bài.'];

  if (stubPoints.length > 0 || stubShapes.length > 0) {
    blocks.push('CÁC ELEMENT BẮT BUỘC PHẢI CÓ TRONG OUTPUT (copy-paste vào DSL):');
    for (const p of stubPoints) {
      blocks.push(
        `POINT: ${JSON.stringify({ name: p.name, kind: p.kind, ...p.fields })}`,
      );
    }
    for (const s of stubShapes) {
      blocks.push(
        `SHAPE: ${JSON.stringify({ name: s.name, kind: s.kind, ...s.fields })}`,
      );
    }
  }

  // Generic text hint cho các missing không có stub cụ thể.
  const hintedKinds = new Set([
    ...stubPoints.map((p) => p.kind),
    ...stubShapes.map((s) => s.kind),
  ]);
  const remaining = missing.filter((m) => !hintedKinds.has(m.expectedKind));
  if (remaining.length > 0) {
    blocks.push('Ngoài ra:');
    remaining.forEach((m, i) => blocks.push(`${i + 1}. ${m.hint}`));
  }

  blocks.push('Emit lại JSON envelope đầy đủ. Giữ nguyên các point/shape khác đã đúng.');
  return blocks.join('\n');
}
