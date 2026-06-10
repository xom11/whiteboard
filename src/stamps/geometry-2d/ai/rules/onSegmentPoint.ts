// src/stamps/geometry-2d/ai/rules/onSegmentPoint.ts
//
// Điểm tự do trên đoạn/cạnh/bán kính:
//   "Trên cạnh AC lấy điểm M" → M onSegment AC
//   "điểm E thuộc cạnh BC" → E onSegment BC
//   "D nằm giữa A và B" → D onSegment AB
//
// Rule này cố ý không giải metric (AC=10, CB=40, AD=2DB). Mục tiêu là dựng điểm
// đúng constraint trên segment để các construct sau có ref hợp lệ; t mặc định do
// builder chọn.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';

// "thuộc <2 HOA>" (vd "D thuộc AC") cũng kích hoạt — KHÔNG bắt buộc chữ "cạnh".
// "thuộc (O)"/"thuộc cung" KHÔNG khớp ([A-Z]{2} cần 2 HOA liền, paren/'cung' loại)
// → onCirclePoint lo. match() vẫn validate SEG nên prefilter rộng vô hại.
const PREFILTER = /(?:thuộc\s+(?:cạnh|đoạn|bán\s*kính|dây|[A-Z]{2})|[Tt]rên\s+(?:cạnh|đoạn|bán\s*kính|dây)|nằm\s+giữa)/u;

const SEG = '([A-Z]{2})(?![A-Z])';
const POINT = "([A-Z](?:['′])?)(?![A-Z])";

// "Trên cạnh AC lấy điểm M" / "Trên đoạn thẳng OB lấy điểm H".
const ON_SEG_THEN_POINT = new RegExp(
  String.raw`[Tt]rên\s+(?:cạnh|đoạn(?:\s+thẳng)?|bán\s*kính|dây\s*(?:cung)?)\s+${SEG}[^.]{0,30}?(?:lấy\s+)?(?:một\s+)?(?:điểm\s+)?${POINT}`,
  'gu',
);

// "điểm E thuộc cạnh BC" / "C thuộc đoạn thẳng AB" / "Điểm D thuộc AC" (không
// chữ "cạnh"). Prefix "cạnh|đoạn|…" optional; SEG = cặp HOA [A-Z]{2} nên "thuộc
// (O)"/"thuộc cung BC" KHÔNG khớp (paren/'cung' chữ thường) → onCirclePoint lo.
const POINT_THUOC_SEG = new RegExp(
  String.raw`(?:điểm\s+)?${POINT}\s+(?:là\s+(?:một\s+)?điểm\s+)?thuộc\s+(?:(?:cạnh|đoạn(?:\s+thẳng)?|bán\s*kính|dây\s*(?:cung)?)\s+)?${SEG}`,
  'gu',
);

// "D nằm giữa A và B" / "một điểm D nằm giữa A và B".
const BETWEEN = new RegExp(
  String.raw`(?:một\s+)?(?:điểm\s+)?${POINT}\s+nằm\s+giữa\s+([A-Z])\s+và\s+([A-Z])`,
  'gu',
);

// Distributive CÙNG đoạn: "(Các)? điểm M, N thuộc BC" → M,N đều onSegment BC.
const TWO_SAME_SEG = new RegExp(
  String.raw`(?:[CcNn]ác\s+|[Nn]hững\s+)?điểm\s+([A-Z])\s*,\s*([A-Z])(?![A-Z])\s+thuộc\s+(?:cạnh\s+|đoạn(?:\s+thẳng)?\s+)?${SEG}`,
  'gu',
);
// Distributive ZIP: "(các)? điểm P, Q (theo thứ tự|lần lượt)? thuộc AC, AB"
//   → P↔AC, Q↔AB. (Cần "theo thứ tự"/"lần lượt" để chắc là zip, không phải cùng đoạn.)
const ZIP_SEG = new RegExp(
  String.raw`(?:[CcNn]ác\s+|[Nn]hững\s+)?điểm\s+([A-Z])\s*,\s*([A-Z])(?![A-Z])\s+(?:theo\s+thứ\s+tự|lần\s*lượt)\s+thuộc\s+(?:cạnh\s+|đoạn\s+)?${SEG}\s*,\s*${SEG}`,
  'gu',
);

function normalizePoint(name: string): string {
  return name.replace('′', "'");
}

