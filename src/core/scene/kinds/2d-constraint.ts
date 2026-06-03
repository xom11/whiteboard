// src/core/scene/kinds/2d-constraint.ts
export type Vec2 = [number, number];

/**
 * Phép biến hình áp dụng lên một điểm. Tham số là id điểm/đường gốc, không phải
 * giá trị toạ độ — để dependency graph cập nhật đúng khi user kéo gốc.
 *
 * - translate: dx/dy là số literal (frozen). Trade-off để serialize đơn giản
 *   qua JSON; transformed object không tự cập nhật khi user kéo điểm vector.
 * - reflectPoint = rotate π quanh center — biểu diễn riêng để render trực tiếp.
 * - dilate quanh center: implement bằng chain T(-c) → S(k) → T(+c) ở render-time
 *   (JSXGraph 'scale' không nhận center).
 */
export type TransformDef =
  | { kind: 'translate'; dx: number; dy: number }
  | { kind: 'rotate'; angleRad: number; center: string }
  | { kind: 'reflectLine'; line: string }
  | { kind: 'reflectPoint'; center: string }
  | { kind: 'dilate'; k: number; center: string };

export function transformRefs(t: TransformDef): string[] {
  switch (t.kind) {
    case 'translate': return [];
    case 'rotate':
    case 'reflectPoint':
    case 'dilate':
      return [t.center];
    case 'reflectLine':
      return [t.line];
  }
}

export type Constraint2D =
  | { kind: 'free'; x: number; y: number }
  | { kind: 'onAxis'; axis: 'x' | 'y'; t: number }
  | { kind: 'onLine'; lineId: string; t: number }
  | { kind: 'onSegment'; segmentId: string; t: number }
  | { kind: 'onCircle'; circleId: string; theta: number }
  | { kind: 'onPolygon'; polygonId: string; u: number; v: number }
  | { kind: 'midpoint'; p1: string; p2: string }
  | { kind: 'transformed'; source: string; transform: TransformDef }
  | { kind: 'perpFoot'; from: string; onLine: string }
  | { kind: 'circumcenter'; vertices: [string, string, string] }
  | { kind: 'incenter'; vertices: [string, string, string] }
  | { kind: 'centroid'; vertices: [string, string, string] }
  | { kind: 'orthocenter'; vertices: [string, string, string] }
  | { kind: 'onPerpendicular'; through: string; perpToA: string; perpToB: string; t: number }
  | { kind: 'onPerpBisector'; p1: string; p2: string; t: number }
  | { kind: 'onCircleAroundPoint'; center: string; radiusPoint: string; theta: number }
  // Tiếp điểm khi vẽ 2 tiếp tuyến từ điểm ngoài đường tròn.
  // `which` chọn 1 trong 2 nhánh (0 = nhánh dương theo Thales, 1 = nhánh âm).
  | { kind: 'tangentPointExt'; from: string; circle: string; which: 0 | 1 };

export function constraintRefs2D(c: Constraint2D): string[] {
  switch (c.kind) {
    case 'onLine': return [c.lineId];
    case 'onSegment': return [c.segmentId];
    case 'onCircle': return [c.circleId];
    case 'onPolygon': return [c.polygonId];
    case 'midpoint': return [c.p1, c.p2];
    case 'transformed': return [c.source, ...transformRefs(c.transform)];
    case 'perpFoot': return [c.from, c.onLine];
    case 'circumcenter': return [c.vertices[0], c.vertices[1], c.vertices[2]];
    case 'incenter': return [c.vertices[0], c.vertices[1], c.vertices[2]];
    case 'centroid': return [c.vertices[0], c.vertices[1], c.vertices[2]];
    case 'orthocenter': return [c.vertices[0], c.vertices[1], c.vertices[2]];
    case 'onPerpendicular': return [c.through, c.perpToA, c.perpToB];
    case 'onPerpBisector': return [c.p1, c.p2];
    case 'onCircleAroundPoint': return [c.center, c.radiusPoint];
    case 'tangentPointExt': return [c.from, c.circle];
    default: return [];
  }
}
