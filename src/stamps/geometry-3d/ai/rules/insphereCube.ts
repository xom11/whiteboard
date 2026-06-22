import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { sphereIntent, addPoint3d, solid, splitVertexToken, pickCenter } from './_shared';

const SPHERE_CUE = /(?:mặt|khối|hình)\s*cầu/iu;
const INSCRIBED = /nội\s*tiếp/iu;
const CUBE = /(?:hình\s*)?(?:lập\s*phương|hộp)/iu;
// Cube CÓ nhãn: "lập phương ABCD.A′B′C′D′" → 4 đáy + 4 trên. Strict [A-Z] /u.
const BOX_LABELLED = /(?:lập\s*phương|hộp)\s+([A-Z]{4})\.((?:[A-Z]['′])+)/u;

// Mặt cầu nội tiếp lập phương: tâm = tâm khối (centroid 8 đỉnh), surfacePoint = tâm mặt đáy
// (centroid 4 đỉnh đáy) → bán kính = nửa cạnh = bán kính insphere. Reuse centroid + sphere.
export const insphereCubeRule: LanguageRule3D = {
  id: 'insphereCube',
  priority: 47,
  languages: ['vi'],
  patterns: [/(?:mặt|khối|hình)\s*cầu/iu, /nội\s*tiếp/iu],
  match(ctx: RuleContext3D): RuleMatch3D[] {
    if (!INSCRIBED.test(ctx.problem) || !CUBE.test(ctx.problem)) return [];
    const c = ctx.clauses.find(
      (cl) => SPHERE_CUE.test(cl.text) && INSCRIBED.test(cl.text) && CUBE.test(cl.text),
    );
    if (!c) return [];

    const labelled = BOX_LABELLED.exec(ctx.problem);
    let base: string[];
    let top: string[];
    let emitBox: boolean;
    if (labelled) {
      base = splitVertexToken(labelled[1]); // ABCD
      top = splitVertexToken(labelled[2]); // A′B′C′D′
      emitBox = false; // solidRule tự dựng box (tránh dup)
    } else {
      base = ['A', 'B', 'C', 'D'];
      top = ['E', 'F', 'G', 'H'];
      emitBox = true; // cube vô nhãn → tự dựng box
    }
    const verts = [...base, ...top];
    if (verts.length !== 8) return [];

    const center = pickCenter(verts);
    const surf = pickCenter([...verts, center]);
    const intents: Intent3DT[] = [];
    if (emitBox) {
      intents.push(
        solid({ flavor: 'box', baseLabels: base, baseVariant: 'rectangle', apexVariant: 'free', topLabels: top }),
      );
    }
    intents.push(
      addPoint3d(center, { kind: 'centroid', vertices: verts }), // tâm khối = tâm cầu
      addPoint3d(surf, { kind: 'centroid', vertices: base }), // tâm-mặt-đáy = điểm mặt (R = nửa cạnh)
      sphereIntent({ center, surfacePoint: surf }),
    );
    return [{ ruleId: this.id, clauseIds: [c.id], intents }];
  },
};
