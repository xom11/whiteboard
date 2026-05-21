// src/stamps/geometry-2d/editor/LeftPanel/icons.tsx
import React from 'react';

export const GeometryIconHeader = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="4,20 20,20 12,5" />
    <circle cx="4" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="20" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10 L8 5 L8 8 L15 8 A5 5 0 0 1 20 13 L20 16" />
      <path d="M3 10 L8 15 L8 12" />
    </svg>
  );
}

export function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10 L16 5 L16 8 L9 8 A5 5 0 0 0 4 13 L4 16" />
      <path d="M21 10 L16 15 L16 12" />
    </svg>
  );
}

export function AxisIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="20" y2="20" />
      <line x1="4" y1="20" x2="4" y2="4" />
      <polyline points="2 6 4 4 6 6" />
      <polyline points="18 18 20 20 18 22" />
    </svg>
  );
}

export function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <line x1="10" y1="4" x2="10" y2="20" />
      <line x1="16" y1="4" x2="16" y2="20" />
    </svg>
  );
}
