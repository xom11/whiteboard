import React from 'react';

/**
 * Static catalog của tất cả GeomTool — không phụ thuộc board state, chỉ là
 * metadata (key, label, hint, icon SVG, group, số click cần, accept types).
 *
 * Tách khỏi JSXGraphMiniBoard.tsx để (1) giảm size file component và (2) dễ
 * mở rộng tool mới mà không cần đụng vào board logic.
 */

// Tool keys — match GeoGebra-style toolset
export type GeomTool =
  | 'move'
  | 'select'
  | 'point'
  | 'midpoint'
  | 'segment'
  | 'line'
  | 'ray'
  | 'vector'
  | 'perpendicular'
  | 'parallel'
  | 'perpBisector'
  | 'angleBisector'
  | 'polygon'
  | 'regularPolygon'
  | 'circleCenter'
  | 'circle3'
  | 'tangent'
  | 'angle'
  | 'distance'
  | 'area'
  | 'toggleLabel'
  | 'toggleVisible'
  | 'delete'
  | 'translate'
  | 'rotate'
  | 'reflectLine'
  | 'reflectPoint'
  | 'dilate';

export interface ToolDef {
  key: GeomTool;
  label: string;
  hint: string;
  icon: React.ReactNode;
  group:
    | 'move'
    | 'point'
    | 'line'
    | 'construct'
    | 'polygon'
    | 'circle'
    | 'measure'
    | 'edit'
    | 'transform';
  /** Số click cần trước khi action fire. -1 = mở (polygon đóng bằng click lại điểm đầu). */
  needs: number;
  /** Loại object accept ở mỗi slot. 'any' = point hoặc non-point. */
  accepts?: Array<'point' | 'line' | 'circle' | 'any'>;
}

// ============== Tool icons — inline SVG ==============
const Icon = {
  cursor: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4 L20 12 L13 13 L11 20 Z"/></svg>
  ),
  select: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4 L20 12 L13 13 L11 20 Z" fill="none"/><rect x="2.5" y="2.5" width="19" height="19" strokeDasharray="3 2" fill="none"/></svg>
  ),
  point: (
    <svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>
  ),
  midpoint: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="20" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>
  ),
  segment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="18" x2="19" y2="6"/><circle cx="5" cy="18" r="1.7" fill="currentColor"/><circle cx="19" cy="6" r="1.7" fill="currentColor"/></svg>
  ),
  line: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="20" x2="22" y2="4"/><circle cx="8" cy="16" r="1.6" fill="currentColor"/><circle cx="16" cy="8" r="1.6" fill="currentColor"/></svg>
  ),
  ray: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="19" x2="22" y2="2"/><circle cx="5" cy="19" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
  ),
  vector: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="20" x2="20" y2="4"/><polyline points="14,4 20,4 20,10"/></svg>
  ),
  perpendicular: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="18" x2="21" y2="18"/><line x1="12" y1="18" x2="12" y2="4"/><rect x="12" y="14" width="4" height="4" fill="none"/></svg>
  ),
  parallel: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="9" x2="21" y2="5"/><line x1="3" y1="19" x2="21" y2="15"/></svg>
  ),
  perpBisector: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="18" x2="20" y2="18"/><line x1="12" y1="4" x2="12" y2="22" strokeDasharray="3 2"/><circle cx="6" cy="18" r="1.5" fill="currentColor"/><circle cx="18" cy="18" r="1.5" fill="currentColor"/></svg>
  ),
  bisector: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="20" x2="20" y2="4"/><line x1="4" y1="20" x2="20" y2="20"/><line x1="4" y1="20" x2="22" y2="12" strokeDasharray="3 2"/></svg>
  ),
  polygon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="6,6 18,6 22,14 12,22 4,14"/></svg>
  ),
  regularPolygon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="12,3 20,8 20,17 12,22 4,17 4,8"/></svg>
  ),
  circleCenter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>
  ),
  circle3: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="1.5" fill="currentColor"/><circle cx="20" cy="14" r="1.5" fill="currentColor"/><circle cx="5" cy="16" r="1.5" fill="currentColor"/></svg>
  ),
  tangent: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="13" r="6"/><line x1="2" y1="20" x2="22" y2="2"/></svg>
  ),
  angle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="20" x2="20" y2="20"/><line x1="4" y1="20" x2="20" y2="6"/><path d="M14 20 A 10 10 0 0 0 11 13" /></svg>
  ),
  distance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="8" x2="4" y2="16"/><line x1="20" y1="8" x2="20" y2="16"/></svg>
  ),
  area: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,6 19,6 21,14 13,21 3,15" fill="currentColor" fillOpacity="0.2"/></svg>
  ),
  toggleLabel: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><text x="3" y="18" fontSize="16" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">A</text><text x="13" y="14" fontSize="11" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">A</text></svg>
  ),
  toggleVisible: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.4"/><circle cx="12" cy="12" r="3.5"/><circle cx="20" cy="6" r="1.5" fill="currentColor"/></svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6 l-1 14 a 2 2 0 0 1 -2 2 H 8 a 2 2 0 0 1 -2 -2 l-1 -14"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
  ),
  translate: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4 L20 20"/><polygon points="14,4 20,4 20,10" fill="currentColor"/><circle cx="5" cy="5" r="1.5" fill="currentColor"/></svg>
  ),
  rotate: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12 A8 8 0 1 1 12 20"/><polyline points="4,9 4,13 8,13"/></svg>
  ),
  reflectLine: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22" strokeDasharray="3 2"/><polygon points="4,6 9,12 4,18" fill="currentColor"/><polygon points="20,6 15,12 20,18" fill="currentColor"/></svg>
  ),
  reflectPoint: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="5" r="1.6" fill="currentColor"/><circle cx="19" cy="19" r="1.6" fill="currentColor"/><line x1="5" y1="5" x2="19" y2="19" strokeDasharray="2 2"/></svg>
  ),
  dilate: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1.5" fill="currentColor"/><polygon points="6,18 18,18 12,6" fillOpacity="0.1" fill="currentColor"/><polygon points="9,15 15,15 12,11" fill="currentColor"/></svg>
  ),
};

