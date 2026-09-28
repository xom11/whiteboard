import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import { solid, escapeRe, splitVertexToken, SOLID_PYRAMID_RE, SOLID_PRISM_RE } from './_shared';
import type { BaseVariant, ApexVariant, Intent3DT } from '../intent';
import { refineSolid, type SolidHeadInfo } from '../solidRefine3d';

// Match against full problem: "hình chóp S.ABCD" | "hình chóp tứ giác đều S.ABCD" (qualifier dung nạp)
const PYRAMID = SOLID_PYRAMID_RE;
// "tứ diện [đều]? ABCD"
const TETRA = /tứ\s+diện(?:\s+đều)?\s+([A-Z]{4})/u;
// "lăng trụ [đứng|đều|tam giác…]? ABC.A'B'C'" — base then dot then primed top
const PRISM = SOLID_PRISM_RE;
// "hình hộp [chữ nhật|đứng]? / lập phương ABCD.A'B'C'D'"
const BOX = /hình\s+(?:hộp(?:\s+(?:chữ\s+nhật|đứng))?|lập\s+phương)\s+([A-Z]{4})\.((?:[A-Z]['′])+)/u;

/** Gắn SolidRefine (điều kiện đề: đáy vuông tại B, chân đường cao, chiều cao…) vào solid intent. */
function withRefine(prob: string, intent: Intent3DT): Intent3DT {
  const i = intent as Extract<Intent3DT, { op: 'solid' }>;
  const head: SolidHeadInfo = { flavor: i.flavor, base: i.baseLabels, apex: i.apex, top: i.topLabels };
  const { refine } = refineSolid(prob, head);
  if (!refine) return intent;
  const out = { ...i, refine: refine as unknown as Record<string, unknown> };
  if (refine.reorder) { out.apex = refine.reorder.apex; out.baseLabels = refine.reorder.base; }
  return out;
}

function baseVariantFrom(problem: string, n: number): BaseVariant {
  if (/đáy[^.]*?hình\s+vuông/u.test(problem)) return 'square';
  if (/đáy[^.]*?hình\s+chữ\s+nhật/u.test(problem)) return 'rectangle';
  if (/đáy[^.]*?hình\s+bình\s+hành/u.test(problem)) return 'parallelogram';
  if (/đáy[^.]*?hình\s+thang/u.test(problem)) return 'trapezoid';
  if (/đáy[^.]*?hình\s+thoi/u.test(problem)) return 'rhombus';
  // Chỉ đáy 3 đỉnh: "đáy … lục giác đều" với nhãn ABCD từng ra template tam giác ⇒ D trùng A.
  if (n === 3 && /(tam\s+giác\s+đều|đáy[^.]*?đều)/u.test(problem)) return 'equilateral-triangle';
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
function solidClauseIds(ctx: RuleContext3D, nBase?: number): number[] {
  // Đáy "lục giác/ngũ giác (đều)" mà nhãn chỉ 4 đỉnh (đề lỗi) ⇒ hình vẽ KHÔNG đúng mô tả: dựng
  // nhưng không claim mệnh đề (thà thiếu còn hơn sai).
  const poly = /đáy[^.;]{0,20}?(?<!nửa\s)(lục|ngũ)\s+giác/u.exec(ctx.problem);
  if (poly && nBase !== undefined && nBase !== (poly[1] === 'lục' ? 6 : 5)) return [];
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
          clauseIds: solidClauseIds(ctx, baseLabels.length),
          intents: [
            withRefine(prob, solid({
              flavor: 'pyramid',
              baseLabels,
              baseVariant: baseVariantFrom(prob, baseLabels.length),
              apex,
              apexVariant: v,
              apexAnchor: anchor,
            })),
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
              withRefine(prob, solid({
                flavor: 'tetrahedron',
                baseLabels: verts.slice(0, 3),
                baseVariant: isReg ? 'equilateral-triangle' : 'triangle',
                apex: verts[3],
                apexVariant: 'regular',
              })),
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
            withRefine(prob, solid({
              flavor: 'prism',
              baseLabels,
              baseVariant: baseVariantFrom(prob, baseLabels.length),
              apexVariant: 'free',
              topLabels,
            })),
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
            withRefine(prob, solid({
              flavor: 'box',
              baseLabels,
              baseVariant: 'rectangle',
              apexVariant: 'free',
              topLabels,
            })),
          ],
        },
      ];
    }

    return [];
  },
};
