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
  | { kind: 'midpoint'; p1: string; p2: string };

export function constraintRefs(c: Constraint3D): string[] {
  switch (c.kind) {
    case 'onPlane': return [c.planeId];
    case 'onLine': return [c.lineId];
    case 'onPolygon': return [c.polygonId];
    case 'onSphere': return [c.sphereId];
    case 'midpoint': return [c.p1, c.p2];
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
