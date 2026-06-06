import React from 'react';

/**
 * Static catalog của tất cả GeomTool — không phụ thuộc board state, chỉ là
 * metadata (key, label, hint, icon SVG, group, số click cần, accept types).
 *
 * Tách khỏi MiniBoard.tsx để (1) giảm size file component và (2) dễ
 * mở rộng tool mới mà không cần đụng vào board logic.
 */

// Tool keys — match GeoGebra-style toolset
export type GeomTool =
  | 'move'
  | 'select'
  | 'point'
  | 'midpoint'
  | 'perpFoot'
  | 'intersect'
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
  | 'semicircle'
  | 'arcCenter'
  | 'arc3'
  | 'sectorCenter'
  | 'circle3'
  | 'tangent'
  | 'centroid'
  | 'circumcenter'
  | 'incenter'
  | 'orthocenter'
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
  | 'dilate'
  | 'square'
  | 'rectangle'
  | 'rhombus'
  | 'parallelogram'
  | 'isoTrapezoid'
  | 'isoTriangle'
  | 'rightTriangle';

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
    | 'triangle'
    | 'measure'
    | 'edit'
    | 'transform'
    | 'special'
    | 'advanced';
  /** Số click cần trước khi action fire. -1 = mở (polygon đóng bằng click lại điểm đầu). */
  needs: number;
  /** Loại object accept ở mỗi slot. 'any' = point hoặc non-point. 'lineOrCircle' = line hoặc circle (loại trừ point). 'pointOrLine' = point hoặc line/đoạn (loại trừ circle). */
  accepts?: Array<'point' | 'line' | 'circle' | 'any' | 'lineOrCircle' | 'pointOrLine'>;
}

// ============== Tool icons — imported from icons.tsx ==============
import { Icon } from './icons';

// ============== Tool catalog ==============
export const TOOLS: ToolDef[] = [
  { key: 'move', label: 'Di chuyển', hint: 'Kéo điểm hoặc xoay nền', icon: Icon.cursor, group: 'move', needs: 0 },
  { key: 'select', label: 'Chọn', hint: 'Click để chọn 1 / Shift+click để bỏ thêm / Kéo nền để khoanh vùng / DEL để xoá', icon: Icon.select, group: 'move', needs: 0 },
  { key: 'point', label: 'Điểm mới', hint: 'Click để thêm điểm', icon: Icon.point, group: 'point', needs: 1 },
  { key: 'midpoint', label: 'Trung điểm', hint: 'Click 2 điểm có sẵn', icon: Icon.midpoint, group: 'point', needs: 2, accepts: ['point', 'point'] },
  { key: 'perpFoot', label: 'Chân đường vuông góc', hint: 'Click 1 điểm + 1 đường có sẵn', icon: Icon.perpFoot, group: 'point', needs: 2, accepts: ['point', 'line'] },
  { key: 'intersect', label: 'Giao điểm của 2 đối tượng', hint: 'Click 2 đường/đường tròn có sẵn', icon: Icon.intersect, group: 'point', needs: 2, accepts: ['lineOrCircle', 'lineOrCircle'] },
  { key: 'segment', label: 'Đoạn thẳng', hint: 'Click 2 điểm', icon: Icon.segment, group: 'line', needs: 2 },
  { key: 'line', label: 'Đường thẳng qua 2 điểm', hint: 'Click 2 điểm', icon: Icon.line, group: 'line', needs: 2 },
  { key: 'ray', label: 'Tia qua 2 điểm', hint: 'Click 2 điểm', icon: Icon.ray, group: 'line', needs: 2 },
  { key: 'vector', label: 'Vector', hint: 'Click 2 điểm', icon: Icon.vector, group: 'line', needs: 2 },
  { key: 'perpendicular', label: 'Đường vuông góc', hint: 'Click 1 điểm + 1 đường có sẵn', icon: Icon.perpendicular, group: 'construct', needs: 2, accepts: ['point', 'line'] },
  { key: 'parallel', label: 'Đường song song', hint: 'Click 1 điểm + 1 đường có sẵn', icon: Icon.parallel, group: 'construct', needs: 2, accepts: ['point', 'line'] },
  { key: 'perpBisector', label: 'Đường trung trực', hint: 'Click 2 điểm có sẵn', icon: Icon.perpBisector, group: 'construct', needs: 2, accepts: ['point', 'point'] },
  { key: 'angleBisector', label: 'Đường phân giác', hint: 'Click 3 điểm (đỉnh ở giữa) hoặc 2 đường/đoạn (sẽ tạo 2 tia phân giác)', icon: Icon.bisector, group: 'construct', needs: 3, accepts: ['pointOrLine', 'pointOrLine', 'pointOrLine'] },
  { key: 'polygon', label: 'Đa giác', hint: 'Click các điểm, click lại điểm đầu để đóng', icon: Icon.polygon, group: 'polygon', needs: -1 },
  { key: 'regularPolygon', label: 'Đa giác đều', hint: 'Click 2 điểm rồi nhập số cạnh', icon: Icon.regularPolygon, group: 'polygon', needs: 2, accepts: ['point', 'point'] },
  { key: 'circleCenter', label: 'Đường tròn (tâm + điểm)', hint: 'Click tâm rồi 1 điểm trên đường tròn', icon: Icon.circleCenter, group: 'circle', needs: 2 },
  { key: 'semicircle', label: 'Nửa đường tròn (đường kính)', hint: 'Click 2 điểm — bán nguyệt qua đường kính', icon: Icon.semicircle, group: 'circle', needs: 2 },
  { key: 'arcCenter', label: 'Cung tròn (tâm + 2 điểm)', hint: 'Click tâm O → A → B (cung từ A đến B)', icon: Icon.arcCenter, group: 'circle', needs: 3 },
  { key: 'arc3', label: 'Cung tròn qua 3 điểm', hint: 'Click 3 điểm trên cung', icon: Icon.arc3, group: 'circle', needs: 3 },
  { key: 'sectorCenter', label: 'Hình quạt (tâm + 2 điểm)', hint: 'Click tâm O → A → B (quạt OAB)', icon: Icon.sectorCenter, group: 'circle', needs: 3 },
  { key: 'circle3', label: 'Đường tròn qua 3 điểm', hint: 'Click 3 điểm', icon: Icon.circle3, group: 'circle', needs: 3 },
  { key: 'tangent', label: 'Tiếp tuyến', hint: 'Click 1 điểm + 1 đường tròn có sẵn', icon: Icon.tangent, group: 'circle', needs: 2, accepts: ['point', 'circle'] },
  { key: 'centroid',     label: 'Trọng tâm tam giác',           hint: 'Click 3 đỉnh tam giác', icon: Icon.centroid,     group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'circumcenter', label: 'Tâm đường tròn ngoại tiếp',    hint: 'Click 3 đỉnh tam giác', icon: Icon.circumcenter, group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'incenter',     label: 'Tâm đường tròn nội tiếp',      hint: 'Click 3 đỉnh tam giác', icon: Icon.incenter,     group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'orthocenter',  label: 'Trực tâm tam giác',            hint: 'Click 3 đỉnh tam giác', icon: Icon.orthocenter,  group: 'triangle', needs: 3, accepts: ['point', 'point', 'point'] },
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
  // ===== Hình đặc biệt (parametric construction) =====
  { key: 'square',         label: 'Hình vuông',         hint: 'Click 2 điểm — cạnh đầu (3 đỉnh còn lại tự suy, vuông góc + bằng cạnh)',
    icon: Icon.square,         group: 'special', needs: 2, accepts: ['point', 'point'] },
  { key: 'rectangle',      label: 'Hình chữ nhật',      hint: 'Click 2 điểm đáy + 1 điểm chiều cao (auto vuông góc tại đỉnh 2)',
    icon: Icon.rectangle,      group: 'special', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'rhombus',        label: 'Hình thoi',          hint: 'Click 2 điểm cạnh + 1 điểm hướng (auto bằng độ dài cạnh)',
    icon: Icon.rhombus,        group: 'special', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'parallelogram',  label: 'Hình bình hành',     hint: 'Click 3 điểm liên tiếp (đỉnh 4 tự suy)',
    icon: Icon.parallelogram,  group: 'special', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'isoTrapezoid',   label: 'Hình thang cân',     hint: 'Click 2 điểm đáy lớn + 1 đỉnh trên (đỉnh 4 phản chiếu qua trung trực)',
    icon: Icon.isoTrapezoid,   group: 'special', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'isoTriangle',    label: 'Tam giác cân',       hint: 'Click 2 điểm đáy + 1 đỉnh (auto trên trung trực)',
    icon: Icon.isoTriangle,    group: 'special', needs: 3, accepts: ['point', 'point', 'point'] },
  { key: 'rightTriangle',  label: 'Tam giác vuông',     hint: 'Click đỉnh vuông + 2 đầu cạnh (cạnh 2 auto vuông góc)',
    icon: Icon.rightTriangle,  group: 'special', needs: 3, accepts: ['point', 'point', 'point'] },
];

