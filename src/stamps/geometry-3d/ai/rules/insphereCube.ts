import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { sphereIntent, addPoint3d, connect3d, splitVertexToken, pickCenter } from './_shared';

const SPHERE_CUE = /(?:mặt|khối|hình)\s*cầu/iu;
const INSCRIBED = /nội\s*tiếp/iu;
const CUBE = /(?:hình\s*)?(?:lập\s*phương|hộp)/iu;
// Cube CÓ nhãn: "lập phương ABCD.A′B′C′D′" → 4 đáy + 4 trên. Strict [A-Z] /u.
const BOX_LABELLED = /(?:lập\s*phương|hộp)\s+([A-Z]{4})\.((?:[A-Z]['′])+)/u;

// Cube canonical cạnh 2·HALF (trong camera box [-3,3]³). Đáy z=−HALF, trên z=+HALF.
// KHÔNG dùng solid 'box' (layout box ra 3×2×2.4 KHÔNG-cube → sphere nội tiếp sai mặt).
const HALF = 1.2;
const CUBE_V: Record<string, [number, number, number]> = {
  A: [-HALF, -HALF, -HALF], B: [HALF, -HALF, -HALF], C: [HALF, HALF, -HALF], D: [-HALF, HALF, -HALF],
  E: [-HALF, -HALF, HALF], F: [HALF, -HALF, HALF], G: [HALF, HALF, HALF], H: [-HALF, HALF, HALF],
};
const CUBE_BASE = ['A', 'B', 'C', 'D'];
const CUBE_ALL = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const CUBE_EDGES: Array<[string, string]> = [
  ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], // đáy
  ['E', 'F'], ['F', 'G'], ['G', 'H'], ['H', 'E'], // trên
  ['A', 'E'], ['B', 'F'], ['C', 'G'], ['D', 'H'], // cạnh đứng
];

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
    const intents: Intent3DT[] = [];
    let allVerts: string[];
    let baseVerts: string[];

    if (labelled) {
      // Cube CÓ nhãn → solidRule (priority 90) tự dựng box; reference 8 đỉnh đó (tránh dup box).
      // (Best-effort: layout box không-cube → sphere lệch; không có case named-cube trong dataset.)
      const base = splitVertexToken(labelled[1]);
      const top = splitVertexToken(labelled[2]);
      allVerts = [...base, ...top];
      baseVerts = base;
      if (allVerts.length !== 8) return [];
    } else {
      // Cube VÔ nhãn → tự dựng cube canonical (free vertices) + khung dây 12 cạnh. Vuông-cạnh-đều
      // ⟹ sphere(center=tâm, surfacePoint=tâm mặt đáy) tiếp xúc ĐÚNG cả 6 mặt (R = nửa cạnh).
      allVerts = CUBE_ALL;
      baseVerts = CUBE_BASE;
      for (const v of CUBE_ALL) {
        const [x, y, z] = CUBE_V[v];
        intents.push(addPoint3d(v, { kind: 'free', x, y, z }));
      }
      for (const [a, b] of CUBE_EDGES) intents.push(connect3d(a, b));
    }

    const center = pickCenter(allVerts);
    const surf = pickCenter([...allVerts, center]);
    intents.push(
      addPoint3d(center, { kind: 'centroid', vertices: allVerts }), // tâm khối = tâm cầu
      addPoint3d(surf, { kind: 'centroid', vertices: baseVerts }), // tâm-mặt-đáy = điểm mặt (R = nửa cạnh)
      sphereIntent({ center, surfacePoint: surf }),
    );
    return [{ ruleId: this.id, clauseIds: [c.id], intents }];
  },
};
