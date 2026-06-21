// src/core/scene/kinds/constraint3d-math.ts
// Toán constraint THUẦN cho 3D — chuyển từ stamps/geometry-3d/editor/scene/constraintMath.ts
// về core (chỉ phụ thuộc type core: Constraint3D + State + *3DAttrs) để point3d.render
// (core) có thể dùng mà KHÔNG vi phạm layering core→stamps. stamps/.../constraintMath.ts
// re-export file này (giữ mọi import cũ). Import *3DAttrs là type-only → không vòng runtime.
import type { State, SceneObject } from '../types';
import type { Constraint3D } from './3d-constraint';
import type { Point3DAttrs } from './point3d';
import type { Segment3DAttrs } from './segment3d';
import type { Line3DAttrs, Line3DConstruction } from './line3d';
import type { Ray3DAttrs } from './ray3d';
import type { Vector3DAttrs } from './vector3d';
import type { Plane3DAttrs, Plane3DConstruction } from './plane3d';
import type { Polygon3DAttrs } from './polygon3d';
import type { Sphere3DAttrs } from './sphere3d';

export type Vec3 = [number, number, number];

function sub(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function add(a: Vec3, b: Vec3): Vec3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale(a: Vec3, k: number): Vec3 { return [a[0] * k, a[1] * k, a[2] * k]; }
function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a: Vec3): number { return Math.sqrt(dot(a, a)); }
function normalize(a: Vec3): Vec3 { const n = norm(a); return n === 0 ? a : scale(a, 1 / n); }

// Chống tràn stack khi State có CHU TRÌNH tham chiếu (điểm/mặt construction trỏ
// vòng — không tạo được bằng thao tác UI tuần tự, nhưng LOAD JSON hỏng/sửa-tay/
// AI-gen có thể). Đếm độ sâu đệ quy CHUNG cho constraintToWorld + planeConstruction
// World; vượt ngưỡng → throw lỗi MÔ TẢ ĐƯỢC (create() bắt + log) thay vì RangeError
// sập board mỗi frame. (Chu trình thật nên chặn acyclic ở reducer — follow-up.)
const MAX_REC_DEPTH = 512;
let _recDepth = 0;

function getPointWorld(id: string, state: State): Vec3 {
  const obj = state.objects[id];
  if (!obj || obj.kind !== 'point3d') {
    throw new Error(`constraintMath: point ${id} not found`);
  }
  const attrs = obj.attrs as Point3DAttrs;
  return constraintToWorld(attrs.constraint, state);
}

function getPlaneBasis(
  planeObj: SceneObject<Plane3DAttrs>,
  state: State,
): { origin: Vec3; basis1: Vec3; basis2: Vec3; normal: Vec3 } {
  const a = planeObj.attrs;
  let p1: Vec3, p2: Vec3, p3: Vec3;
  if (a.construction) {
    // Mặt construction (qua điểm ∥/⊥) → 3 điểm tính từ planeConstructionWorld.
    const r = planeConstructionWorld(a.construction, state);
    p1 = r.p1; p2 = r.p2; p3 = r.p3;
  } else {
    p1 = getPointWorld(a.p1!, state);
    p2 = getPointWorld(a.p2!, state);
    p3 = getPointWorld(a.p3!, state);
  }
  const basis1 = sub(p2, p1);
  const tmp = sub(p3, p1);
  const normal = normalize(cross(basis1, tmp));
  const basis2 = cross(normal, basis1);
  return { origin: p1, basis1, basis2, normal };
}

// 2 vector đơn vị vuông góc với pháp tuyến n (dựng cặp chỉ phương cho mặt ⊥ đường).
function orthoBasisFromNormal(n: Vec3): { basis1: Vec3; basis2: Vec3 } {
  const seed: Vec3 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const basis1 = normalize(cross(n, seed));
  const basis2 = cross(n, basis1);
  return { basis1, basis2 };
}

// 3 điểm (p1,p2,p3) xác định MẶT phái sinh. Hàm THUẦN — renderer gọi mỗi eval.
export function planeConstructionWorld(c: Plane3DConstruction, state: State): { p1: Vec3; p2: Vec3; p3: Vec3 } {
  if (_recDepth >= MAX_REC_DEPTH) throw new Error('planeConstructionWorld: đệ quy quá sâu — chu trình tham chiếu mặt?');
  _recDepth++;
  try {
    return planeConstructionWorldInner(c, state);
  } finally {
    _recDepth--;
  }
}

