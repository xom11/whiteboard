// scripts/construct-matrix/manifest.ts
//
// Declarative capability matrix cho geometry-2d constructs (Phase 6a, #45).
//
// 1 dòng/DSL kind (nguồn enumerate = dsl/registry.ts KIND_REGISTRY). Mỗi dòng
// khai báo key của construct ở từng layer:
//   - dslKind     : kind string, PHẢI ∈ KIND_REGISTRY.
//   - sceneKind   : SceneObject.kind mà emit của DSL module sinh ra
//                   (point|line|ray|segment|tangent|circle|polygon). Tài liệu —
//                   script không validate (SceneObject.kind là string tự do).
//   - intentKey   : op (∈ OP_BUILDERS) hoặc add-point constraint.kind
//                   (∈ ADD_POINT_BUILDERS) sinh ra DSL kind này; null nếu không
//                   có path Intent deterministic (chỉ manual/escalate).
//   - toolKey     : key tool finalize (∈ TOOL_MODULES) tạo ra nó; null nếu không.
//   - ruleId      : id rule (∈ ALL_RULES) sinh deterministic DSL kind này;
//                   null nếu chỉ escalate / không rule.
//   - serialize   : true nếu dsl/serialize.ts roundtrip được kind này (case trả
//                   { ok: true }); false nếu fail('unsupported-constraint').
//   - evalFixture : path fixture (validate tồn tại trên đĩa) hoặc null.
//
// Script `npm run check:matrix` (scripts/check-construct-matrix.ts) verify:
//   (a) mọi DSL kind trong KIND_REGISTRY có entry,
//   (b) mọi key khai báo resolve được trong registry tương ứng.
// → bắt "thêm construct nhưng quên 1 layer".

export interface ConstructEntry {
  dslKind: string;          // phải ∈ KIND_REGISTRY
  sceneKind: string;        // point|line|ray|segment|tangent|circle|polygon|...
  intentKey: string | null; // op hoặc constraint.kind ∈ intent-builder registry
  toolKey: string | null;   // ∈ TOOL_MODULES
  ruleId: string | null;    // ∈ ALL_RULES ids
  serialize: boolean;
  evalFixture: string | null;
}

