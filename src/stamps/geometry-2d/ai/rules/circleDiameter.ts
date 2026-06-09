// src/stamps/geometry-2d/ai/rules/circleDiameter.ts
//
// Standalone circle with a named diameter:
//   "Cho đường tròn (O) đường kính AB"      → A,B free; O midpoint AB; circle O_c diameter AB
//   "Cho nửa đường tròn (O) đường kính AB"  → same construction for now (full support circle)
//   "Cho (O;R) đường kính AB"               → same, radius symbol ignored because diameter fixes circle
//
// This deliberately does NOT parse "đường tròn đường kính BC cắt AB tại M" because
// diameterCircleCutsSides owns that richer construct.
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect, drawCircle, DUONG_KW, CIRCLE_KW } from './_shared';

const DIAMETER_KW = new RegExp(DUONG_KW + '\\s*kính', 'u');
const CIRCLE_NAME = String.raw`(?:${CIRCLE_KW}|nửa\s+${CIRCLE_KW})\s*(?:\(\s*([A-Z])(?:\s*[;,]\s*[Rr])?\s*\)|tâm\s+([A-Z]))?`;

const WORDS = new RegExp(
  CIRCLE_NAME + String.raw`[^.;\n]{0,40}?` + DUONG_KW + String.raw`\s*kính\s+([A-Z])([A-Z])(?![A-Z])`,
  'gu',
);
const COMPACT = new RegExp(
  String.raw`\(\s*([A-Z])\s*[;,]\s*[Rr]\s*\)\s*` + DUONG_KW + String.raw`\s*kính\s+([A-Z])([A-Z])(?![A-Z])`,
  'gu',
);

interface Parsed {
  center: string;
  a: string;
  b: string;
}

function parseAll(text: string): Parsed[] {
  const out: Parsed[] = [];
  WORDS.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WORDS.exec(text)) !== null) {
    const center = m[1] ?? m[2];
    const a = m[3];
    const b = m[4];
    if (!center || center === a || center === b || a === b) continue;
    out.push({ center, a, b });
  }

  COMPACT.lastIndex = 0;
  while ((m = COMPACT.exec(text)) !== null) {
    const center = m[1];
    const a = m[2];
    const b = m[3];
    if (!center || center === a || center === b || a === b) continue;
    out.push({ center, a, b });
  }

  const seen = new Set<string>();
  return out.filter((p) => {
    const key = `${p.center}|${p.a}${p.b}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function intentsFor(p: Parsed) {
  return [
    addPoint(p.a, { kind: 'free' }),
    addPoint(p.b, { kind: 'free' }),
    addPoint(p.center, { kind: 'midpoint', of: `${p.a}${p.b}` }),
    connect(p.a, p.b, 'segment'),
    drawCircle(`${p.center}_c`, 'diameter', { endpoints: [p.a, p.b] }),
  ];
}

export const circleDiameterRule: LanguageRule = {
  id: 'circle-diameter',
  priority: 67,
  languages: ['vi'],
  patterns: [DIAMETER_KW],
  match(ctx) {
    const out: RuleMatch[] = [];
    const whole = parseAll(ctx.problem);
    const compact = whole.filter((p) => ctx.problem.includes(`(${p.center};`) || ctx.problem.includes(`(${p.center},`));
    if (compact.length > 0) {
      const claim = ctx.clauses.filter((c) => DIAMETER_KW.test(c.text)).map((c) => c.id);
      for (const p of compact) {
        out.push({
          ruleId: 'circle-diameter',
          clauseIds: claim.length > 0 ? claim : ctx.clauses.map((c) => c.id),
          intents: intentsFor(p),
        });
      }
    }

    const emitted = new Set(compact.map((p) => `${p.center}|${p.a}${p.b}`));
    for (const c of ctx.clauses) {
      const parsed = parseAll(c.text);
      for (const p of parsed) {
        const key = `${p.center}|${p.a}${p.b}`;
        if (emitted.has(key)) continue;
        emitted.add(key);
        out.push({
          ruleId: 'circle-diameter',
          clauseIds: [c.id],
          intents: intentsFor(p),
        });
      }
    }
    return out;
  },
};
