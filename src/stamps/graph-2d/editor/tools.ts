// src/stamps/graph-2d/editor/tools.ts
// Shortcut notes (verified against geometry-2d/editor/tools.tsx to avoid conflicts):
//   geometry-2d uses: A(angle), B(angleBisect), C(circle3), D(dilate), E(erase),
//   F(perpBisect), G(grid), H(polyHand), I(intersect), J(regularPolygon),
//   K(circleCenter), L(line), M(midpoint), N(perpendicular), O(parallel),
//   P(point), Q(reflectPoint), R(ray), S(segment), T(tangent), U(translate),
//   V(vector), W(polygon), X(reflectLine), Y(rotate), Z(zoom)
//
//   graph-2d shortcuts: S→ conflict with segment; use separate bindings below.
//   'move'='Escape' already handled by toolbar; using key S conflicts with geometry-2d segment.
//   Per spec § 8.4 shortcuts are PROPOSAL — adjusted to avoid conflicts:
//   segment: M (geometry-2d M=midpoint, but geometry-2d is separate editor instance)
//   line: L (geometry-2d L=line — same key is OK since editors are separate instances)

export type GraphTool =
  | 'move'
  | 'point'
  | 'slider'
  | 'pointOnCurve'
  | 'intersect'
  | 'tangent'
  | 'slope'
  | 'extremum'
  | 'root'
  | 'segment'
  | 'line'
  | 'polygon';

export type GraphToolGroup = 'basic' | 'function' | 'analysis' | 'draw';

export interface ToolDef {
  id: GraphTool;
  label: string;
  title: string;
  group: GraphToolGroup;
  shortcut?: string;
}

export const GROUPS: GraphToolGroup[] = ['basic', 'function', 'analysis', 'draw'];

export const GROUP_LABELS: Record<GraphToolGroup, string> = {
  basic:    'Cơ bản',
  function: 'Hàm',
  analysis: 'Phân tích',
  draw:     'Vẽ',
};

export const TOOLS: ToolDef[] = [
  { id: 'move',          label: 'Di chuyển',         title: 'Di chuyển / chọn',             group: 'basic',    shortcut: 'S' },
  { id: 'point',         label: 'Điểm',               title: 'Tạo điểm tự do',               group: 'basic',    shortcut: 'P' },
  { id: 'slider',        label: 'Slider',             title: 'Tạo tham số',                  group: 'basic',    shortcut: 'B' },
  { id: 'pointOnCurve',  label: 'Điểm trên đồ thị',   title: 'Tạo điểm trên hàm số',         group: 'function', shortcut: 'O' },
  { id: 'intersect',     label: 'Giao điểm',          title: 'Giao 2 đồ thị',                group: 'function', shortcut: 'I' },
  { id: 'tangent',       label: 'Tiếp tuyến',         title: 'Tiếp tuyến tại điểm',          group: 'function', shortcut: 'T' },
  { id: 'slope',         label: 'Hệ số góc',          title: 'Slope triangle',               group: 'function', shortcut: 'K' },
  { id: 'extremum',      label: 'Cực trị',            title: 'Tìm cực trị trong khoảng',     group: 'analysis', shortcut: 'E' },
  { id: 'root',          label: 'Nghiệm',             title: 'Tìm nghiệm trong khoảng',      group: 'analysis', shortcut: 'R' },
  { id: 'segment',       label: 'Đoạn thẳng',         title: 'Vẽ đoạn thẳng',               group: 'draw',     shortcut: 'M' },
  { id: 'line',          label: 'Đường thẳng',        title: 'Vẽ đường thẳng',              group: 'draw',     shortcut: 'L' },
  { id: 'polygon',       label: 'Đa giác',            title: 'Vẽ đa giác',                  group: 'draw',     shortcut: 'Y' },
];
