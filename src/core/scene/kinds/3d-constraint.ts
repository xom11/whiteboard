// src/core/scene/kinds/3d-constraint.ts
export type Vec3 = [number, number, number];

export type Constraint3D =
  | { kind: 'free'; x: number; y: number; z: number }
  | { kind: 'onGround'; x: number; y: number }
  | { kind: 'onAxis'; axis: 'x' | 'y' | 'z'; t: number }
  | { kind: 'onPlane'; planeId: string; u: number; v: number }
  | { kind: 'onLine'; lineId: string; t: number }
  | { kind: 'onPolygon'; polygonId: string; u: number; v: number }
  | { kind: 'onSphere'; sphereId: string; theta: number; phi: number }
  // ───── Điểm PHÁI SINH (v1) — KHÔNG kéo được; toạ độ tính ở constraint3d-math.ts ─────
  // Trung điểm đoạn/cạnh p1p2.
  | { kind: 'midpoint'; p1: string; p2: string }
  // Trọng tâm N đỉnh (tam giác 3 / tứ diện 4 …): trung bình các đỉnh.
  | { kind: 'centroid'; vertices: string[] }
  // Giao 2 đường, MỖI đường xác định bởi 2 ĐIỂM (đồng phẳng cắt → giao điểm; chéo
  // nhau → trung điểm đoạn ⊥ chung). Dùng điểm thay line-object để tool không cần
  // chọn đường (hitTest chưa sinh onLine; line-object-ref để dành v1.5).
  | { kind: 'intersectionLines'; a1: string; b1: string; a2: string; b2: string }
  // Giao điểm đường (qua a,b) ∩ mặt phẳng (object — chọn qua onPlane hit).
  | { kind: 'intersectionLinePlane'; a: string; b: string; plane: string }
  // Chân ⊥ từ điểm `from` xuống đường (qua a,b).
  | { kind: 'perpFootLine'; from: string; a: string; b: string }
  // Chân ⊥ từ điểm `from` xuống mặt phẳng (object).
  | { kind: 'perpFootPlane'; from: string; plane: string }
  // Tâm mặt cầu ngoại tiếp N đỉnh (điểm cách đều mọi đỉnh — least-squares).
  | { kind: 'circumsphereCenter'; vertices: string[] };

export function constraintRefs(c: Constraint3D): string[] {
  switch (c.kind) {
    case 'onPlane': return [c.planeId];
    case 'onLine': return [c.lineId];
    case 'onPolygon': return [c.polygonId];
    case 'onSphere': return [c.sphereId];
    case 'midpoint': return [c.p1, c.p2];
    case 'centroid': return [...c.vertices];
    case 'intersectionLines': return [c.a1, c.b1, c.a2, c.b2];
    case 'intersectionLinePlane': return [c.a, c.b, c.plane];
    case 'perpFootLine': return [c.from, c.a, c.b];
    case 'perpFootPlane': return [c.from, c.plane];
    case 'circumsphereCenter': return [...c.vertices];
    // Kind KHÔNG có ref scene-object (toạ độ literal): liệt kê TƯỜNG MINH để
    // exhaustive never-guard bên dưới buộc khai báo khi thêm constraint kind mới
    // (mô phỏng constraintRefs2D — quên case = cascade-delete/deps sai âm thầm).
    case 'free':
    case 'onGround':
    case 'onAxis':
      return [];
    default: {
      const _exhaustive: never = c;
      void _exhaustive;
      return [];
    }
  }
}
