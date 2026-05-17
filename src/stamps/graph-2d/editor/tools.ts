// src/stamps/graph-2d/editor/tools.ts
export type GraphTool = 'move' | 'point-on-curve' | 'intersect' | 'tangent';

export interface GraphToolMeta {
  id: GraphTool;
  label: string;
  title: string;
  shortcutKey?: string;
}

export const GRAPH_TOOLS: GraphToolMeta[] = [
  { id: 'move',           label: 'Di chuyển',     title: 'Di chuyển / chọn' },
  { id: 'point-on-curve', label: 'Điểm trên curve', title: 'Tạo điểm cố định trên đồ thị' },
  { id: 'intersect',      label: 'Giao điểm',     title: 'Đánh dấu giao điểm 2 đồ thị' },
  { id: 'tangent',        label: 'Tiếp tuyến',    title: 'Vẽ tiếp tuyến tại điểm trên đồ thị' },
];
