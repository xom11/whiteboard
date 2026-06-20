import type { ReactNode } from 'react';
import { TOOLS, type ToolKey, type ToolSpec } from '../tools/spec';
import { ToolIcons } from './icons';

export type Geom3DGroup =
  | 'basic'
  | 'point'
  | 'line'
  | 'plane'
  | 'polyhedron'
  | 'curve'
  | 'construct';

// 'construct' (Dựng hình) append CUỐI → không xê dịch letter shortcut nhóm cũ (A–F).
export const GROUP_ORDER: Geom3DGroup[] = [
  'basic',
  'point',
  'line',
  'plane',
  'polyhedron',
  'curve',
  'construct',
];

export const GROUP_LABELS: Record<Geom3DGroup, string> = {
  basic: 'Cơ bản',
  point: 'Điểm',
  line: 'Đường thẳng',
  plane: 'Mặt phẳng',
  polyhedron: 'Khối đa diện',
  curve: 'Khối cong',
  construct: 'Dựng hình',
};

export const TOOLS_BY_GROUP: Record<Geom3DGroup, ToolKey[]> = {
  basic: ['move'],
  point: ['point', 'pointOnObject'],
  line: ['segment', 'line', 'ray', 'vector', 'polygon'],
  plane: ['plane'],
  polyhedron: ['pyramid', 'prism', 'tetrahedron', 'cube'],
  curve: ['sphere', 'cylinder', 'cone'],
  construct: ['midpoint'],
};

export interface Geom3DToolEntry {
  key: ToolKey;
  label: string;
  hint: string;
  icon: ReactNode;
  group: Geom3DGroup;
}

const SPEC_BY_KEY: Record<ToolKey, ToolSpec> = TOOLS.reduce(
  (acc, t) => {
    acc[t.key] = t;
    return acc;
  },
  {} as Record<ToolKey, ToolSpec>,
);

export const TOOLS_FLAT: Geom3DToolEntry[] = GROUP_ORDER.flatMap((group) =>
  TOOLS_BY_GROUP[group].map((key) => {
    const spec = SPEC_BY_KEY[key];
    return {
      key,
      label: spec?.label ?? key,
      hint: spec?.hintIdle ?? '',
      icon: ToolIcons[key],
      group,
    };
  }),
);

const A_CODE = 'A'.charCodeAt(0);

export function letterForGroup(g: Geom3DGroup): string {
  const idx = GROUP_ORDER.indexOf(g);
  return idx >= 0 ? String.fromCharCode(A_CODE + idx) : '';
}
