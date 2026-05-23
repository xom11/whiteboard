// src/stamps/graph-2d/editor/tools.ts
//
// Graph-2d tool catalog. 12 tools chia thành 4 groups (basic/function/analysis/draw).
// Field naming `key` (đã đổi từ `id` ở Phase 4) khớp StampToolDef trong shared template.
//
// Shortcuts: single-letter (không chord 2-key). Vì graph chỉ có 12 tool —
// đủ phím không cần chord. Editor là separate instance nên K/L/M có thể trùng
// với 2D mà không conflict (chỉ 1 editor active tại 1 thời điểm).

import type { ReactNode } from 'react';
import React from 'react';

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
  key: GraphTool;
  label: string;
  hint?: string;
  icon: ReactNode;
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

// =============== Inline SVG icons (currentColor stroke, viewBox 24x24) ===============

const C_POINT = '#2563eb';   // blue
const C_FUNC  = '#059669';   // emerald
const C_HELP  = '#dc2626';   // red helper

const wrap = (children: ReactNode): React.ReactElement => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const Icon = {
  move: wrap(<path d="M5 3 L5 18 L9.5 14 L12 20 L14 19.2 L11.5 13.5 L17.5 13.5 Z" fill="currentColor" fillOpacity="0.12" />),
  point: wrap(<><circle cx="12" cy="12" r="2.4" fill={C_POINT} stroke="none" /><circle cx="12" cy="12" r="4" fill="none" /></>),
  slider: wrap(<><line x1="3" y1="12" x2="21" y2="12" /><circle cx="15" cy="12" r="2.4" fill="currentColor" stroke="none" /></>),
  pointOnCurve: wrap(<><path d="M3 18 Q8 4 14 14 T21 6" /><circle cx="14" cy="14" r="2" fill={C_POINT} stroke="none" /></>),
  intersect: wrap(<><path d="M3 6 Q12 22 21 6" /><path d="M3 18 Q12 2 21 18" /><circle cx="12" cy="12" r="1.6" fill={C_POINT} stroke="none" /></>),
  tangent: wrap(<><path d="M3 16 Q12 4 21 16" stroke={C_FUNC} /><line x1="4" y1="10" x2="20" y2="10" stroke={C_HELP} strokeDasharray="3 2" /><circle cx="12" cy="10" r="1.8" fill={C_POINT} stroke="none" /></>),
  slope: wrap(<><line x1="4" y1="20" x2="20" y2="6" /><line x1="4" y1="20" x2="14" y2="20" stroke={C_HELP} strokeDasharray="2 2" /><line x1="14" y1="20" x2="14" y2="11" stroke={C_HELP} strokeDasharray="2 2" /></>),
  extremum: wrap(<><path d="M3 20 Q9 4 15 16 T21 8" /><circle cx="9" cy="8.5" r="1.8" fill={C_HELP} stroke="none" /><circle cx="15" cy="16" r="1.8" fill={C_HELP} stroke="none" /></>),
  root: wrap(<><line x1="3" y1="12" x2="21" y2="12" /><path d="M5 6 Q9 18 12 12 Q15 6 19 18" /><circle cx="12" cy="12" r="1.6" fill={C_HELP} stroke="none" /></>),
  segment: wrap(<><line x1="5" y1="18" x2="19" y2="6" /><circle cx="5" cy="18" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="6" r="1.4" fill="currentColor" stroke="none" /></>),
  line: wrap(<><line x1="3" y1="20" x2="21" y2="4" /><circle cx="9" cy="14.7" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="9.3" r="1.4" fill="currentColor" stroke="none" /></>),
  polygon: wrap(<><polygon points="5,18 12,4 19,12 16,20 8,20" fill="currentColor" fillOpacity="0.12" /><circle cx="5" cy="18" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="4" r="1.2" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" /></>),
};

// =============== TOOLS array ===============

export const TOOLS: ToolDef[] = [
  { key: 'move',          label: 'Di chuyển',         hint: 'Di chuyển / chọn',             icon: Icon.move,         group: 'basic',    shortcut: 'S' },
  { key: 'point',         label: 'Điểm',               hint: 'Tạo điểm tự do',               icon: Icon.point,        group: 'basic',    shortcut: 'P' },
  { key: 'slider',        label: 'Slider',             hint: 'Tạo tham số',                  icon: Icon.slider,       group: 'basic',    shortcut: 'B' },
  { key: 'pointOnCurve',  label: 'Điểm trên đồ thị',   hint: 'Tạo điểm trên hàm số',         icon: Icon.pointOnCurve, group: 'function', shortcut: 'O' },
  { key: 'intersect',     label: 'Giao điểm',          hint: 'Giao 2 đồ thị',                icon: Icon.intersect,    group: 'function', shortcut: 'I' },
  { key: 'tangent',       label: 'Tiếp tuyến',         hint: 'Tiếp tuyến tại điểm',          icon: Icon.tangent,      group: 'function', shortcut: 'T' },
  { key: 'slope',         label: 'Hệ số góc',          hint: 'Slope triangle',               icon: Icon.slope,        group: 'function', shortcut: 'K' },
  { key: 'extremum',      label: 'Cực trị',            hint: 'Tìm cực trị trong khoảng',     icon: Icon.extremum,     group: 'analysis', shortcut: 'E' },
  { key: 'root',          label: 'Nghiệm',             hint: 'Tìm nghiệm trong khoảng',      icon: Icon.root,         group: 'analysis', shortcut: 'R' },
  { key: 'segment',       label: 'Đoạn thẳng',         hint: 'Vẽ đoạn thẳng',               icon: Icon.segment,      group: 'draw',     shortcut: 'M' },
  { key: 'line',          label: 'Đường thẳng',        hint: 'Vẽ đường thẳng',              icon: Icon.line,         group: 'draw',     shortcut: 'L' },
  { key: 'polygon',       label: 'Đa giác',            hint: 'Vẽ đa giác',                  icon: Icon.polygon,      group: 'draw',     shortcut: 'Y' },
];