function validOnSegment(name: string, segment: string): boolean {
  return /^[A-Z]['′]?$/u.test(name) && /^[A-Z]{2}$/u.test(segment) && !segment.includes(name[0]);
}

function hasMetricConstraint(text: string): boolean {
  return /sao\s+cho[^.]{0,40}(?:=|>|<)/u.test(text);
}

export const onSegmentPointRule: LanguageRule = {
  id: 'on-segment-point',
  priority: 62,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const c of ctx.clauses) {
      if (hasMetricConstraint(c.text)) continue;
      const intents = [];

      ON_SEG_THEN_POINT.lastIndex = 0;
      for (const m of c.text.matchAll(ON_SEG_THEN_POINT)) {
        const segment = m[1];
        const name = normalizePoint(m[2]);
        if (validOnSegment(name, segment)) {
          intents.push(addPoint(name, { kind: 'onSegment', of: segment }));
        }
      }

      // ZIP trước (chặt hơn) rồi TWO_SAME_SEG: "P, Q theo thứ tự thuộc AC, AB".
      const zipConsumed: Array<[number, number]> = [];
      ZIP_SEG.lastIndex = 0;
      for (const m of c.text.matchAll(ZIP_SEG)) {
        const [n1, n2, s1, s2] = [normalizePoint(m[1]), normalizePoint(m[2]), m[3], m[4]];
        if (validOnSegment(n1, s1) && validOnSegment(n2, s2)) {
          intents.push(addPoint(n1, { kind: 'onSegment', of: s1 }));
          intents.push(addPoint(n2, { kind: 'onSegment', of: s2 }));
          zipConsumed.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
        }
      }
      // "Các điểm M, N thuộc BC" — cùng đoạn (bỏ span đã khớp ZIP).
      TWO_SAME_SEG.lastIndex = 0;
      for (const m of c.text.matchAll(TWO_SAME_SEG)) {
        if (zipConsumed.some(([a, b]) => (m.index ?? 0) >= a && (m.index ?? 0) < b)) continue;
        const [n1, n2, seg] = [normalizePoint(m[1]), normalizePoint(m[2]), m[3]];
        if (validOnSegment(n1, seg) && validOnSegment(n2, seg)) {
          intents.push(addPoint(n1, { kind: 'onSegment', of: seg }));
          intents.push(addPoint(n2, { kind: 'onSegment', of: seg }));
        }
      }

      POINT_THUOC_SEG.lastIndex = 0;
      for (const m of c.text.matchAll(POINT_THUOC_SEG)) {
        const name = normalizePoint(m[1]);
        const segment = m[2];
        if (validOnSegment(name, segment)) {
          intents.push(addPoint(name, { kind: 'onSegment', of: segment }));
        }
      }

      // "cắt … (tại|ở) D và E (D nằm giữa A và E)": D,E là GIAO ĐIỂM cát tuyến
      // (secant/lineCircleIntersection dựng), "nằm giữa" chỉ là thứ tự → onSegment
      // sẽ tạo phụ thuộc vòng (D onSegment AE, E = secondIntersection AD). Bỏ
      // toàn bộ BETWEEN trong clause có "cắt … tại/ở".
      const cutContext = /cắt[^.]{0,40}?(?:tại|ở)\s+[A-Z]/u.test(c.text);
      BETWEEN.lastIndex = 0;
      for (const m of cutContext ? [] : c.text.matchAll(BETWEEN)) {
        // "sao cho X nằm giữa Y và Z" = ĐIỀU KIỆN thứ tự trên điểm ĐÃ có (vd đỉnh
        // hình, hoặc giao điểm vừa dựng) — KHÔNG dựng onSegment (sẽ tạo phụ thuộc
        // vòng nếu Y/Z lại phái sinh từ X). Chỉ nhận "nằm giữa" khi GIỚI THIỆU điểm mới.
        const before = c.text.slice(0, m.index ?? 0);
        if (/sao\s+cho\s*$/u.test(before) || /sao\s+cho\b/u.test(before)) continue;
        const name = normalizePoint(m[1]);
        const segment = `${m[2]}${m[3]}`;
        if (validOnSegment(name, segment)) {
          intents.push(addPoint(name, { kind: 'onSegment', of: segment }));
        }
      }

      if (intents.length > 0) out.push({ ruleId: 'on-segment-point', clauseIds: [c.id], intents });
    }
    return out;
  },
};