// ============== Tool catalog ==============
export const TOOLS: ToolDef[] = [
  { key: 'move', label: 'Di chuyển', hint: 'Kéo điểm hoặc xoay nền', icon: Icon.cursor, group: 'move', needs: 0 },
  { key: 'select', label: 'Chọn', hint: 'Click để chọn 1 / Shift+click để bỏ thêm / Kéo nền để khoanh vùng / DEL để xoá', icon: Icon.select, group: 'move', needs: 0 },
  { key: 'point', label: 'Điểm mới', hint: 'Click để thêm điểm', icon: Icon.point, group: 'point', needs: 1 },
  { key: 'midpoint', label: 'Trung điểm', hint: 'Click 2 điểm có sẵn', icon: Icon.midpoint, group: 'point', needs: 2, accepts: ['point', 'point'] },
  { key: 'segment', label: 'Đoạn thẳng', hint: 'Click 2 điểm', icon: Icon.segment, group: 'line', needs: 2 },
  { key: 'line', label: 'Đường thẳng qua 2 điểm', hint: 'Click 2 điểm', icon: Icon.line, group: 'line', needs: 2 },
  { key: 'ray', label: 'Tia qua 2 điểm', hint: 'Click 2 điểm', icon: Icon.ray, group: 'line', needs: 2 },
  { key: 'vector', label: 'Vector', hint: 'Click 2 điểm', icon: Icon.vector, group: 'line', needs: 2 },
  { key: 'perpendicular', label: 'Đường vuông góc', hint: 'Click 1 điểm + 1 đường có sẵn', icon: Icon.perpendicular, group: 'construct', needs: 2, accepts: ['point', 'line'] },
  { key: 'parallel', label: 'Đường song song', hint: 'Click 1 điểm + 1 đường có sẵn', icon: Icon.parallel, group: 'construct', needs: 2, accepts: ['point', 'line'] },
  { key: 'perpBisector', label: 'Đường trung trực', hint: 'Click 2 điểm có sẵn', icon: Icon.perpBisector, group: 'construct', needs: 2, accepts: ['point', 'point'] },
  { key: 'angleBisector', label: 'Đường phân giác', hint: 'Click 3 điểm có sẵn (đỉnh ở giữa)', icon: Icon.bisector, group: 'construct', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'polygon', label: 'Đa giác', hint: 'Click các điểm, click lại điểm đầu để đóng', icon: Icon.polygon, group: 'polygon', needs: -1 },
  { key: 'regularPolygon', label: 'Đa giác đều', hint: 'Click 2 điểm rồi nhập số cạnh', icon: Icon.regularPolygon, group: 'polygon', needs: 2, accepts: ['point', 'point'] },
  { key: 'circleCenter', label: 'Đường tròn (tâm + điểm)', hint: 'Click tâm rồi 1 điểm trên đường tròn', icon: Icon.circleCenter, group: 'circle', needs: 2 },
  { key: 'circle3', label: 'Đường tròn qua 3 điểm', hint: 'Click 3 điểm', icon: Icon.circle3, group: 'circle', needs: 3 },
  { key: 'tangent', label: 'Tiếp tuyến', hint: 'Click 1 điểm + 1 đường tròn có sẵn', icon: Icon.tangent, group: 'circle', needs: 2, accepts: ['point', 'circle'] },
  { key: 'angle', label: 'Góc', hint: 'Click 3 điểm có sẵn (đỉnh ở giữa)', icon: Icon.angle, group: 'measure', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'distance', label: 'Khoảng cách', hint: 'Click 2 điểm có sẵn', icon: Icon.distance, group: 'measure', needs: 2, accepts: ['point', 'point'] },
  { key: 'area', label: 'Diện tích', hint: 'Click các đỉnh, click lại điểm đầu để đóng', icon: Icon.area, group: 'measure', needs: -1 },
  { key: 'toggleLabel', label: 'Hiện/ẩn tên', hint: 'Click vào đối tượng', icon: Icon.toggleLabel, group: 'edit', needs: 1, accepts: ['any'] },
  { key: 'toggleVisible', label: 'Hiện/ẩn đối tượng', hint: 'Click vào đối tượng', icon: Icon.toggleVisible, group: 'edit', needs: 1, accepts: ['any'] },
  { key: 'delete', label: 'Xoá', hint: 'Click vào đối tượng', icon: Icon.trash, group: 'edit', needs: 1, accepts: ['any'] },
  { key: 'translate', label: 'Phép tịnh tiến', hint: 'Click object → 2 điểm tạo vector', icon: Icon.translate, group: 'transform', needs: 3, accepts: ['any', 'point', 'point'] },
  { key: 'rotate', label: 'Quay đối tượng', hint: 'Click object → tâm quay → nhập góc', icon: Icon.rotate, group: 'transform', needs: 2, accepts: ['any', 'point'] },
  { key: 'reflectLine', label: 'Đối xứng qua đường thẳng', hint: 'Click object → đường thẳng', icon: Icon.reflectLine, group: 'transform', needs: 2, accepts: ['any', 'line'] },
  { key: 'reflectPoint', label: 'Đối xứng qua điểm', hint: 'Click object → tâm đối xứng', icon: Icon.reflectPoint, group: 'transform', needs: 2, accepts: ['any', 'point'] },
  { key: 'dilate', label: 'Phép vị tự', hint: 'Click object → tâm → nhập tỷ số k', icon: Icon.dilate, group: 'transform', needs: 2, accepts: ['any', 'point'] },
];