export const CONSTRUCT_MANIFEST: ConstructEntry[] = [
  // ── points ────────────────────────────────────────────────────────────────
  { dslKind: 'free',               sceneKind: 'point',   intentKey: 'free',               toolKey: 'pointOn',        ruleId: null,             serialize: true,  evalFixture: null },
  { dslKind: 'midpoint',           sceneKind: 'point',   intentKey: 'midpoint',           toolKey: 'midpoint',       ruleId: 'midpoint',       serialize: true,  evalFixture: null },
  { dslKind: 'onPerpBisector',     sceneKind: 'point',   intentKey: 'onPerpBisector',     toolKey: 'pointOn',        ruleId: 'circleThroughTwoCutsSides', serialize: true, evalFixture: null },
  { dslKind: 'onSegment',          sceneKind: 'point',   intentKey: 'onSegment',          toolKey: 'pointOn',        ruleId: null,             serialize: true,  evalFixture: null },
  { dslKind: 'onLine',             sceneKind: 'point',   intentKey: null,                 toolKey: 'pointOn',        ruleId: null,             serialize: true,  evalFixture: null },
  { dslKind: 'onCircle',           sceneKind: 'point',   intentKey: 'onCircle',           toolKey: 'pointOn',        ruleId: 'simson',         serialize: true,  evalFixture: null },
  { dslKind: 'perpFoot',           sceneKind: 'point',   intentKey: 'perpFoot',           toolKey: 'perpFoot',       ruleId: 'perpFoot',       serialize: true,  evalFixture: null },
  { dslKind: 'circumcenter',       sceneKind: 'point',   intentKey: 'circumcenter',       toolKey: 'circumcenter',   ruleId: 'centers',        serialize: true,  evalFixture: null },
  { dslKind: 'incenter',           sceneKind: 'point',   intentKey: 'incenter',           toolKey: 'incenter',       ruleId: 'centers',        serialize: true,  evalFixture: null },
  { dslKind: 'centroid',           sceneKind: 'point',   intentKey: 'centroid',           toolKey: 'centroid',       ruleId: 'centers',        serialize: true,  evalFixture: null },
  { dslKind: 'orthocenter',        sceneKind: 'point',   intentKey: 'orthocenter',        toolKey: 'orthocenter',    ruleId: 'centers',        serialize: true,  evalFixture: null },
  { dslKind: 'intersection',       sceneKind: 'point',   intentKey: 'intersection',       toolKey: 'intersect',      ruleId: null,             serialize: true,  evalFixture: null },
  { dslKind: 'secondIntersection', sceneKind: 'point',   intentKey: 'secondIntersection', toolKey: 'secondIntersection', ruleId: null,         serialize: true,  evalFixture: null },
  { dslKind: 'circleIntersection', sceneKind: 'point',   intentKey: 'circleIntersection', toolKey: 'circleIntersection', ruleId: null,         serialize: true,  evalFixture: null },
  { dslKind: 'circleSecondIntersection', sceneKind: 'point', intentKey: 'circleSecondIntersection', toolKey: null,       ruleId: 'diameter-circle-pairwise', serialize: true, evalFixture: null },
  { dslKind: 'tangencyPoint',      sceneKind: 'point',   intentKey: 'tangencyPoint',      toolKey: 'tangencyPoint',  ruleId: null,             serialize: true,  evalFixture: null },
  { dslKind: 'tangentPointExt',    sceneKind: 'point',   intentKey: 'tangentPoint',       toolKey: 'tangentPointExt', ruleId: null,            serialize: true,  evalFixture: null },
  { dslKind: 'arcMidpoint',        sceneKind: 'point',   intentKey: 'arcMidpoint',        toolKey: 'arcMidpoint',    ruleId: 'arcMidpoint',    serialize: true,  evalFixture: null },
  { dslKind: 'excenter',           sceneKind: 'point',   intentKey: 'excenter',           toolKey: 'excenter',       ruleId: 'centers',        serialize: true,  evalFixture: null },
  { dslKind: 'reflectPoint',       sceneKind: 'point',   intentKey: 'reflectPoint',       toolKey: null,             ruleId: 'reflection',     serialize: false, evalFixture: null },
  { dslKind: 'reflectLine',        sceneKind: 'point',   intentKey: 'reflectLine',        toolKey: null,             ruleId: 'reflection',     serialize: false, evalFixture: null },
  { dslKind: 'pointAtDistance',    sceneKind: 'point',   intentKey: 'pointAtDistance',    toolKey: null,             ruleId: 'pointAtDistance', serialize: true, evalFixture: null },

  // ── lines / line-constructions ──────────────────────────────────────────────
  { dslKind: 'segment',            sceneKind: 'segment', intentKey: 'connect',            toolKey: 'segment',        ruleId: 'connect',        serialize: true,  evalFixture: null },
  { dslKind: 'line',               sceneKind: 'line',    intentKey: 'connect',            toolKey: 'line',           ruleId: 'connect',        serialize: true,  evalFixture: null },
  { dslKind: 'ray',                sceneKind: 'ray',     intentKey: 'connect',            toolKey: 'ray',            ruleId: 'connect',        serialize: true,  evalFixture: null },
  { dslKind: 'perpendicular',      sceneKind: 'line',    intentKey: 'draw-line',          toolKey: 'perpendicular',  ruleId: null,             serialize: true,  evalFixture: null },
  { dslKind: 'parallel',           sceneKind: 'line',    intentKey: 'draw-line',          toolKey: 'parallel',       ruleId: null,             serialize: true,  evalFixture: null },
  { dslKind: 'perpBisector',       sceneKind: 'line',    intentKey: 'connect',            toolKey: 'perpBisector',   ruleId: 'perpBisector',   serialize: true,  evalFixture: null },
  // 2 path Intent emit angleBisector: (a) add-point/angleBisectorFoot (cevian
  // "phân giác AD" foot-named) + (b) draw-line kind=angleBisector VISIBLE
  // (angleBisectorAngle rule "phân giác góc BAC", không foot). intentKey/ruleId
  // ghi path foot (đại diện); path góc resolve qua 'draw-line'/'angleBisectorAngle'.
  { dslKind: 'angleBisector',      sceneKind: 'line',    intentKey: 'angleBisectorFoot',  toolKey: 'angleBisector',  ruleId: 'cevian',         serialize: true,  evalFixture: null },
  { dslKind: 'tangent',            sceneKind: 'tangent', intentKey: 'draw-line',          toolKey: 'tangent',        ruleId: 'tangentFromExt', serialize: true,  evalFixture: null },
  { dslKind: 'lineThrough',        sceneKind: 'line',    intentKey: 'draw-line',          toolKey: null,             ruleId: 'eulerLine',      serialize: true,  evalFixture: 'src/stamps/geometry-2d/dsl/fixtures/euler-line.ts' },
  { dslKind: 'radicalAxis',        sceneKind: 'line',    intentKey: 'draw-line',          toolKey: null,             ruleId: 'radicalAxis',    serialize: true,  evalFixture: 'src/stamps/geometry-2d/dsl/fixtures/radical-axis.ts' },

  // ── polygons ────────────────────────────────────────────────────────────────
  { dslKind: 'polygon',            sceneKind: 'polygon', intentKey: 'draw-shape',         toolKey: 'square',         ruleId: 'triangle',       serialize: true,  evalFixture: null },

  // ── circles ─────────────────────────────────────────────────────────────────
  { dslKind: 'circleCP',           sceneKind: 'circle',  intentKey: 'draw-circle',        toolKey: 'circleCenter',   ruleId: 'circleRadius',   serialize: true,  evalFixture: null },
  { dslKind: 'circle3',            sceneKind: 'circle',  intentKey: 'draw-circle',        toolKey: 'circle3',        ruleId: 'circleTriangle', serialize: true,  evalFixture: null },
  { dslKind: 'circleDiameter',     sceneKind: 'circle',  intentKey: 'draw-circle',        toolKey: null,             ruleId: 'diameter-circle-pairwise', serialize: true, evalFixture: null },
  { dslKind: 'circleCR',           sceneKind: 'circle',  intentKey: 'draw-circle',        toolKey: null,             ruleId: 'circleRadius',   serialize: true,  evalFixture: null },
  { dslKind: 'incircle',           sceneKind: 'circle',  intentKey: 'draw-circle',        toolKey: 'incircle',       ruleId: 'circleTriangle', serialize: true,  evalFixture: null },
  { dslKind: 'excircle',           sceneKind: 'circle',  intentKey: null,                 toolKey: 'excircle',       ruleId: null,             serialize: true,  evalFixture: null },
];
