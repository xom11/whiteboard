// src/core/scene/kinds/__tests__/point.describe.golden.test.ts
//
// DESCRIBE golden baseline cho point.ts (Mức 3 Phase 4 — issue #45).
//
// Đóng băng output describe(obj, state) cho MỌI constraint kind (+ transformed ×5
// transform variant + pointAtDistance ×3 distance variant). Sinh trên code CHƯA
// refactor; commit làm baseline. Phase 4 tách describe-switch → registry phải giữ
// output BYTE-IDENTICAL (0 snapshots written). state cấp label cho ref ids để
// describe render label thay vì raw id.
import { getKind } from '../../registry';
import '../../kinds';
import type { SceneObject, State } from '../../types';
import { createEmptyState } from '../../types';

const mkPt = (id: string, label: string, constraint: unknown): SceneObject => ({
  id, kind: 'point', label, visible: true, locked: false, layer: 'default', schemaVersion: 1,
  attrs: { constraint } as never,
});

// state có label cho refs để describe render label thay vì id.
function stateWith(labels: Record<string, string>): State {
  const base = createEmptyState('2d');
  const objects: Record<string, SceneObject> = {};
  for (const [id, label] of Object.entries(labels)) {
    objects[id] = mkPt(id, label, { kind: 'free', x: 0, y: 0 });
  }
  return { ...base, objects };
}

