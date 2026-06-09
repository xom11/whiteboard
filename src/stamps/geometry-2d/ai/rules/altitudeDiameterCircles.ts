import type { LanguageRule, RuleMatch } from './_types';
import { addPoint, connect, drawCircle, drawShape, CIRCLE_KW, DUONG_KW } from './_shared';

const TRI = /tam\s*giác(?:[^A-Z.;\n]*)\s+([A-Z])([A-Z])([A-Z])(?![A-Z])/u;
const ALTITUDES = /các\s+đường\s*cao\s+([A-Z])([A-Z])\s*,\s*([A-Z])([A-Z])(?![A-Z])/u;
const DIAMETER_INTERSECTION = new RegExp(
  CIRCLE_KW +
    '\\s+' +
    DUONG_KW +
    '\\s*kính\\s+([A-Z])([A-Z])\\s+và\\s+' +
    CIRCLE_KW +
    '\\s+' +
    DUONG_KW +
    '\\s*kính\\s+([A-Z])([A-Z])[^.;\n]*?tại\\s+các\\s+điểm\\s+([A-Z])\\s*,\\s*([A-Z])(?![A-Z])',
  'u',
);
const SEGMENT_CIRCLE = new RegExp(
  '[Đđ]oạn\\s+thẳng\\s+([A-Z])([A-Z])\\s+cắt\\s+' +
    CIRCLE_KW +
    '\\s+' +
    DUONG_KW +
    '\\s*kính\\s+([A-Z])([A-Z])\\s+tại\\s+điểm\\s+([A-Z])(?![A-Z])',
  'gu',
);
const LINE_LINE =
  /[Cc]ác\s+đường\s+thẳng\s+([A-Z])([A-Z])\s+và\s+([A-Z])([A-Z])\s+cắt\s+nhau\s+tại\s+([A-Z])(?![A-Z])/u;

function opposite(triangle: readonly string[], apex: string): string | undefined {
  const rest = triangle.filter((v) => v !== apex);
  return rest.length === 2 ? rest[0] + rest[1] : undefined;
}

export const altitudeDiameterCirclesRule: LanguageRule = {
  id: 'altitude-diameter-circles',
  priority: 67,
  languages: ['vi'],
  patterns: [new RegExp(DUONG_KW + '\\s*cao', 'u'), new RegExp(DUONG_KW + '\\s*kính', 'u')],
  match(ctx) {
    const tri = TRI.exec(ctx.problem);
    const alts = ALTITUDES.exec(ctx.problem);
    const circles = DIAMETER_INTERSECTION.exec(ctx.problem);
    if (!tri || !alts || !circles) return [];

    const triangle = [tri[1], tri[2], tri[3]] as const;
    const altPairs = [
      [alts[1], alts[2]],
      [alts[3], alts[4]],
    ] as const;

    const altitudeIntents = [];
    for (const [apex, foot] of altPairs) {
      if (!triangle.includes(apex) || triangle.includes(foot)) return [];
      const opp = opposite(triangle, apex);
      if (!opp) return [];
      altitudeIntents.push(
        addPoint(foot, { kind: 'perpFoot', from: apex, onLine: opp }),
        connect(apex, foot, 'segment'),
      );
    }

    const dia1 = circles[1] + circles[2];
    const dia2 = circles[3] + circles[4];
    const known = new Set(altPairs.map(([a, f]) => `${a}${f}`));
    if (!known.has(dia1) || !known.has(dia2) || dia1 === dia2) return [];

    const c1 = `k${dia1}`;
    const c2 = `k${dia2}`;
    const x = circles[5];
    const y = circles[6];
    if (x === y) return [];

    const segCircles = [...ctx.problem.matchAll(SEGMENT_CIRCLE)];
    const extraPointIntents = [];
    for (const m of segCircles) {
      const line = `${m[1]}${m[2]}`;
      const dia = `${m[3]}${m[4]}`;
      const point = m[5];
      if (line === dia || point === line[0] || point === line[1]) return [];
      const circle = dia === dia1 ? c1 : dia === dia2 ? c2 : undefined;
      if (!circle) return [];
      extraPointIntents.push(
        addPoint(point, { kind: 'intersection', of: [line, circle], branch: 0 }),
      );
    }

    const lineLine = LINE_LINE.exec(ctx.problem);
    if (lineLine) {
      extraPointIntents.push(
        addPoint(lineLine[5], {
          kind: 'intersection',
          of: [`${lineLine[1]}${lineLine[2]}`, `${lineLine[3]}${lineLine[4]}`],
        }),
      );
    }

    const intents = [
      drawShape('triangle', [...triangle], 'any'),
      ...altitudeIntents,
      drawCircle(c1, 'diameter', { endpoints: [dia1[0], dia1[1]] }),
      drawCircle(c2, 'diameter', { endpoints: [dia2[0], dia2[1]] }),
      addPoint(x, { kind: 'circleIntersection', c1, c2, which: 0 }),
      addPoint(y, { kind: 'circleIntersection', c1, c2, which: 1 }),
      ...extraPointIntents,
    ];

    const out: RuleMatch[] = [{
      ruleId: 'altitude-diameter-circles',
      clauseIds: ctx.clauses.map((c) => c.id),
      intents,
    }];
    return out;
  },
};
