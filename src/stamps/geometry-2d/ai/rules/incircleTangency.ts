// src/stamps/geometry-2d/ai/rules/incircleTangency.ts
//
// Tiếp điểm của đường tròn nội tiếp với các cạnh tam giác:
//   "Đường tròn (I) nội tiếp tam giác ABC tiếp xúc với các cạnh BC, CA, AB
//    tại các điểm D, E, G"
// → D/E/G = tangencyPoint(circle I, onLine BC/CA/AB).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint } from './_shared';
import type { IntentT } from '../intent';
import type { Clause } from '../deterministic/coverage';

const PREFILTER = /tiếp\s*xúc/u;

const INCIRCLE_IN_CLAUSE = /đường\s*tròn\s*(?:\(\s*([A-Z])\s*\)|tâm\s+([A-Z]))?\s*nội\s*tiếp\s+tam\s*giác\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/iu;

const SIDE_POINT_LIST = /tiếp\s*xúc\s+(?:với\s+)?(?:các\s+)?(?:cạnh|đoạn)\s+([A-Z]{2}(?:\s*,\s*[A-Z]{2})*)\s+(?:lần\s*lượt\s+)?tại\s+(?:các\s+)?(?:điểm\s+)?([A-Z](?:\s*,\s*[A-Z])*)(?![A-Za-z])/iu;

function splitCsv(blob: string): string[] {
  return blob
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

function logicalChunks(problem: string, clauses: readonly Clause[]): Array<{ text: string; clauseIds: number[] }> {
  return problem
    .split(/[.;]+/u)
    .map((text) => normalizeSpaces(text))
    .filter(Boolean)
    .map((text) => ({
      text,
      clauseIds: clauses
        .filter((c) => text.includes(normalizeSpaces(c.text)))
        .map((c) => c.id),
    }));
}

function parseIncircleName(text: string): string | undefined {
  const m = INCIRCLE_IN_CLAUSE.exec(text);
  if (!m) return undefined;
  return m[1] ?? m[2] ?? 'O';
}

function parseTangencies(text: string, circle: string): IntentT[] {
  const m = SIDE_POINT_LIST.exec(text);
  if (!m) return [];

  const sides = splitCsv(m[1]);
  const names = splitCsv(m[2]);
  if (sides.length === 0 || sides.length !== names.length) return [];

  return names.map((name, i) => (
    addPoint(name, { kind: 'tangencyPoint', circle, onLine: sides[i] })
  ));
}

export const incircleTangencyRule: LanguageRule = {
  id: 'incircleTangency',
  priority: 71,
  languages: ['vi'],
  patterns: [PREFILTER],
  match(ctx) {
    const out: RuleMatch[] = [];
    for (const chunk of logicalChunks(ctx.problem, ctx.clauses)) {
      const circle = parseIncircleName(chunk.text);
      if (!circle) continue;

      const intents = parseTangencies(chunk.text, circle);
      if (intents.length === 0) continue;

      out.push({ ruleId: 'incircleTangency', clauseIds: chunk.clauseIds, intents });
    }
    return out;
  },
};