export const GROUP_LABELS: Record<ToolDef['group'], string> = {
  move: 'Cơ bản',
  point: 'Điểm',
  line: 'Đường',
  construct: 'Dựng hình',
  polygon: 'Đa giác',
  circle: 'Đường tròn',
  measure: 'Đo lường',
  edit: 'Chỉnh sửa',
  transform: 'Phép biến hình',
};

export type GeomGroup = ToolDef['group'];

// Positional A..I — letter shortcut cho chord 2-phím.
// Khớp đúng thứ tự hiển thị trong LeftPanel (derive từ TOOLS phía trên).
export const GROUP_ORDER: GeomGroup[] = [
  'move',
  'point',
  'line',
  'construct',
  'polygon',
  'circle',
  'measure',
  'edit',
  'transform',
];

const A_CODE = 'A'.charCodeAt(0);

export function letterForGroup(g: GeomGroup): string {
  const idx = GROUP_ORDER.indexOf(g);
  return idx >= 0 ? String.fromCharCode(A_CODE + idx) : '';
}

export function groupForLetter(ch: string): GeomGroup | null {
  if (ch.length !== 1) return null;
  const upper = ch.toUpperCase();
  const idx = upper.charCodeAt(0) - A_CODE;
  if (idx < 0 || idx >= GROUP_ORDER.length) return null;
  return GROUP_ORDER[idx];
}

// ============== Object-type matching ==============

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

/** Phân loại JSXGraph element type vào nhóm dùng cho accept-matching. */
export function objKind(obj: JxgObj): 'point' | 'line' | 'circle' | 'other' {
  if (!obj) return 'other';
  const e = (obj.elType || obj.type || '').toString().toLowerCase();
  if (e === 'point' || e === 'glider' || e === 'midpoint') return 'point';
  if (
    e === 'line' || e === 'segment' || e === 'arrow' || e === 'axis' ||
    e === 'normal' || e === 'parallel' || e === 'perpendicular' ||
    e === 'tangent' || e === 'bisector' || e === 'perpendicularsegment'
  ) return 'line';
  if (e === 'circle' || e === 'circumcircle') return 'circle';
  return 'other';
}

export function acceptMatches(
  tool: ToolDef,
  slot: number,
  kind: 'point' | 'line' | 'circle' | 'other',
): boolean {
  if (!tool.accepts) return kind === 'point' || tool.key === 'point';
  const a = tool.accepts[slot];
  if (!a) return false;
  if (a === 'any') return kind !== 'other';
  return a === kind;
}
