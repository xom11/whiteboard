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
 * missing kinds. Format: numbered list các hint cụ thể.
 */
export function buildRetryHint(missing: readonly ValidatorIssue[]): string {
  if (missing.length === 0) return '';
  const items = missing.map((m, i) => `${i + 1}. ${m.hint}`).join('\n');
  return [
    'SỬA LẠI: output trước thiếu kind BẮT BUỘC theo đề bài.',
    items,
    'Emit lại JSON envelope đầy đủ với các kind đúng.',
  ].join('\n');
}
