'use client';
import type { ReactNode } from 'react';
import type { GeomTool3D } from './tools';

interface ToolButtonProps {
  toolKey: GeomTool3D;
  label: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
}

export function ToolButton({ toolKey, label, hint, active, onClick, icon }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={hint ? `${label} — ${hint}` : label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      data-active={active || undefined}
      data-tool={toolKey}
      className={[
        'flex h-8 items-center justify-center rounded-md transition',
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
      ].join(' ')}
    >
      {icon}
    </button>
  );
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const ICONS_3D: Record<GeomTool3D, ReactNode> = {
  move: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3" />
    </svg>
  ),
  point: (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  ),
  segment: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <line x1="4" y1="20" x2="20" y2="4" />
      <circle cx="4" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="4" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  line: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <line x1="2" y1="22" x2="22" y2="2" />
    </svg>
  ),
  plane: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M3 18 L8 8 L21 6 L16 18 Z" />
    </svg>
  ),
  triangle: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 4 L21 20 L3 20 Z" />
    </svg>
  ),
  polygon: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3 L20 9 L17 19 L7 19 L4 9 Z" />
    </svg>
  ),
  tetrahedron: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3 L20 20 L4 20 Z M12 3 L12 20" />
    </svg>
  ),
  parallelepiped: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M4 7 L14 4 L20 7 L14 10 Z M4 7 L4 17 L14 20 L14 10 M14 20 L20 17 L20 7" />
    </svg>
  ),
  prism: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 4 L18 8 L18 20 L12 16 Z M12 4 L6 8 L6 20 L12 16 M6 8 L12 12 L18 8 M6 20 L18 20" />
    </svg>
  ),
  pyramid: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3 L4 20 L20 20 Z M12 3 L12 20" />
    </svg>
  ),
  sphere: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="8" />
      <ellipse cx="12" cy="12" rx="8" ry="3" />
    </svg>
  ),
  cone: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3 L4 20 L20 20 Z" />
      <ellipse cx="12" cy="20" rx="8" ry="2" />
    </svg>
  ),
  cylinder: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <ellipse cx="12" cy="5" rx="6" ry="2" />
      <ellipse cx="12" cy="19" rx="6" ry="2" />
      <line x1="6" y1="5" x2="6" y2="19" />
      <line x1="18" y1="5" x2="18" y2="19" />
    </svg>
  ),
  label: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M4 4 H 16 L 20 8 L 16 12 H 4 Z" />
    </svg>
  ),
};
