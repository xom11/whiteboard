import * as React from 'react';
import type { ToolKey } from '../tools/spec';

const wrap = (children: React.ReactNode): React.ReactElement => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const dot = (cx: number, cy: number, r = 1.4): React.ReactElement => (
  <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
);

export const ToolIcons: Record<ToolKey, React.ReactElement> = {
  move: wrap(
    <>
      <path d="M5 4 L5 14 L8 11 L10 16 L13 15 L11 10 L15 10 Z" />
    </>,
  ),
  point: wrap(
    <>
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
    </>,
  ),
  pointOnObject: wrap(
    <>
      <path d="M3 16 L21 12" />
      <circle cx="12" cy="13.5" r="2.4" fill="currentColor" stroke="none" />
    </>,
  ),
  segment: wrap(
    <>
      <line x1="4" y1="18" x2="20" y2="6" />
      {dot(4, 18, 1.6)}
      {dot(20, 6, 1.6)}
    </>,
  ),
  line: wrap(
    <>
      <line x1="3" y1="18" x2="21" y2="6" />
      {dot(8, 14.5, 1.4)}
      {dot(16, 9.5, 1.4)}
    </>,
  ),
  ray: wrap(
    <>
      <line x1="5" y1="18" x2="19" y2="7" />
      <path d="M19 7 L15 6 M19 7 L18 11" />
      {dot(5, 18, 1.6)}
    </>,
  ),
  vector: wrap(
    <>
      <line x1="5" y1="18" x2="18" y2="7" />
      <path d="M18 7 L13 7 M18 7 L18 12" />
      {dot(5, 18, 1.6)}
    </>,
  ),
  polygon: wrap(
    <>
      <polygon points="12,4 20,10 17,19 7,19 4,10" />
    </>,
  ),
  plane: wrap(
    <>
      <polygon points="3,9 14,5 21,11 10,15" />
    </>,
  ),
  pyramid: wrap(
    <>
      <path d="M4 19 L20 19 L12 4 Z" />
      <path d="M4 19 L12 16 L20 19" />
      <path d="M12 4 L12 16" strokeDasharray="2 2" />
    </>,
  ),
  prism: wrap(
    <>
      <path d="M4 8 L4 19 L14 19 L14 8 Z" />
      <path d="M4 8 L10 4 L20 4 L14 8" />
      <path d="M14 8 L14 19 L20 15 L20 4" />
      <path d="M4 8 L14 8" />
    </>,
  ),
  tetrahedron: wrap(
    <>
      <path d="M4 19 L20 19 L12 5 Z" />
      <path d="M4 19 L15 12 L20 19" />
      <path d="M15 12 L12 5" />
    </>,
  ),
  cube: wrap(
    <>
      <path d="M4 8 L4 19 L14 19 L14 8 Z" />
      <path d="M4 8 L10 4 L20 4 L14 8" />
      <path d="M14 8 L14 19 L20 15 L20 4" />
    </>,
  ),
  sphere: wrap(
    <>
      <circle cx="12" cy="12" r="8" />
      <ellipse cx="12" cy="12" rx="8" ry="3" />
      {dot(12, 12, 1.2)}
    </>,
  ),
  cylinder: wrap(
    <>
      <ellipse cx="12" cy="6" rx="6" ry="2" />
      <path d="M6 6 L6 18" />
      <path d="M18 6 L18 18" />
      <ellipse cx="12" cy="18" rx="6" ry="2" />
    </>,
  ),
  cone: wrap(
    <>
      <line x1="5" y1="18" x2="12" y2="4" />
      <line x1="19" y1="18" x2="12" y2="4" />
      <ellipse cx="12" cy="18" rx="7" ry="2" />
    </>,
  ),
};