function planeConstructionWorldInner(c: Plane3DConstruction, state: State): { p1: Vec3; p2: Vec3; p3: Vec3 } {
  switch (c.kind) {
    case 'planeParallelThrough': {
      const P = getPointWorld(c.point, state);
      const ref = state.objects[c.refPlane];
      if (!ref || ref.kind !== 'plane3d') throw new Error('planeParallelThrough: mặt tham chiếu thiếu');
      const { basis1, basis2 } = getPlaneBasis(ref as SceneObject<Plane3DAttrs>, state);
      // refPlane suy biến (3 điểm thẳng hàng) → basis2≈0 → mặt phái sinh suy biến.
      // Fallback cặp chỉ phương chuẩn để mặt vẫn xác định (hữu hạn).
      if (norm(basis1) < 1e-12 || norm(basis2) < 1e-12) {
        return { p1: P, p2: add(P, [1, 0, 0]), p3: add(P, [0, 1, 0]) };
      }
      return { p1: P, p2: add(P, basis1), p3: add(P, basis2) };
    }
    case 'planePerpToLine': {
      const P = getPointWorld(c.point, state);
      const dir = sub(getPointWorld(c.lineB, state), getPointWorld(c.lineA, state));
      const dn = norm(dir);
      if (dn < 1e-12) return { p1: P, p2: add(P, [1, 0, 0]), p3: add(P, [0, 1, 0]) }; // hướng suy biến → fallback
      const { basis1, basis2 } = orthoBasisFromNormal(scale(dir, 1 / dn));
      return { p1: P, p2: add(P, basis1), p3: add(P, basis2) };
    }
    default: {
      const _exhaustive: never = c;
      void _exhaustive;
      throw new Error('planeConstructionWorld: kind không hỗ trợ');
    }
  }
}

// 2 id điểm xác định một đường: line3d/segment3d (p1,p2), ray3d (origin,through),
// vector3d (from,to). null nếu object không phải đường.
function lineDefiningPointIds(line: SceneObject): [string, string] | null {
  if (line.kind === 'line3d' || line.kind === 'segment3d') {
    const a = line.attrs as Segment3DAttrs | Line3DAttrs;
    // line3d construction-variant không có p1/p2 → không cấp 2 điểm gốc theo cách này.
    return a.p1 && a.p2 ? [a.p1, a.p2] : null;
  }
  if (line.kind === 'ray3d') {
    const a = line.attrs as Ray3DAttrs;
    return [a.origin, a.through];
  }
  if (line.kind === 'vector3d') {
    const a = line.attrs as Vector3DAttrs;
    return [a.from, a.to];
  }
  return null;
}

// Toạ độ world của 2 điểm xác định đường `lineId`.
function lineEndpointsWorld(lineId: string, state: State, ctx: string): { a: Vec3; b: Vec3 } {
  const line = state.objects[lineId];
  if (!line) throw new Error(`${ctx}: đường ${lineId} không tồn tại`);
  const ids = lineDefiningPointIds(line);
  if (!ids) throw new Error(`${ctx}: kind ${line.kind} không phải đường`);
  return { a: getPointWorld(ids[0], state), b: getPointWorld(ids[1], state) };
}

// Trung điểm đoạn vuông góc chung của 2 đường (A,B) & (C,D): đồng phẳng cắt nhau →
// chính giao điểm; chéo nhau → trung điểm đoạn nối 2 điểm gần nhất. Song song/trùng
// (denom≈0) → vô định, trả trung điểm A,C (hiếm; UI nên chặn chọn 2 đường song song).
function lineLineClosestMidpoint(A: Vec3, B: Vec3, C: Vec3, D: Vec3): Vec3 {
  const u = sub(B, A), v = sub(D, C), w0 = sub(A, C);
  const a = dot(u, u), b = dot(u, v), cc = dot(v, v), d = dot(u, w0), e = dot(v, w0);
  const denom = a * cc - b * b;
  if (Math.abs(denom) < 1e-12) return scale(add(A, C), 0.5);
  const sc = (b * e - cc * d) / denom;
  const tc = (a * e - b * d) / denom;
  return scale(add(add(A, scale(u, sc)), add(C, scale(v, tc))), 0.5);
}

