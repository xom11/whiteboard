// intent-corpus.curated.ts
//
// Curated golden corpus cho intentToDsl — mỗi entry là một SEQUENCE intent đầy
// đủ phủ MỘT builder branch (draw-shape mọi shape×variant, add-point mọi
// constraint kind, connect mọi style, draw-circle mọi spec, draw-line mọi kind,
// mark-shape). Mọi entry phải transpile-không-throw qua intentsToDsl.
//
// Dùng làm input cố định cho intentToDsl.golden.test.ts (lưới an toàn Mức 3).
import type { IntentT } from '../../intent';

// Helper triangle prefix dùng lại cho mọi case cần điểm A,B,C có sẵn.
const TRI: IntentT = { op: 'draw-shape', shape: 'triangle', variant: 'any', labels: ['A', 'B', 'C'] };

export const CURATED_CORPUS: { name: string; intents: IntentT[] }[] = [
  // ── 1. draw-shape mọi shape × variant ──────────────────────────────────────
  { name: 'triangle-any', intents: [{ op: 'draw-shape', shape: 'triangle', variant: 'any', labels: ['A', 'B', 'C'] }] as IntentT[] },
  { name: 'triangle-equilateral', intents: [{ op: 'draw-shape', shape: 'triangle', variant: 'equilateral', labels: ['A', 'B', 'C'] }] as IntentT[] },
  { name: 'triangle-isoceles-AB', intents: [{ op: 'draw-shape', shape: 'triangle', variant: 'isoceles-AB', labels: ['A', 'B', 'C'] }] as IntentT[] },
  { name: 'triangle-isoceles-BC', intents: [{ op: 'draw-shape', shape: 'triangle', variant: 'isoceles-BC', labels: ['A', 'B', 'C'] }] as IntentT[] },
  { name: 'triangle-isoceles-CA', intents: [{ op: 'draw-shape', shape: 'triangle', variant: 'isoceles-CA', labels: ['A', 'B', 'C'] }] as IntentT[] },
  { name: 'triangle-right-at-A', intents: [{ op: 'draw-shape', shape: 'triangle', variant: 'right-at-A', labels: ['A', 'B', 'C'] }] as IntentT[] },
  { name: 'triangle-right-at-B', intents: [{ op: 'draw-shape', shape: 'triangle', variant: 'right-at-B', labels: ['A', 'B', 'C'] }] as IntentT[] },
  { name: 'triangle-right-at-C', intents: [{ op: 'draw-shape', shape: 'triangle', variant: 'right-at-C', labels: ['A', 'B', 'C'] }] as IntentT[] },
  { name: 'square-standard', intents: [{ op: 'draw-shape', shape: 'square', variant: 'standard', labels: ['A', 'B', 'C', 'D'] }] as IntentT[] },
  { name: 'rectangle-standard', intents: [{ op: 'draw-shape', shape: 'rectangle', variant: 'standard', labels: ['A', 'B', 'C', 'D'] }] as IntentT[] },
  { name: 'rectangle-wide', intents: [{ op: 'draw-shape', shape: 'rectangle', variant: 'wide', labels: ['A', 'B', 'C', 'D'] }] as IntentT[] },
  { name: 'rectangle-tall', intents: [{ op: 'draw-shape', shape: 'rectangle', variant: 'tall', labels: ['A', 'B', 'C', 'D'] }] as IntentT[] },
  { name: 'rhombus-standard', intents: [{ op: 'draw-shape', shape: 'rhombus', variant: 'standard', labels: ['A', 'B', 'C', 'D'] }] as IntentT[] },
  { name: 'trapezoid-right', intents: [{ op: 'draw-shape', shape: 'trapezoid', variant: 'right', labels: ['A', 'B', 'C', 'D'] }] as IntentT[] },
  { name: 'trapezoid-isoceles', intents: [{ op: 'draw-shape', shape: 'trapezoid', variant: 'isoceles', labels: ['A', 'B', 'C', 'D'] }] as IntentT[] },
  { name: 'trapezoid-general', intents: [{ op: 'draw-shape', shape: 'trapezoid', variant: 'general', labels: ['A', 'B', 'C', 'D'] }] as IntentT[] },
  { name: 'parallelogram-standard', intents: [{ op: 'draw-shape', shape: 'parallelogram', variant: 'standard', labels: ['A', 'B', 'C', 'D'] }] as IntentT[] },
  { name: 'quadrilateral-any', intents: [{ op: 'draw-shape', shape: 'quadrilateral', variant: 'any', labels: ['A', 'B', 'C', 'D'] }] as IntentT[] },

  // ── 2. draw-shape + explicitCoords ─────────────────────────────────────────
  { name: 'triangle-explicitCoords', intents: [{ op: 'draw-shape', shape: 'triangle', variant: 'any', labels: ['A', 'B', 'C'], explicitCoords: { A: [1, 1] } }] as IntentT[] },

  // ── 3. add-point midpoint ──────────────────────────────────────────────────
  { name: 'midpoint-AB', intents: [TRI, { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'AB' } }] as IntentT[] },

  // ── 4. perpFoot ────────────────────────────────────────────────────────────
  { name: 'perpFoot', intents: [TRI, { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } }] as IntentT[] },

  // ── 5. centroid / circumcenter / incenter / orthocenter ────────────────────
  { name: 'centroid', intents: [TRI, { op: 'add-point', name: 'G', constraint: { kind: 'centroid', of: ['A', 'B', 'C'] } }] as IntentT[] },
  { name: 'circumcenter', intents: [TRI, { op: 'add-point', name: 'O', constraint: { kind: 'circumcenter', of: ['A', 'B', 'C'] } }] as IntentT[] },
  { name: 'incenter', intents: [TRI, { op: 'add-point', name: 'I', constraint: { kind: 'incenter', of: ['A', 'B', 'C'] } }] as IntentT[] },
  { name: 'orthocenter', intents: [TRI, { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] } }] as IntentT[] },

  // ── 6. intersection (dựng ABC + DEF) ───────────────────────────────────────
  { name: 'intersection', intents: [
      TRI,
      { op: 'draw-shape', shape: 'triangle', variant: 'any', labels: ['D', 'E', 'F'] },
      { op: 'add-point', name: 'K', constraint: { kind: 'intersection', of: ['AB', 'DE'] } },
    ] as IntentT[] },

  // ── 7. onSegment (có & không t) ────────────────────────────────────────────
  { name: 'onSegment-with-t', intents: [TRI, { op: 'add-point', name: 'P', constraint: { kind: 'onSegment', of: 'AB', t: 0.3 } }] as IntentT[] },
  { name: 'onSegment-no-t', intents: [TRI, { op: 'add-point', name: 'P', constraint: { kind: 'onSegment', of: 'AB' } }] as IntentT[] },

  // ── 8. free (có & không at) ────────────────────────────────────────────────
  { name: 'free-with-at', intents: [{ op: 'add-point', name: 'P', constraint: { kind: 'free', at: [2, 2] } }] as IntentT[] },
  { name: 'free-no-at', intents: [{ op: 'add-point', name: 'P', constraint: { kind: 'free' } }] as IntentT[] },

  // ── 9. secondIntersection ──────────────────────────────────────────────────
  { name: 'secondIntersection', intents: [
      TRI,
      { op: 'add-point', name: 'P', constraint: { kind: 'free', at: [2, 2] } },
      { op: 'draw-circle', name: 'O', spec: 'centerThrough', center: 'A', through: 'B' },
      { op: 'add-point', name: 'Q', constraint: { kind: 'secondIntersection', line: 'AB', circle: 'O', other: 'P' } },
    ] as IntentT[] },

  // ── 10. circleIntersection ─────────────────────────────────────────────────
  { name: 'circleIntersection', intents: [
      TRI,
      { op: 'draw-shape', shape: 'triangle', variant: 'any', labels: ['D', 'E', 'F'] },
      { op: 'draw-circle', name: 'O1', spec: 'centerThrough', center: 'A', through: 'B' },
      { op: 'draw-circle', name: 'O2', spec: 'centerThrough', center: 'D', through: 'E' },
      { op: 'add-point', name: 'X', constraint: { kind: 'circleIntersection', c1: 'O1', c2: 'O2', which: 0 } },
    ] as IntentT[] },

  // ── 11. tangencyPoint ──────────────────────────────────────────────────────
  { name: 'tangencyPoint', intents: [
      TRI,
      { op: 'draw-circle', name: 'O', spec: 'centerThrough', center: 'A', through: 'B' },
      { op: 'add-point', name: 'T', constraint: { kind: 'tangencyPoint', circle: 'O', onLine: 'AB' } },
    ] as IntentT[] },

  // ── 12. tangentPoint ───────────────────────────────────────────────────────
  { name: 'tangentPoint', intents: [
      TRI,
      { op: 'add-point', name: 'P', constraint: { kind: 'free', at: [8, 0] } },
      { op: 'draw-circle', name: 'O', spec: 'centerThrough', center: 'A', through: 'B' },
      { op: 'add-point', name: 'T', constraint: { kind: 'tangentPoint', from: 'P', circle: 'O', which: 0 } },
    ] as IntentT[] },

  // ── 13. angleBisectorFoot ──────────────────────────────────────────────────
  { name: 'angleBisectorFoot', intents: [TRI, { op: 'add-point', name: 'D', constraint: { kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' } }] as IntentT[] },

  // ── 14. arcMidpoint ────────────────────────────────────────────────────────
  { name: 'arcMidpoint', intents: [
      TRI,
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      { op: 'add-point', name: 'M', constraint: { kind: 'arcMidpoint', circle: 'O', a: 'A', b: 'B', notContaining: 'C' } },
    ] as IntentT[] },

  // ── 15. reflectPoint ───────────────────────────────────────────────────────
  { name: 'reflectPoint', intents: [
      TRI,
      { op: 'add-point', name: 'O', constraint: { kind: 'free', at: [1, 1] } },
      { op: 'add-point', name: 'P', constraint: { kind: 'reflectPoint', of: 'A', through: 'O' } },
    ] as IntentT[] },

  // ── 16. reflectLine ────────────────────────────────────────────────────────
  { name: 'reflectLine', intents: [TRI, { op: 'add-point', name: 'P', constraint: { kind: 'reflectLine', of: 'A', through: 'BC' } }] as IntentT[] },

  // ── 17. excenter ───────────────────────────────────────────────────────────
  { name: 'excenter', intents: [TRI, { op: 'add-point', name: 'J', constraint: { kind: 'excenter', of: ['A', 'B', 'C'], opposite: 'A' } }] as IntentT[] },

  // ── 18. rightAngleViewing (có & không which) ───────────────────────────────
  { name: 'rightAngleViewing-which', intents: [
      TRI,
      { op: 'add-point', name: 'M', constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'd', which: 0 } },
    ] as IntentT[] },
  { name: 'rightAngleViewing-no-which', intents: [
      TRI,
      { op: 'add-point', name: 'M', constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'd' } },
    ] as IntentT[] },

  // ── 19. pointAtDistance × 3 nguồn distance ─────────────────────────────────
  { name: 'pointAtDistance-literal', intents: [
      TRI,
      { op: 'add-point', name: 'C2', constraint: { kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'literal', value: 3 } } },
    ] as IntentT[] },
  { name: 'pointAtDistance-circleRadius', intents: [
      TRI,
      { op: 'draw-circle', name: 'O', spec: 'centerThrough', center: 'A', through: 'B' },
      { op: 'add-point', name: 'C2', constraint: { kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'circleRadius', circle: 'O' } } },
    ] as IntentT[] },
  { name: 'pointAtDistance-segmentLength', intents: [
      TRI,
      { op: 'add-point', name: 'C2', constraint: { kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'segmentLength', p1: 'A', p2: 'B' } } },
    ] as IntentT[] },

  // ── 20. connect mọi style (KHÔNG angleBisector — throw, test riêng Step 4) ──
  { name: 'connect-segment', intents: [TRI, { op: 'connect', from: 'A', to: 'B', style: 'segment' }] as IntentT[] },
  { name: 'connect-line', intents: [TRI, { op: 'connect', from: 'A', to: 'B', style: 'line' }] as IntentT[] },
  { name: 'connect-ray', intents: [TRI, { op: 'connect', from: 'A', to: 'B', style: 'ray' }] as IntentT[] },
  { name: 'connect-perpBisector', intents: [TRI, { op: 'connect', from: 'A', to: 'B', style: 'perpBisector' }] as IntentT[] },

  // ── 21. draw-circle mọi spec ───────────────────────────────────────────────
  { name: 'circle-centerThrough', intents: [TRI, { op: 'draw-circle', name: 'O', spec: 'centerThrough', center: 'A', through: 'B' }] as IntentT[] },
  { name: 'circle-through3', intents: [TRI, { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] }] as IntentT[] },
  { name: 'circle-centerRadius', intents: [TRI, { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'K', radius: 3 }] as IntentT[] },
  { name: 'circle-inscribedIn', intents: [TRI, { op: 'draw-circle', name: 'O', spec: 'inscribedIn', triangle: ['A', 'B', 'C'] }] as IntentT[] },

  // ── 22. draw-line mọi kind ─────────────────────────────────────────────────
  { name: 'line-perpThrough', intents: [TRI, { op: 'draw-line', name: 'd', kind: 'perpThrough', through: 'A', to: 'BC' }] as IntentT[] },
  { name: 'line-parallelThrough', intents: [TRI, { op: 'draw-line', name: 'd', kind: 'parallelThrough', through: 'A', to: 'BC' }] as IntentT[] },
  { name: 'line-tangentAt', intents: [
      TRI,
      { op: 'draw-circle', name: 'O', spec: 'centerThrough', center: 'B', through: 'A' },
      { op: 'draw-line', name: 't', kind: 'tangentAt', through: 'A', circle: 'O' },
    ] as IntentT[] },
  { name: 'line-tangentFromExt-both', intents: [
      TRI,
      { op: 'add-point', name: 'P', constraint: { kind: 'free', at: [8, 0] } },
      { op: 'draw-circle', name: 'O', spec: 'centerThrough', center: 'A', through: 'B' },
      { op: 'draw-line', name: 't', kind: 'tangentFromExt', from: 'P', circle: 'O', which: 'both' },
    ] as IntentT[] },
  { name: 'line-tangentFromExt-first', intents: [
      TRI,
      { op: 'add-point', name: 'P', constraint: { kind: 'free', at: [8, 0] } },
      { op: 'draw-circle', name: 'O', spec: 'centerThrough', center: 'A', through: 'B' },
      { op: 'draw-line', name: 't', kind: 'tangentFromExt', from: 'P', circle: 'O', which: 'first' },
    ] as IntentT[] },

  // ── 23. mark-shape (sub-shape từ điểm đã có) ───────────────────────────────
  { name: 'mark-shape', intents: [TRI, { op: 'mark-shape', shape: 'triangle', labels: ['A', 'B', 'C'] }] as IntentT[] },
];
