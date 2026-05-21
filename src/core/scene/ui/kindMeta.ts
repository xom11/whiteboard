// src/core/scene/ui/kindMeta.ts
export interface KindUiMeta {
  displayName: string;
  icon: string;
  /** Fallback color khi obj.attrs.color không có. Phải khớp default ở renderer. */
  defaultColor: string;
}

// Default colors:
// - Points: blue (#1e40af)
// - Curves / shapes: dark slate (#0f172a)
// - 3D planes / spheres: light blue (#60a5fa)
const POINT_COLOR = '#1e40af';
const CURVE_COLOR = '#0f172a';
const PLANE_COLOR = '#60a5fa';

export const KIND_UI_META: Readonly<Record<string, KindUiMeta>> = {
  // 2D
  point:        { displayName: 'Điểm',        icon: '·', defaultColor: POINT_COLOR },
  segment:      { displayName: 'Đoạn thẳng',  icon: '—', defaultColor: CURVE_COLOR },
  line:         { displayName: 'Đường thẳng', icon: '/', defaultColor: CURVE_COLOR },
  ray:          { displayName: 'Tia',         icon: '→', defaultColor: CURVE_COLOR },
  vector:       { displayName: 'Vector',      icon: '↗', defaultColor: CURVE_COLOR },
  circle:       { displayName: 'Đường tròn',  icon: '○', defaultColor: CURVE_COLOR },
  polygon:      { displayName: 'Đa giác',     icon: '◇', defaultColor: CURVE_COLOR },
  intersection: { displayName: 'Giao điểm',   icon: '✕', defaultColor: POINT_COLOR },
  angle:        { displayName: 'Góc',         icon: '∠', defaultColor: '#16a34a' },
  distance:     { displayName: 'Khoảng cách', icon: '↔', defaultColor: '#dc2626' },
  // 3D
  point3d:      { displayName: 'Điểm',        icon: '·', defaultColor: POINT_COLOR },
  segment3d:    { displayName: 'Đoạn thẳng',  icon: '—', defaultColor: CURVE_COLOR },
  line3d:       { displayName: 'Đường thẳng', icon: '/', defaultColor: CURVE_COLOR },
  ray3d:        { displayName: 'Tia',         icon: '→', defaultColor: CURVE_COLOR },
  vector3d:     { displayName: 'Vector',      icon: '↗', defaultColor: CURVE_COLOR },
  plane3d:      { displayName: 'Mặt phẳng',   icon: '▱', defaultColor: PLANE_COLOR },
  polygon3d:    { displayName: 'Đa giác',     icon: '◇', defaultColor: CURVE_COLOR },
  sphere3d:     { displayName: 'Mặt cầu',     icon: '◯', defaultColor: PLANE_COLOR },
  polyhedron3d: { displayName: 'Đa diện',     icon: '⬢', defaultColor: PLANE_COLOR },
  cylinder3d:   { displayName: 'Hình trụ',    icon: '⌭', defaultColor: PLANE_COLOR },
  cone3d:       { displayName: 'Hình nón',    icon: '▲', defaultColor: PLANE_COLOR },
  // Graph 2D
  function2d:   { displayName: 'Hàm số',           icon: 'ƒ', defaultColor: CURVE_COLOR },
  parameter:    { displayName: 'Tham số',          icon: 'α', defaultColor: '#7c3aed' },
  pointOnCurve: { displayName: 'Điểm trên đồ thị', icon: '◉', defaultColor: POINT_COLOR },
  tangent2d:    { displayName: 'Tiếp tuyến',       icon: '╱', defaultColor: CURVE_COLOR },
  extremum2d:   { displayName: 'Cực trị',          icon: '∧', defaultColor: POINT_COLOR },
  root2d:       { displayName: 'Nghiệm',           icon: '0', defaultColor: POINT_COLOR },
  slope2d:      { displayName: 'Hệ số góc',        icon: '△', defaultColor: '#dc2626' },
};

export function getKindUiMeta(kind: string): KindUiMeta {
  return KIND_UI_META[kind] ?? { displayName: kind, icon: '?', defaultColor: '#888888' };
}