const CASES: { name: string; obj: SceneObject; state: State }[] = [
  { name: 'free', obj: mkPt('P', 'P', { kind: 'free', x: 0, y: 0 }), state: createEmptyState('2d') },
  { name: 'onAxis-x', obj: mkPt('P', 'P', { kind: 'onAxis', axis: 'x', t: 4 }), state: createEmptyState('2d') },
  { name: 'onAxis-y', obj: mkPt('P', 'P', { kind: 'onAxis', axis: 'y', t: 4 }), state: createEmptyState('2d') },
  { name: 'onLine', obj: mkPt('G', 'G', { kind: 'onLine', lineId: 'ln', t: 0.3 }), state: stateWith({ ln: 'd' }) },
  { name: 'onSegment', obj: mkPt('G', 'G', { kind: 'onSegment', segmentId: 'sg', t: 0.4 }), state: stateWith({ sg: 'AB' }) },
  { name: 'onCircle', obj: mkPt('G', 'G', { kind: 'onCircle', circleId: 'k', theta: 0.5 }), state: stateWith({ k: 'O' }) },
  { name: 'onPolygon', obj: mkPt('G', 'G', { kind: 'onPolygon', polygonId: 'pg', u: 0.2, v: 0.3 }), state: stateWith({ pg: 'ABC' }) },
  { name: 'midpoint', obj: mkPt('M', 'M', { kind: 'midpoint', p1: 'a', p2: 'b' }), state: stateWith({ a: 'A', b: 'B' }) },

  // transformed ×5 — describe rẽ theo transform.kind
  { name: 'transformed-translate', obj: mkPt('S2', "S'", { kind: 'transformed', source: 's', transform: { kind: 'translate', dx: 1.5, dy: 2.5 } }), state: stateWith({ s: 'S' }) },
  { name: 'transformed-rotate', obj: mkPt('S2', "S'", { kind: 'transformed', source: 's', transform: { kind: 'rotate', angleRad: Math.PI / 2, center: 'o' } }), state: stateWith({ s: 'S', o: 'O' }) },
  { name: 'transformed-reflectLine', obj: mkPt('S2', "S'", { kind: 'transformed', source: 's', transform: { kind: 'reflectLine', line: 'l' } }), state: stateWith({ s: 'S', l: 'd' }) },
  { name: 'transformed-reflectPoint', obj: mkPt('S2', "S'", { kind: 'transformed', source: 's', transform: { kind: 'reflectPoint', center: 'o' } }), state: stateWith({ s: 'S', o: 'O' }) },
  { name: 'transformed-dilate', obj: mkPt('S2', "S'", { kind: 'transformed', source: 's', transform: { kind: 'dilate', k: 2, center: 'o' } }), state: stateWith({ s: 'S', o: 'O' }) },

  { name: 'perpFoot', obj: mkPt('H', 'H', { kind: 'perpFoot', from: 'p', onLine: 'ln' }), state: stateWith({ p: 'P', ln: 'd' }) },
  { name: 'circumcenter', obj: mkPt('O', 'O', { kind: 'circumcenter', vertices: ['a', 'b', 'c'] }), state: stateWith({ a: 'A', b: 'B', c: 'C' }) },
  { name: 'incenter', obj: mkPt('I', 'I', { kind: 'incenter', vertices: ['a', 'b', 'c'] }), state: stateWith({ a: 'A', b: 'B', c: 'C' }) },
  { name: 'centroid', obj: mkPt('G', 'G', { kind: 'centroid', vertices: ['a', 'b', 'c'] }), state: stateWith({ a: 'A', b: 'B', c: 'C' }) },
  { name: 'orthocenter', obj: mkPt('H', 'H', { kind: 'orthocenter', vertices: ['a', 'b', 'c'] }), state: stateWith({ a: 'A', b: 'B', c: 'C' }) },
  { name: 'tangentPointExt', obj: mkPt('T', 'T', { kind: 'tangentPointExt', from: 'p', circle: 'k', which: 0 }), state: stateWith({ p: 'P', k: 'O' }) },
  { name: 'arcMidpoint', obj: mkPt('Mid', 'M', { kind: 'arcMidpoint', circle: 'k', a: 'a', b: 'b', notContaining: 'n' }), state: stateWith({ k: 'O', a: 'A', b: 'B', n: 'C' }) },
  { name: 'excenter', obj: mkPt('J', 'J', { kind: 'excenter', vertices: ['a', 'b', 'c'], opposite: 'a' }), state: stateWith({ a: 'A', b: 'B', c: 'C' }) },

  // pointAtDistance ×3 — describe rẽ theo distance.kind
  { name: 'pointAtDistance-literal', obj: mkPt('C', 'C', { kind: 'pointAtDistance', from: 'a', through: 'b', distance: { kind: 'literal', value: 3 } }), state: stateWith({ a: 'A', b: 'B' }) },
  { name: 'pointAtDistance-segmentLength', obj: mkPt('C', 'C', { kind: 'pointAtDistance', from: 'a', through: 'b', distance: { kind: 'segmentLength', p1: 'p', p2: 'q' } }), state: stateWith({ a: 'A', b: 'B', p: 'P', q: 'Q' }) },
  { name: 'pointAtDistance-circleRadius', obj: mkPt('C', 'C', { kind: 'pointAtDistance', from: 'a', through: 'b', distance: { kind: 'circleRadius', circle: 'k' } }), state: stateWith({ a: 'A', b: 'B', k: 'O' }) },

  // kind KHÔNG có describe-arm riêng → fallback `Điểm ${label}`
  { name: 'circleIntersection-fallback', obj: mkPt('X', 'X', { kind: 'circleIntersection', c1: 'k1', c2: 'k2', which: 0 }), state: stateWith({ k1: 'O1', k2: 'O2' }) },
  { name: 'secondIntersection-fallback', obj: mkPt('C', 'C', { kind: 'secondIntersection', line: 'ln', circle: 'k', other: 'a' }), state: stateWith({ ln: 'd', k: 'O', a: 'A' }) },
  { name: 'tangencyPoint-fallback', obj: mkPt('H', 'H', { kind: 'tangencyPoint', circle: 'k', onLine: 'ln' }), state: stateWith({ k: 'O', ln: 'd' }) },
  { name: 'onPerpendicular-fallback', obj: mkPt('G', 'G', { kind: 'onPerpendicular', through: 't', perpToA: 'a', perpToB: 'b', t: 1 }), state: stateWith({ t: 'T', a: 'A', b: 'B' }) },
  { name: 'onPerpBisector-fallback', obj: mkPt('G', 'G', { kind: 'onPerpBisector', p1: 'a', p2: 'b', t: 1 }), state: stateWith({ a: 'A', b: 'B' }) },
  { name: 'onCircleAroundPoint-fallback', obj: mkPt('G', 'G', { kind: 'onCircleAroundPoint', center: 'c', radiusPoint: 'r', theta: 0.7 }), state: stateWith({ c: 'C', r: 'R' }) },
];

describe('point describe — golden (Phase 4)', () => {
  const def = getKind('point');
  for (const c of CASES) {
    test(c.name, () => {
      expect(def.describe(c.obj, c.state)).toMatchSnapshot();
    });
  }
});
