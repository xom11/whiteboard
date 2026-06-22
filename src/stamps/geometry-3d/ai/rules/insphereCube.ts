import type { LanguageRule3D, RuleContext3D, RuleMatch3D } from './_types';
import type { Intent3DT } from '../intent';
import { sphereIntent, addPoint3d, connect3d, pickCenter } from './_shared';

const SPHERE_CUE = /(?:mặt|khối|hình)\s*cầu/iu;
const INSCRIBED = /nội\s*tiếp/iu;
// CHỈ "lập phương" (cube) — "hình hộp [chữ nhật]" KHÔNG có mặt cầu nội tiếp (không vuông-cạnh-đều).
const CUBE = /lập\s*phương/iu;
// Cube CÓ nhãn: "lập phương ABCD.A′B′C′D′". Strict [A-Z] /u.
const BOX_LABELLED = /lập\s*phương\s+[A-Z]{4}\.(?:[A-Z]['′])+/u;

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
    // Cube CÓ nhãn (ABCD.A′B′C′D′): solidRule (priority 90) vẽ box, NHƯNG layout box KHÔNG vuông-
    // cạnh-đều (3×2×2.4) ⟹ mặt cầu nội tiếp KHÔNG tiếp xúc đúng, verify (chỉ R>0) không bắt được.
    // → Escalate (return []) thay vì emit hình SAI. (Không có case named-cube trong dataset.)
    if (BOX_LABELLED.test(ctx.problem)) return [];
    const c = ctx.clauses.find(
      (cl) => SPHERE_CUE.test(cl.text) && INSCRIBED.test(cl.text) && CUBE.test(cl.text),
    );
    if (!c) return [];

    // Cube VÔ nhãn → tự dựng cube canonical (free vertices) + khung dây 12 cạnh. Vuông-cạnh-đều
    // ⟹ sphere(center=tâm, surfacePoint=tâm mặt đáy) tiếp xúc ĐÚNG cả 6 mặt (R = nửa cạnh).
    const intents: Intent3DT[] = [];
    for (const v of CUBE_ALL) {
      const [x, y, z] = CUBE_V[v];
      intents.push(addPoint3d(v, { kind: 'free', x, y, z }));
    }
    for (const [a, b] of CUBE_EDGES) intents.push(connect3d(a, b));

    const center = pickCenter(CUBE_ALL);
    const surf = pickCenter([...CUBE_ALL, center]);
    intents.push(
      addPoint3d(center, { kind: 'centroid', vertices: CUBE_ALL }), // tâm khối = tâm cầu
      addPoint3d(surf, { kind: 'centroid', vertices: CUBE_BASE }), // tâm-mặt-đáy = điểm mặt (R = nửa cạnh)
      sphereIntent({ center, surfacePoint: surf }),
    );
    return [{ ruleId: this.id, clauseIds: [c.id], intents }];
  },
};
