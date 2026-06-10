// src/stamps/geometry-2d/ai/rules/incircleTangency.ts
//
// Tiếp điểm của đường tròn nội tiếp với các cạnh tam giác:
//   "Đường tròn (I) nội tiếp tam giác ABC tiếp xúc với các cạnh BC, CA, AB
//    tại các điểm D, E, G"
// → D/E/G = tangencyPoint(circle I, onLine BC/CA/AB).
import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, drawCircle } from './_shared';
import type { IntentT } from '../intent';
import type { Clause } from '../deterministic/coverage';

const PREFILTER = /tiếp\s*xúc/u;

// Vertices SAU "tam giác" optional — "(I) nội tiếp tam giác tiếp xúc …" (đỉnh suy
// từ các cạnh tiếp xúc) cũng hợp lệ.
const INCIRCLE_IN_CLAUSE = /đường\s*tròn\s*(?:\(\s*([A-Z])\s*\)|tâm\s+([A-Z]))?\s*nội\s*tiếp\s+tam\s*giác(?:\s+([A-Z])([A-Z])([A-Z])(?![A-Z]))?/iu;

const SIDE_POINT_LIST = /tiếp\s*xúc\s+(?:với\s+)?(?:các\s+)?(?:cạnh|đoạn)\s+([A-Z]{2}(?:\s*,\s*[A-Z]{2})*)\s+(?:lần\s*lượt\s+|tương\s*ứng\s+)?tại\s+(?:các\s+)?(?:điểm\s+)?([A-Z](?:\s*,\s*[A-Z])*)(?![A-Za-z])/iu;

// Dạng ĐẢO (Bài 11): "Cạnh AB, BC, CA tiếp xúc với đường tròn (O) tại D, E, F".
// Cạnh đứng TRƯỚC "tiếp xúc"; đường tròn (O) là đường tròn NỘI TIẾP (tiếp xúc cả
// 3 cạnh) — không rule nào khác dựng nên rule này tự emit circle inscribedIn.
const REVERSED_SIDE_POINT = /(?:các\s+)?(?:cạnh|đoạn)\s+([A-Z]{2}(?:\s*,\s*[A-Z]{2})*)\s+tiếp\s*xúc\s+(?:với\s+)?đường\s*tròn\s*\(\s*([A-Z])\s*\)\s+(?:lần\s*lượt\s+|tương\s*ứng\s+)?tại\s+(?:các\s+)?(?:điểm\s+)?([A-Z](?:\s*,\s*[A-Z])*)(?![A-Za-z])/iu;

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
      // Dạng ĐẢO trước: "Cạnh ... tiếp xúc với đường tròn (O) tại ..." — circle là
      // đường tròn nội tiếp, tự dựng inscribedIn + tiếp điểm.
      const rev = REVERSED_SIDE_POINT.exec(chunk.text);
      if (rev) {
        const sides = splitCsv(rev[1]);
        const circle = rev[2];
        const names = splitCsv(rev[3]);
        if (sides.length >= 1 && sides.length === names.length) {
          const verts = [...new Set(sides.join('').split(''))];
          const intents: IntentT[] = [];
          // Tiếp xúc đủ 3 cạnh → là đường tròn nội tiếp tam giác (3 đỉnh).
          if (verts.length === 3) {
            intents.push(drawCircle(circle, 'inscribedIn', { triangle: verts }));
          }
          for (let i = 0; i < names.length; i++) {
            intents.push(addPoint(names[i], { kind: 'tangencyPoint', circle, onLine: sides[i] }));
          }
          out.push({ ruleId: 'incircleTangency', clauseIds: chunk.clauseIds, intents });
          continue;
        }
      }

      const circle = parseIncircleName(chunk.text);
      if (!circle) continue;

      const tangencies = parseTangencies(chunk.text, circle);
      if (tangencies.length === 0) continue;

      // Nếu tiếp xúc đủ 3 cạnh → tự dựng đường tròn nội tiếp (circleTriangle có
      // thể đã bỏ lỡ khi "nội tiếp tam giác" KHÔNG nêu đỉnh liền kề). Dedup theo
      // tên: nếu circle đã có (circleTriangle emit) thì intentsToDsl bỏ trùng.
      const m = SIDE_POINT_LIST.exec(chunk.text);
      const sides = m ? splitCsv(m[1]) : [];
      const verts = [...new Set(sides.join('').split(''))];
      const intents: IntentT[] =
        verts.length === 3
          ? [drawCircle(circle, 'inscribedIn', { triangle: verts }), ...tangencies]
          : tangencies;

      out.push({ ruleId: 'incircleTangency', clauseIds: chunk.clauseIds, intents });
    }
    return out;
  },
};