// ───── Math cho ĐƯỜNG/MẶT phái sinh (construction-variant, v1.5) ─────

// origin + unit-normal của mặt phẳng theo id (bọc getPlaneBasis).
function planeOriginNormal(planeId: string, state: State, ctx: string): { origin: Vec3; normal: Vec3 } {
  const plane = state.objects[planeId];
  if (!plane || plane.kind !== 'plane3d') throw new Error(`${ctx}: mặt phẳng ${planeId} thiếu`);
  const { origin, normal } = getPlaneBasis(plane as SceneObject<Plane3DAttrs>, state);
  return { origin, normal };
}

// 2 điểm (a,b) xác định đường phái sinh. Hàm THUẦN — renderer gọi mỗi eval để
// live-update. Cấu hình suy biến (song song…) → fallback hữu hạn (không NaN).
export function lineConstructionWorld(c: Line3DConstruction, state: State): { a: Vec3; b: Vec3 } {
  switch (c.kind) {
    case 'planePlaneIntersection': {
      const P1 = planeOriginNormal(c.plane1, state, 'planePlaneIntersection');
      const P2 = planeOriginNormal(c.plane2, state, 'planePlaneIntersection');
      const d = cross(P1.normal, P2.normal); // hướng giao tuyến = n1 × n2
      const dd = dot(d, d);
      if (dd < 1e-12) {
        // 2 mặt song song/trùng → không có giao tuyến xác định: fallback hữu hạn.
        return { a: P1.origin, b: add(P1.origin, P2.normal) };
      }
      // Điểm trên giao tuyến: p0 = (c1·(n2×d) + c2·(d×n1)) / |d|², ci = ni·oi.
      const c1 = dot(P1.normal, P1.origin);
      const c2 = dot(P2.normal, P2.origin);
      const p0 = scale(add(scale(cross(P2.normal, d), c1), scale(cross(d, P1.normal), c2)), 1 / dd);
      return { a: p0, b: add(p0, d) };
    }
    case 'lineParallelThrough': {
      const P = getPointWorld(c.point, state);
      const dir = sub(getPointWorld(c.dirB, state), getPointWorld(c.dirA, state));
      if (norm(dir) < 1e-12) return { a: P, b: add(P, [1, 0, 0]) }; // hướng suy biến → fallback hữu hạn (đồng bộ siblings)
      return { a: P, b: add(P, dir) };
    }
    case 'linePerpToPlane': {
      const P = getPointWorld(c.point, state);
      const { normal } = planeOriginNormal(c.plane, state, 'linePerpToPlane');
      return { a: P, b: add(P, normal) }; // hướng = pháp tuyến (đã chuẩn hoá)
    }
    default: {
      const _exhaustive: never = c;
      void _exhaustive;
      throw new Error('lineConstructionWorld: kind không hỗ trợ');
    }
  }
}

export function constraintToWorld(c: Constraint3D, state: State): Vec3 {
  // Check TRƯỚC khi tăng (cân bằng: throw không tăng → finally không decrement
  // lệch; counter luôn về 0 sau unwind).
  if (_recDepth >= MAX_REC_DEPTH) throw new Error('constraintToWorld: đệ quy quá sâu — chu trình tham chiếu?');
  _recDepth++;
  try {
    return constraintToWorldInner(c, state);
  } finally {
    _recDepth--;
  }
}

