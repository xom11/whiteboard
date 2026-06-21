import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { solid, escapeRe, splitVertexToken } from './_shared';
import type { BaseVariant, ApexVariant } from '../intent';

// Match against full problem: "hình chóp S.ABCD"
const PYRAMID = /hình\s+chóp\s+([A-Z])\.([A-Z]+)/u;
// "tứ diện [đều]? ABCD"
const TETRA = /tứ\s+diện(?:\s+đều)?\s+([A-Z]{4})/u;
// "lăng trụ ABC.A'B'C'" — base then dot then primed top
const PRISM = /lăng\s+trụ\s+([A-Z]{3,4})\.((?:[A-Z]['′])+)/u;
// "hình hộp / lập phương ABCD.A'B'C'D'"
const BOX = /hình\s+(?:hộp|lập\s+phương)\s+([A-Z]{4})\.((?:[A-Z]['′])+)/u;

function baseVariantFrom(problem: string, n: number): BaseVariant {
  if (/đáy[^.]*?hình\s+vuông/u.test(problem)) return 'square';
  if (/đáy[^.]*?hình\s+chữ\s+nhật/u.test(problem)) return 'rectangle';
  if (/đáy[^.]*?hình\s+bình\s+hành/u.test(problem)) return 'parallelogram';
  if (/đáy[^.]*?hình\s+thang/u.test(problem)) return 'trapezoid';
  if (/đáy[^.]*?hình\s+thoi/u.test(problem)) return 'rhombus';
  if (/(tam\s+giác\s+đều|đáy[^.]*?đều)/u.test(problem)) return 'equilateral-triangle';
  // Fallback: check the whole problem for shape keywords
  if (/hình\s+vuông/u.test(problem)) return 'square';
  if (/hình\s+chữ\s+nhật/u.test(problem)) return 'rectangle';
  return n === 3 ? 'triangle' : 'square';
}

function apexVariantFrom(problem: string, apex: string): { v: ApexVariant; anchor?: string } {
  // "SA ⊥ đáy" or "SA vuông góc với mặt phẳng đáy" → over-vertex at A
  const over = new RegExp(
    `${escapeRe(apex)}([A-Z])\\s*(?:⊥|vuông\\s+góc)[^.]*?đáy`,
    'u',
  ).exec(problem);
  if (over) return { v: 'over-vertex', anchor: over[1] };

  // "(SAB) ⊥ đáy" + "cân tại S" → over-edge-mid AB
  const face = new RegExp(
    `\\(${escapeRe(apex)}([A-Z])([A-Z])\\)[^.]*?(?:⊥|vuông\\s+góc)[^.]*?đáy`,
    'u',
  ).exec(problem);
  if (face && new RegExp(`cân\\s+tại\\s+${escapeRe(apex)}`, 'u').test(problem)) {
    return { v: 'over-edge-mid', anchor: `${face[1]}${face[2]}` };
  }

  if (/(chóp\s+(?:tứ\s+giác|tam\s+giác)?\s*đều|hình\s+chóp\s+đều)/u.test(problem)) {
    return { v: 'regular' };
  }
  return { v: 'regular' };
}

/** Return clause ids that are about the solid declaration (claim the first geo clause). */
function solidClauseIds(ctx: RuleContext3D): number[] {
  const geoIds = ctx.clauses.filter((c) => c.hasGeometry).map((c) => c.id);
  return geoIds.length > 0 ? [geoIds[0]] : ctx.clauses.length > 0 ? [ctx.clauses[0].id] : [];
}

export const solidRule: LanguageRule3D = {
  id: 'solid',
  priority: 90,
  languages: ['vi'],
  patterns: [/hình\s+chóp/u, /tứ\s+diện/u, /lăng\s+trụ/u, /hình\s+(hộp|lập\s+phương)/u],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    const prob = ctx.problem;
    let m: RegExpExecArray | null;

    if ((m = PYRAMID.exec(prob))) {
      const apex = m[1];
      const baseLabels = splitVertexToken(m[2]);
      const { v, anchor } = apexVariantFrom(prob, apex);
      return [
        {
          ruleId: this.id,
          clauseIds: solidClauseIds(ctx),
          intents: [
            solid({
              flavor: 'pyramid',
              baseLabels,
              baseVariant: baseVariantFrom(prob, baseLabels.length),
              apex,
              apexVariant: v,
              apexAnchor: anchor,
            }),
          ],
        },
      ];
    }

    if ((m = TETRA.exec(prob))) {
      const verts = splitVertexToken(m[1]);
      if (verts.length >= 4) {
        const isReg = /tứ\s+diện\s+đều/u.test(prob);
        return [
          {
            ruleId: this.id,
            clauseIds: solidClauseIds(ctx),
            intents: [
              solid({
                flavor: 'tetrahedron',
                baseLabels: verts.slice(0, 3),
                baseVariant: isReg ? 'equilateral-triangle' : 'triangle',
                apex: verts[3],
                apexVariant: 'regular',
              }),
            ],
          },
        ];
      }
    }

    if ((m = PRISM.exec(prob))) {
      const baseLabels = splitVertexToken(m[1]);
      const topLabels = splitVertexToken(m[2]);
      return [
        {
          ruleId: this.id,
          clauseIds: solidClauseIds(ctx),
          intents: [
            solid({
              flavor: 'prism',
              baseLabels,
              baseVariant: baseVariantFrom(prob, baseLabels.length),
              apexVariant: 'free',
              topLabels,
            }),
          ],
        },
      ];
    }

    if ((m = BOX.exec(prob))) {
      const baseLabels = splitVertexToken(m[1]);
      const topLabels = splitVertexToken(m[2]);
      return [
        {
          ruleId: this.id,
          clauseIds: solidClauseIds(ctx),
          intents: [
            solid({
              flavor: 'box',
              baseLabels,
              baseVariant: 'rectangle',
              apexVariant: 'free',
              topLabels,
            }),
          ],
        },
      ];
    }

    return [];
  },
};
