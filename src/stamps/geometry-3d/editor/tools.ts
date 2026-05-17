export type GeomTool3D =
  | 'move'
  | 'point'
  | 'segment'
  | 'line'
  | 'plane'
  | 'triangle'
  | 'polygon'
  | 'tetrahedron'
  | 'parallelepiped'
  | 'prism'
  | 'pyramid'
  | 'sphere'
  | 'cone'
  | 'cylinder'
  | 'label';

export type ToolGroup3D = 'view' | 'primitive' | 'solid' | 'curved' | 'meta';

export interface ToolDef3D {
  key: GeomTool3D;
  label: string;
  group: ToolGroup3D;
  stepsRequired: number;
  hint?: string;
}

export const GROUP_LABELS_3D: Record<ToolGroup3D, string> = {
  view: 'Xem',
  primitive: 'Cơ bản',
  solid: 'Khối đa diện',
  curved: 'Khối cong',
  meta: 'Khác',
};

// Positional A..E — letter shortcut cho chord 2-phím.
export const GROUP_ORDER_3D: ToolGroup3D[] = [
  'view',
  'primitive',
  'solid',
  'curved',
  'meta',
];

const A_CODE_3D = 'A'.charCodeAt(0);

export function letterForGroup3D(g: ToolGroup3D): string {
  const idx = GROUP_ORDER_3D.indexOf(g);
  return idx >= 0 ? String.fromCharCode(A_CODE_3D + idx) : '';
}

export function groupForLetter3D(ch: string): ToolGroup3D | null {
  if (ch.length !== 1) return null;
  const upper = ch.toUpperCase();
  const idx = upper.charCodeAt(0) - A_CODE_3D;
  if (idx < 0 || idx >= GROUP_ORDER_3D.length) return null;
  return GROUP_ORDER_3D[idx];
}

export const TOOLS_3D: ReadonlyArray<ToolDef3D> = [
  { key: 'move', label: 'Di chuyển', group: 'view', stepsRequired: 0 },
  { key: 'point', label: 'Điểm', group: 'primitive', stepsRequired: 1, hint: 'Nhập (x, y, z)' },
  { key: 'segment', label: 'Đoạn thẳng', group: 'primitive', stepsRequired: 2 },
  { key: 'line', label: 'Đường thẳng', group: 'primitive', stepsRequired: 2 },
  { key: 'plane', label: 'Mặt phẳng', group: 'primitive', stepsRequired: 3 },
  { key: 'triangle', label: 'Tam giác', group: 'primitive', stepsRequired: 3 },
  {
    key: 'polygon',
    label: 'Đa giác',
    group: 'primitive',
    stepsRequired: 3,
    hint: 'Click trở lại điểm đầu để đóng',
  },
  { key: 'tetrahedron', label: 'Tứ diện', group: 'solid', stepsRequired: 4 },
  {
    key: 'parallelepiped',
    label: 'Hình hộp',
    group: 'solid',
    stepsRequired: 1,
    hint: '1 đỉnh + 3 vector',
  },
  {
    key: 'prism',
    label: 'Lăng trụ',
    group: 'solid',
    stepsRequired: 3,
    hint: 'Đa giác đáy + chiều cao',
  },
  {
    key: 'pyramid',
    label: 'Chóp',
    group: 'solid',
    stepsRequired: 4,
    hint: 'Đa giác đáy + đỉnh',
  },
  { key: 'sphere', label: 'Mặt cầu', group: 'curved', stepsRequired: 1, hint: 'Tâm + bán kính' },
  {
    key: 'cone',
    label: 'Hình nón',
    group: 'curved',
    stepsRequired: 2,
    hint: 'Tâm đáy + bán kính + đỉnh',
  },
  {
    key: 'cylinder',
    label: 'Hình trụ',
    group: 'curved',
    stepsRequired: 1,
    hint: 'Tâm đáy + bán kính + chiều cao',
  },
  { key: 'label', label: 'Nhãn', group: 'meta', stepsRequired: 1, hint: 'Gắn vào điểm' },
];