function constraintToWorldInner(c: Constraint3D, state: State): Vec3 {
  switch (c.kind) {
    case 'free': return [c.x, c.y, c.z];
    case 'onGround': return [c.x, c.y, 0];
    case 'onAxis': {
      if (c.axis === 'x') return [c.t, 0, 0];
      if (c.axis === 'y') return [0, c.t, 0];
      return [0, 0, c.t];
    }
    case 'onPlane': {
      const plane = state.objects[c.planeId];
      if (!plane || plane.kind !== 'plane3d') throw new Error('onPlane: plane missing');
      const { origin, basis1, basis2 } = getPlaneBasis(plane as SceneObject<Plane3DAttrs>, state);
      return add(add(origin, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case 'onLine': {
      const { a, b } = lineEndpointsWorld(c.lineId, state, 'onLine');
      return add(a, scale(sub(b, a), c.t));
    }
    case 'onPolygon': {
      const pg = state.objects[c.polygonId];
      if (!pg || pg.kind !== 'polygon3d') throw new Error('onPolygon: parent missing');
      const v = (pg.attrs as Polygon3DAttrs).vertices;
      if (v.length < 3) throw new Error('onPolygon: < 3 vertices');
      const p1 = getPointWorld(v[0], state);
      const p2 = getPointWorld(v[1], state);
      const p3 = getPointWorld(v[2], state);
      const basis1 = sub(p2, p1);
      const tmp = sub(p3, p1);
      const normal = normalize(cross(basis1, tmp));
      const basis2 = cross(normal, basis1);
      return add(add(p1, scale(basis1, c.u)), scale(basis2, c.v));
    }
    case 'onSphere': {
      const sph = state.objects[c.sphereId];
      if (!sph || sph.kind !== 'sphere3d') throw new Error('onSphere: parent missing');
      const a = sph.attrs as Sphere3DAttrs;
      const center = getPointWorld(a.center, state);
      const surface = getPointWorld(a.surfacePoint, state);
      const radius = norm(sub(surface, center));
      const x = center[0] + radius * Math.sin(c.phi) * Math.cos(c.theta);
      const y = center[1] + radius * Math.sin(c.phi) * Math.sin(c.theta);
      const z = center[2] + radius * Math.cos(c.phi);
      return [x, y, z];
    }
    // ───── Điểm phái sinh (v1) ─────
    case 'midpoint': {
      const p1 = getPointWorld(c.p1, state);
      const p2 = getPointWorld(c.p2, state);
      return scale(add(p1, p2), 0.5);
    }
    case 'centroid': {
      const n = c.vertices.length;
      if (n === 0) return [0, 0, 0];
      let acc: Vec3 = [0, 0, 0];
      for (const id of c.vertices) acc = add(acc, getPointWorld(id, state));
      return scale(acc, 1 / n);
    }
    case 'intersectionLines': {
      const A = getPointWorld(c.a1, state), B = getPointWorld(c.b1, state);
      const C = getPointWorld(c.a2, state), D = getPointWorld(c.b2, state);
      return lineLineClosestMidpoint(A, B, C, D);
    }
    case 'intersectionLinePlane': {
      const A = getPointWorld(c.a, state), B = getPointWorld(c.b, state);
      const plane = state.objects[c.plane];
      if (!plane || plane.kind !== 'plane3d') throw new Error('intersectionLinePlane: mặt phẳng thiếu');
      const { origin, normal } = getPlaneBasis(plane as SceneObject<Plane3DAttrs>, state);
      const dir = sub(B, A);
      const dn = dot(dir, normal);
      if (Math.abs(dn) < 1e-12) return A; // đường song song mặt phẳng → vô định
      const t = dot(sub(origin, A), normal) / dn;
      return add(A, scale(dir, t));
    }
    case 'perpFootLine': {
      // Hình chiếu vuông góc của `from` lên đường (a,b).
      const P = getPointWorld(c.from, state);
      const A = getPointWorld(c.a, state), B = getPointWorld(c.b, state);
      const u = sub(B, A);
      const uu = dot(u, u);
      const t = uu === 0 ? 0 : dot(sub(P, A), u) / uu;
      return add(A, scale(u, t));
    }
    case 'perpFootPlane': {
      // Chân ⊥ xuống mặt: P − ((P−origin)·n) n.
      const P = getPointWorld(c.from, state);
      const plane = state.objects[c.plane];
      if (!plane || plane.kind !== 'plane3d') throw new Error('perpFootPlane: mặt phẳng thiếu');
      const { origin, normal } = getPlaneBasis(plane as SceneObject<Plane3DAttrs>, state);
      const dist = dot(sub(P, origin), normal);
      return sub(P, scale(normal, dist));
    }
  }
}

export function worldToConstraint(current: Constraint3D, world: Vec3, state: State): Constraint3D {
  switch (current.kind) {
    case 'free': return { kind: 'free', x: world[0], y: world[1], z: world[2] };
    case 'onGround': return { kind: 'onGround', x: world[0], y: world[1] };
    case 'onAxis': {
      const t = current.axis === 'x' ? world[0] : current.axis === 'y' ? world[1] : world[2];
      return { kind: 'onAxis', axis: current.axis, t };
    }
    case 'onPlane': {
      const plane = state.objects[current.planeId];
      if (!plane || plane.kind !== 'plane3d') return current;
      const { origin, basis1, basis2 } = getPlaneBasis(plane as SceneObject<Plane3DAttrs>, state);
      const rel = sub(world, origin);
      const b1n = dot(basis1, basis1);
      const b2n = dot(basis2, basis2);
      const u = b1n === 0 ? 0 : dot(rel, basis1) / b1n;
      const v = b2n === 0 ? 0 : dot(rel, basis2) / b2n;
      return { kind: 'onPlane', planeId: current.planeId, u, v };
    }
    case 'onLine': {
      const line = state.objects[current.lineId];
      if (!line) return current;
      let p1Id: string;
      let p2Id: string;
      if (line.kind === 'line3d' || line.kind === 'segment3d') {
        const a = line.attrs as Segment3DAttrs | Line3DAttrs;
        if (!a.p1 || !a.p2) return current; // line3d construction-variant: không kéo được trên nó
        p1Id = a.p1; p2Id = a.p2;
      } else if (line.kind === 'ray3d') {
        const a = line.attrs as Ray3DAttrs;
        p1Id = a.origin; p2Id = a.through;
      } else if (line.kind === 'vector3d') {
        const a = line.attrs as Vector3DAttrs;
        p1Id = a.from; p2Id = a.to;
      } else {
        return current;
      }
      const p1 = getPointWorld(p1Id, state);
      const p2 = getPointWorld(p2Id, state);
      const dir = sub(p2, p1);
      const len2 = dot(dir, dir);
      const t = len2 === 0 ? 0 : dot(sub(world, p1), dir) / len2;
      return { kind: 'onLine', lineId: current.lineId, t };
    }
    case 'onPolygon': {
      const pg = state.objects[current.polygonId];
      if (!pg || pg.kind !== 'polygon3d') return current;
      const vertices = (pg.attrs as Polygon3DAttrs).vertices;
      if (vertices.length < 3) return current;
      const p1 = getPointWorld(vertices[0], state);
      const p2 = getPointWorld(vertices[1], state);
      const p3 = getPointWorld(vertices[2], state);
      const basis1 = sub(p2, p1);
      const tmp = sub(p3, p1);
      const normal = normalize(cross(basis1, tmp));
      const basis2 = cross(normal, basis1);
      const rel = sub(world, p1);
      const b1n = dot(basis1, basis1);
      const b2n = dot(basis2, basis2);
      const u = b1n === 0 ? 0 : dot(rel, basis1) / b1n;
      const v = b2n === 0 ? 0 : dot(rel, basis2) / b2n;
      return { kind: 'onPolygon', polygonId: current.polygonId, u, v };
    }
    case 'onSphere': {
      const sph = state.objects[current.sphereId];
      if (!sph || sph.kind !== 'sphere3d') return current;
      const center = getPointWorld((sph.attrs as Sphere3DAttrs).center, state);
      const rel = sub(world, center);
      const r = norm(rel);
      if (r === 0) return current;
      const phi = Math.acos(rel[2] / r);
      const theta = Math.atan2(rel[1], rel[0]);
      return { kind: 'onSphere', sphereId: current.sphereId, theta, phi };
    }
    // Điểm PHÁI SINH (midpoint/centroid/intersection*/perpFoot…) KHÔNG kéo được
    // → trả constraint hiện tại không đổi (giống điểm derived 2D worldToConstraint).
    // Liệt kê TƯỜNG MINH + never-guard (mô phỏng constraintRefs): thêm constraint
    // kind KÉO ĐƯỢC mới mà quên arm ở đây sẽ bị compiler chặn, không âm thầm hoá
    // non-draggable.
    case 'midpoint':
    case 'centroid':
    case 'intersectionLines':
    case 'intersectionLinePlane':
    case 'perpFootLine':
    case 'perpFootPlane':
      return current;
    default: {
      const _exhaustive: never = current;
      void _exhaustive;
      return current;
    }
  }
}
