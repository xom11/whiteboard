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

const PREFILTER = /(?:thuộc\s+(?:cạnh|đoạn|bán\s*kính)|[Tt]rên\s+(?:cạnh|đoạn|bán\s*kính)|nằm\s+giữa)/u;

const SEG = '([A-Z]{2})(?![A-Z])';
const POINT = "([A-Z](?:['′])?)(?![A-Z])";

// "Trên cạnh AC lấy điểm M" / "Trên đoạn thẳng OB lấy điểm H".
const ON_SEG_THEN_POINT = new RegExp(
  String.raw`[Tt]rên\s+(?:cạnh|đoạn(?:\s+thẳng)?|bán\s*kính)\s+${SEG}[^.]{0,30}?(?:lấy\s+)?(?:một\s+)?(?:điểm\s+)?${POINT}`,
  'gu',
);

// "điểm E thuộc cạnh BC" / "C thuộc đoạn thẳng AB".
const POINT_THUOC_SEG = new RegExp(
  String.raw`(?:điểm\s+)?${POINT}\s+thuộc\s+(?:cạnh|đoạn(?:\s+thẳng)?|bán\s*kính)\s+${SEG}`,
  'gu',
);

// "D nằm giữa A và B" / "một điểm D nằm giữa A và B".
const BETWEEN = new RegExp(
  String.raw`(?:một\s+)?(?:điểm\s+)?${POINT}\s+nằm\s+giữa\s+([A-Z])\s+và\s+([A-Z])`,
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

      POINT_THUOC_SEG.lastIndex = 0;
      for (const m of c.text.matchAll(POINT_THUOC_SEG)) {
        const name = normalizePoint(m[1]);
        const segment = m[2];
        if (validOnSegment(name, segment)) {
          intents.push(addPoint(name, { kind: 'onSegment', of: segment }));
        }
      }

      BETWEEN.lastIndex = 0;
      for (const m of c.text.matchAll(BETWEEN)) {
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
