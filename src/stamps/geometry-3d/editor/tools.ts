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
  | 'solidofrevolution'
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
  {
    key: 'solidofrevolution',
    label: 'Khối tròn xoay',
    group: 'curved',
    stepsRequired: 1,
    hint: 'Đường cong + trục',
  },
  { key: 'label', label: 'Nhãn', group: 'meta', stepsRequired: 1, hint: 'Gắn vào điểm' },
];
