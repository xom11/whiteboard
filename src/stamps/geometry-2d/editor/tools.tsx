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
  /** Loại object accept ở mỗi slot. 'any' = point hoặc non-point. 'lineOrCircle' = line hoặc circle (loại trừ point). */
  accepts?: Array<'point' | 'line' | 'circle' | 'any' | 'lineOrCircle'>;
}

// ============== Tool icons — inline SVG (GeoGebra-inspired, MIT-clean redraw) ==============
//
// Design system:
//   - Main strokes use currentColor → respect active state (white-on-emerald).
//   - 4 accent colors stay fixed across states:
//       point     → blue dot (signature từ GeoGebra)
//       construct → red dashed/solid helper line (perpendicular, bisector, parallel, tangent)
//       fill      → orange polygon/area fill (light)
//       arc       → emerald arc cho measurement
//   - ViewBox 24×24, stroke 1.4–1.7, round caps cho cảm giác sketch-like.
const C_POINT = '#2563eb';
const C_CONSTRUCT = '#dc2626';
const C_FILL = '#f59e0b';
const C_ARC = '#059669';

const Icon = {
  // ===== Basic =====
  cursor: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 3 L5 18 L9.5 14 L12 20 L14 19.2 L11.5 13.5 L17.5 13.5 Z"
        fill="currentColor" fillOpacity="0.12"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
      />
    </svg>
  ),
  select: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinejoin="round" strokeLinecap="round">
      <rect x="2.5" y="2.5" width="14" height="14" rx="0.5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 1.8"/>
      <path d="M10 10 L21 14.5 L14.5 16 L12.5 22 Z" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),

  // ===== Point =====
  point: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="9.5" cy="14" r="3.2" fill={C_POINT}/>
      <text x="13.5" y="10.5" fontSize="9.5" fontFamily="serif" fontStyle="italic" fontWeight="600" fill={C_POINT}>A</text>
    </svg>
  ),
  midpoint: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="4" cy="12" r="1.7" fill={C_POINT}/>
      <circle cx="20" cy="12" r="1.7" fill={C_POINT}/>
      <circle cx="12" cy="12" r="2.5" fill={C_POINT}/>
    </svg>
  ),
  intersect: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <path d="M3 5 L21 19" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M21 5 L3 19" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="12" cy="12" r="2.6" fill={C_CONSTRUCT}/>
    </svg>
  ),

  // ===== Line =====
  segment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="5" y1="18" x2="19" y2="6" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="5" cy="18" r="2.2" fill={C_POINT}/>
      <circle cx="19" cy="6" r="2.2" fill={C_POINT}/>
    </svg>
  ),
  line: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="2" y1="21" x2="22" y2="3" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="8.5" cy="15.5" r="1.9" fill={C_POINT}/>
      <circle cx="15.5" cy="8.5" r="1.9" fill={C_POINT}/>
    </svg>
  ),
  ray: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="22" y2="2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="5" cy="19" r="2.2" fill={C_POINT}/>
      <circle cx="12" cy="12" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  vector: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="18" y2="6"/>
      <polyline points="13,5 19,5 19,11"/>
      <circle cx="5" cy="19" r="2" fill={C_POINT} stroke="none"/>
    </svg>
  ),

  // ===== Construct =====
  perpendicular: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="2" y1="17" x2="22" y2="17" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="12" y1="3" x2="12" y2="17" stroke={C_CONSTRUCT} strokeWidth="1.5"/>
      <rect x="12" y="13.5" width="3.5" height="3.5" fill="none" stroke="currentColor" strokeWidth="1"/>
      <circle cx="12" cy="17" r="1.8" fill={C_POINT}/>
    </svg>
  ),
  parallel: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="2" y1="9" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="2" y1="19" x2="22" y2="16" stroke={C_CONSTRUCT} strokeWidth="1.5"/>
      <circle cx="12" cy="7.5" r="1.8" fill={C_POINT}/>
    </svg>
  ),
  perpBisector: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="4" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="12" y1="3" x2="12" y2="22" stroke={C_CONSTRUCT} strokeWidth="1.4" strokeDasharray="2.5 2"/>
      <circle cx="4" cy="16" r="2" fill={C_POINT}/>
      <circle cx="20" cy="16" r="2" fill={C_POINT}/>
    </svg>
  ),
  bisector: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="4" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="4" y1="20" x2="22" y2="4" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="4" y1="20" x2="23" y2="11" stroke={C_CONSTRUCT} strokeWidth="1.4" strokeDasharray="2.5 2"/>
    </svg>
  ),

  // ===== Polygon =====
  polygon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinejoin="round">
      <polygon points="6,5 18,6 22,14 13,21 4,16" fill={C_FILL} fillOpacity="0.28" stroke={C_FILL} strokeWidth="1.5"/>
      <circle cx="6" cy="5" r="1.5" fill={C_POINT}/>
      <circle cx="18" cy="6" r="1.5" fill={C_POINT}/>
      <circle cx="22" cy="14" r="1.5" fill={C_POINT}/>
      <circle cx="13" cy="21" r="1.5" fill={C_POINT}/>
      <circle cx="4" cy="16" r="1.5" fill={C_POINT}/>
    </svg>
  ),
  regularPolygon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinejoin="round">
      <polygon points="12,3 20.5,8 20.5,16 12,21 3.5,16 3.5,8" fill={C_FILL} fillOpacity="0.28" stroke={C_FILL} strokeWidth="1.5"/>
      <circle cx="12" cy="3" r="1.7" fill={C_POINT}/>
      <circle cx="20.5" cy="8" r="1.7" fill={C_POINT}/>
    </svg>
  ),

  // ===== Circle =====
  circleCenter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="11" cy="13" r="1.7" fill={C_POINT}/>
      <circle cx="19" cy="13" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  circle3: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="5" r="1.7" fill={C_POINT}/>
      <circle cx="19" cy="16" r="1.7" fill={C_POINT}/>
      <circle cx="5" cy="16" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  tangent: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <circle cx="9" cy="14" r="5" stroke="currentColor" strokeWidth="1.5"/>
      {/* External point top-right + 2 tangent lines touching circle at T1, T2 */}
      <line x1="20" y1="5" x2="11.1" y2="10.6" stroke={C_CONSTRUCT} strokeWidth="1.5"/>
      <line x1="20" y1="5" x2="13.5" y2="17.5" stroke={C_CONSTRUCT} strokeWidth="1.5"/>
      <circle cx="20" cy="5" r="1.7" fill={C_POINT}/>
      <circle cx="11.1" cy="10.6" r="1.1" fill={C_POINT}/>
      <circle cx="13.5" cy="17.5" r="1.1" fill={C_POINT}/>
    </svg>
  ),

  // ===== Measure =====
  angle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="4" y1="20" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M14 20 A 10 10 0 0 0 11 13.4" stroke={C_ARC} strokeWidth="1.6" fill="none"/>
      <circle cx="4" cy="20" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  distance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <line x1="5" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="5" cy="16" r="2" fill={C_POINT}/>
      <circle cx="19" cy="16" r="2" fill={C_POINT}/>
      <text x="8.5" y="11" fontSize="7" fontFamily="serif" fontStyle="italic" fontWeight="600" fill="currentColor">cm</text>
    </svg>
  ),
  area: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinejoin="round">
      <polygon points="4,10 14,3.5 21,12 16,21 5,18" fill={C_FILL} fillOpacity="0.32" stroke={C_FILL} strokeWidth="1.4"/>
      <text x="1.5" y="8" fontSize="6.5" fontFamily="serif" fontStyle="italic" fontWeight="600" fill="currentColor">cm²</text>
    </svg>
  ),

  // ===== Edit =====
  toggleLabel: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <text x="1.5" y="19" fontSize="15" fontFamily="serif" fontWeight="700" fill="currentColor">A</text>
      <text x="12" y="19" fontSize="15" fontFamily="serif" fontWeight="700" fill="currentColor" fillOpacity="0.35">A</text>
    </svg>
  ),
  toggleVisible: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="12" r="3.2" fill={C_POINT}/>
      <circle cx="17" cy="12" r="3.2" fill="none" stroke={C_POINT} strokeWidth="1.6"/>
    </svg>
  ),
  trash: (
    // Eraser hình bình hành — GeoGebra dùng eraser, không phải trash bin.
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinejoin="round" strokeLinecap="round">
      <path d="M14.5 3 L21 9.5 L11.5 19 L4 19 L4 11.5 Z" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="9.5" y1="8" x2="16" y2="14.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),

  // ===== Transform =====
  translate: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinejoin="round" strokeLinecap="round">
      <polygon points="3,19 9,19 6,13.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.3"/>
      <polygon points="15,9 21,9 18,3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 1.5"/>
      <line x1="9" y1="15" x2="15" y2="8" stroke={C_CONSTRUCT} strokeWidth="1.5"/>
      <polyline points="12.5,7 15,7.5 14.5,10" stroke={C_CONSTRUCT} strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  rotate: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13 A 8 8 0 1 1 12 21" stroke="currentColor" strokeWidth="1.6"/>
      <polyline points="2.5,10 5,13 7.5,11" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <circle cx="12" cy="13" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  reflectLine: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" stroke={C_CONSTRUCT} strokeWidth="1.5" strokeDasharray="2.5 2"/>
      <polygon points="3,6 10,12 3,18" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.3"/>
      <polygon points="21,6 14,12 21,18" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  reflectPoint: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <line x1="4" y1="4" x2="20" y2="20" stroke={C_CONSTRUCT} strokeWidth="1.3" strokeDasharray="2 2"/>
      <circle cx="12" cy="12" r="2" fill={C_CONSTRUCT}/>
      <circle cx="4" cy="4" r="1.8" fill={C_POINT}/>
      <circle cx="20" cy="20" r="1.8" fill={C_POINT}/>
    </svg>
  ),
  dilate: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinejoin="round">
      <line x1="4" y1="20" x2="22" y2="2" stroke={C_CONSTRUCT} strokeWidth="1" strokeDasharray="1.5 1.5"/>
      <polygon points="7,17 11,17 9,13.5" fill="currentColor" fillOpacity="0.28" stroke="currentColor" strokeWidth="1.2"/>
      <polygon points="13,11 21,11 17,3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.5"/>
      <circle cx="4" cy="20" r="1.8" fill={C_CONSTRUCT}/>
    </svg>
  ),
};

// ============== Tool catalog ==============
export const TOOLS: ToolDef[] = [
  { key: 'move', label: 'Di chuyển', hint: 'Kéo điểm hoặc xoay nền', icon: Icon.cursor, group: 'move', needs: 0 },
  { key: 'select', label: 'Chọn', hint: 'Click để chọn 1 / Shift+click để bỏ thêm / Kéo nền để khoanh vùng / DEL để xoá', icon: Icon.select, group: 'move', needs: 0 },
  { key: 'point', label: 'Điểm mới', hint: 'Click để thêm điểm', icon: Icon.point, group: 'point', needs: 1 },
  { key: 'midpoint', label: 'Trung điểm', hint: 'Click 2 điểm có sẵn', icon: Icon.midpoint, group: 'point', needs: 2, accepts: ['point', 'point'] },
  { key: 'intersect', label: 'Giao điểm của 2 đối tượng', hint: 'Click 2 đường/đường tròn có sẵn', icon: Icon.intersect, group: 'point', needs: 2, accepts: ['lineOrCircle', 'lineOrCircle'] },
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
  return a === kind;
}
