// src/stamps/geometry-3d/editor/tools/handlers/construct3d.ts
// Handler dựng ĐƯỜNG/MẶT phái sinh 3D (construction-variant, v1.5). Khác
// derived.ts (điểm phái sinh): ở đây tạo object line3d/plane3d với `construction`.
import type { CollectedArg } from '../spec';
import type { Store, SceneObject } from '../../../../../core/scene';
import { nextLabel } from '../../../../../core/scene';
import type { SceneHit } from '../../hitTest/hitTest';
import { ensurePoint, hitObjectId } from './_ensurePoint';

function addShape(store: Store, kind: string, prefix: string, attrs: Record<string, unknown>): string {
  const id = `${prefix}${store.getState().counter + 1}`;
  const label = nextLabel(store.getState(), kind);
  const obj: SceneObject = {
    id, kind, label, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs,
  };
  store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}

// Id mặt phẳng từ các bước 'object' (theo thứ tự chọn).
function objectPlaneIds(args: CollectedArg[]): (string | null)[] {
  return args.filter((a) => a.step.type === 'object' && a.hit).map((a) => hitObjectId(a.hit!));
}

// Hit của các bước 'point' (theo thứ tự chọn).
function pointHits(args: CollectedArg[]): SceneHit[] {
  return args.filter((a) => a.step.type === 'point' && a.hit).map((a) => a.hit!);
}

// 2 hit cùng trỏ một điểm có sẵn → suy biến (kiểm TRƯỚC ensurePoint để không tạo
// điểm mồ côi — xem derived.ts).
function sameExistingPoint(h1: SceneHit | undefined, h2: SceneHit | undefined): boolean {
  return (
    !!h1 && !!h2 &&
    h1.kind === 'existingPoint' && h2.kind === 'existingPoint' &&
    h1.pointId === h2.pointId
  );
}

/** Giao tuyến 2 mặt phẳng → line3d construction planePlaneIntersection. */
export function buildPlanePlaneIntersection(args: CollectedArg[], store: Store): string | null {
  const planes = objectPlaneIds(args);
  if (planes.length < 2 || !planes[0] || !planes[1] || planes[0] === planes[1]) return null;
  return addShape(store, 'line3d', 'l', {
    construction: { kind: 'planePlaneIntersection', plane1: planes[0], plane2: planes[1] },
  });
}

/** Đường qua điểm P song song hướng dirA→dirB → line3d construction. */
export function buildLineParallelThrough(args: CollectedArg[], store: Store): string | null {
  const hits = pointHits(args);
  if (hits.length < 3 || sameExistingPoint(hits[1], hits[2])) return null; // hướng suy biến
  const point = ensurePoint(hits[0], store);
  const dirA = ensurePoint(hits[1], store);
  const dirB = ensurePoint(hits[2], store);
  if (!point || !dirA || !dirB || dirA === dirB) return null;
  return addShape(store, 'line3d', 'l', { construction: { kind: 'lineParallelThrough', point, dirA, dirB } });
}

/** Đường qua điểm P vuông góc mặt phẳng → line3d construction. */
export function buildLinePerpToPlane(args: CollectedArg[], store: Store): string | null {
  const plane = objectPlaneIds(args)[0];
  if (!plane) return null;
  const hits = pointHits(args);
  if (hits.length < 1) return null;
  const point = ensurePoint(hits[0], store);
  if (!point) return null;
  return addShape(store, 'line3d', 'l', { construction: { kind: 'linePerpToPlane', point, plane } });
}

/** Mặt qua điểm P song song mặt refPlane → plane3d construction. */
export function buildPlaneParallelThrough(args: CollectedArg[], store: Store): string | null {
  const refPlane = objectPlaneIds(args)[0];
  if (!refPlane) return null;
  const hits = pointHits(args);
  if (hits.length < 1) return null;
  const point = ensurePoint(hits[0], store);
  if (!point) return null;
  return addShape(store, 'plane3d', 'mp', { construction: { kind: 'planeParallelThrough', point, refPlane } });
}

/** Mặt qua điểm P vuông góc hướng lineA→lineB → plane3d construction. */
export function buildPlanePerpToLine(args: CollectedArg[], store: Store): string | null {
  const hits = pointHits(args);
  if (hits.length < 3 || sameExistingPoint(hits[1], hits[2])) return null; // hướng suy biến
  const point = ensurePoint(hits[0], store);
  const lineA = ensurePoint(hits[1], store);
  const lineB = ensurePoint(hits[2], store);
  if (!point || !lineA || !lineB || lineA === lineB) return null;
  return addShape(store, 'plane3d', 'mp', { construction: { kind: 'planePerpToLine', point, lineA, lineB } });
}
