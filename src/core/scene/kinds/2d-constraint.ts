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

/**
 * Nguồn khoảng cách cho pointAtDistance. ids là scene-object id (string).
 *
 * Khoảng cách hiệu dụng: d = scale·base + offset (scale mặc định 1, offset mặc
 * định 0). base ∈ {circleRadius=Radius, segmentLength=|p1p2|, literal=value}.
 * scale/offset OPTIONAL → spec cũ (absent) tính d = base Y HỆT trước (additive).
 * Issue #46 nhóm C (hệ số/bội: "BD = 2R", "BD = 2·AB", "BD = R+1").
 */
export type ConstraintDistanceSpec =
  | { kind: 'circleRadius'; circle: string; scale?: number; offset?: number }
  | { kind: 'segmentLength'; p1: string; p2: string; scale?: number; offset?: number }
  | { kind: 'literal'; value: number; scale?: number; offset?: number };

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
  | { kind: 'tangentPointExt'; from: string; circle: string; which: 0 | 1 }
  // Giao điểm của 2 đường tròn (c1, c2). `which` chọn 1 trong 2 nghiệm.
  | { kind: 'circleIntersection'; c1: string; c2: string; which: 0 | 1 }
  // Giao điểm THỨ HAI của 2 đường tròn (c1, c2), biết điểm chung `exclude`.
  // JSXGraph 'otherintersection' trả nghiệm KHÁC `exclude` — dùng cho đề
  // "đường tròn đường kính AB, AC đôi một cắt nhau lần thứ hai" (điểm chung A).
  | { kind: 'circleSecondIntersection'; c1: string; c2: string; exclude: string }
  // Giao điểm THỨ HAI của đường thẳng `line` với đường tròn `circle`, biết
  // giao điểm thứ nhất là `other`.
  | { kind: 'secondIntersection'; line: string; circle: string; other: string }
  // Tiếp điểm của đường thẳng `onLine` (đã tiếp xúc) với đường tròn `circle`
  // = chân vuông góc hạ từ tâm xuống đường thẳng.
  | { kind: 'tangencyPoint'; circle: string; onLine: string }
  // Trung điểm cung AB của đường tròn `circle`. Đúng 1 trong:
  //   - `notContaining`: cung KHÔNG chứa điểm này
  //   - `containing`:    cung CHỨA điểm này (= antipode của trường hợp notContaining)
  | { kind: 'arcMidpoint'; circle: string; a: string; b: string; notContaining?: string; containing?: string }
  // Điểm trên tia from→through kéo dài qua through, cách through khoảng `distance`.
  | { kind: 'pointAtDistance'; from: string; through: string; distance: ConstraintDistanceSpec }
  // Tâm bàng tiếp tam giác `vertices` đối diện đỉnh `opposite`.
  // `opposite` LUÔN là một phần tử của `vertices` (vì vậy constraintRefs2D không cần thêm nó).
  | { kind: 'excenter'; vertices: [string, string, string]; opposite: string }
  // Mixtilinear: tâm (which='center') hoặc tiếp điểm với (O) (which='touch') của
  // đường tròn tiếp xúc 2 cạnh từ `vertices[0]` + tiếp xúc trong đường tròn ngoại tiếp.
  | { kind: 'mixtilinearPoint'; vertices: [string, string, string]; which: 'center' | 'touch' }
  // Tiếp điểm của tiếp tuyến CHUNG 2 đường tròn `circles` (external/internal).
  // `on` = tiếp điểm trên đtròn 0 hay 1; `variant` = ngoài/trong; `side` = chọn 1
  // trong 2 tiếp tuyến cùng loại. Render functional (đọc tâm+R sống của 2 đtròn).
  | { kind: 'commonTangentPoint'; circles: [string, string]; on: 0 | 1; variant: 'external' | 'internal'; side: 0 | 1 };

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
    case 'circleIntersection': return [c.c1, c.c2];
    case 'circleSecondIntersection': return [c.c1, c.c2, c.exclude];
    case 'secondIntersection': return [c.line, c.circle, c.other];
    case 'tangencyPoint': return [c.circle, c.onLine];
    case 'arcMidpoint': {
      const containment = c.notContaining ?? c.containing;
      return containment ? [c.circle, c.a, c.b, containment] : [c.circle, c.a, c.b];
    }
    case 'mixtilinearPoint': return [c.vertices[0], c.vertices[1], c.vertices[2]];
    case 'pointAtDistance': {
      const d = c.distance;
      const extra = d.kind === 'circleRadius' ? [d.circle]
        : d.kind === 'segmentLength' ? [d.p1, d.p2] : [];
      return [c.from, c.through, ...extra];
    }
    case 'excenter': return [c.vertices[0], c.vertices[1], c.vertices[2]];
    case 'commonTangentPoint': return [c.circles[0], c.circles[1]];
    // Các kind KHÔNG có ref scene-object (toạ độ literal): liệt kê TƯỜNG MINH để
    // exhaustive never-guard bên dưới buộc khai báo khi thêm constraint kind mới.
    case 'free':
    case 'onAxis': return [];
    default: {
      // Thêm constraint kind có ref mà quên case ở trên → compile-error tại đây
      // (thay vì âm thầm return [] khiến dependency graph / cascade-delete bỏ sót).
      const _exhaustive: never = c;
      void _exhaustive;
      return [];
    }
  }
}
