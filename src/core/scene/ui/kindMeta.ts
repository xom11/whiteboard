// src/core/scene/ui/kindMeta.ts
export interface KindUiMeta {
  displayName: string;
  icon: string;
}

export const KIND_UI_META: Readonly<Record<string, KindUiMeta>> = {
  // 2D
  point:        { displayName: 'Điểm',        icon: '·' },
  segment:      { displayName: 'Đoạn thẳng',  icon: '—' },
  line:         { displayName: 'Đường thẳng', icon: '/' },
  ray:          { displayName: 'Tia',         icon: '→' },
  vector:       { displayName: 'Vector',      icon: '↗' },
  circle:       { displayName: 'Đường tròn',  icon: '○' },
  polygon:      { displayName: 'Đa giác',     icon: '◇' },
  intersection: { displayName: 'Giao điểm',   icon: '✕' },
  // 3D
  point3d:      { displayName: 'Điểm',        icon: '·' },
  segment3d:    { displayName: 'Đoạn thẳng',  icon: '—' },
  line3d:       { displayName: 'Đường thẳng', icon: '/' },
  ray3d:        { displayName: 'Tia',         icon: '→' },
  vector3d:     { displayName: 'Vector',      icon: '↗' },
  plane3d:      { displayName: 'Mặt phẳng',   icon: '▱' },
  polygon3d:    { displayName: 'Đa giác',     icon: '◇' },
  sphere3d:     { displayName: 'Mặt cầu',     icon: '◯' },
  polyhedron3d: { displayName: 'Đa diện',     icon: '⬢' },
  cylinder3d:   { displayName: 'Hình trụ',    icon: '⌭' },
  cone3d:       { displayName: 'Hình nón',    icon: '▲' },
};

export function getKindUiMeta(kind: string): KindUiMeta {
  return KIND_UI_META[kind] ?? { displayName: kind, icon: '?' };
}