export const GROUP_LABELS: Record<ToolDef['group'], string> = {
  move: 'Cơ bản',
  point: 'Điểm',
  line: 'Đường',
  construct: 'Dựng hình',
  polygon: 'Đa giác',
  circle: 'Đường tròn',
  triangle: 'Tam giác',
  measure: 'Đo lường',
  edit: 'Chỉnh sửa',
  transform: 'Phép biến hình',
  special: 'Hình đặc biệt',
  advanced: 'Nâng cao',
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
  'triangle',
  'measure',
  'edit',
  'transform',
  'special',
  'advanced',
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

 
type JxgObj = any;

/** Phân loại JSXGraph element type vào nhóm dùng cho accept-matching.
 *
 * Ưu tiên `elementClass` (numeric constant do JSXGraph set đúng cho mọi derived
 * element — intersection, reflection, glider, parallelpoint, mirrorpoint, ...
 * đều trả về OBJECT_CLASS_POINT). Nếu không có (test mocks), fallback sang
 * `elType` string với danh sách mở rộng các kiểu thường gặp.
 *
 * Constants từ JSXGraph: OBJECT_CLASS_POINT=1, OBJECT_CLASS_LINE=2, OBJECT_CLASS_CIRCLE=3.
 */
export function objKind(obj: JxgObj): 'point' | 'line' | 'circle' | 'other' {
  if (!obj) return 'other';
  const ec = typeof obj.elementClass === 'number' ? obj.elementClass : null;
  if (ec === 1) return 'point';
  if (ec === 2) return 'line';
  if (ec === 3) return 'circle';
  const e = (obj.elType || obj.type || '').toString().toLowerCase();
  if (
    e === 'point' || e === 'glider' || e === 'midpoint' ||
    e === 'intersection' || e === 'otherintersection' ||
    e === 'reflection' || e === 'mirrorpoint' || e === 'mirrorelement' ||
    e === 'orthogonalprojection' || e === 'parallelpoint'
  ) return 'point';
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
  if (a === 'lineOrCircle') return kind === 'line' || kind === 'circle';
  if (a === 'pointOrLine') return kind === 'point' || kind === 'line';
  return a === kind;
}
