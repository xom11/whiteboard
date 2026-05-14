'use client';
import React from 'react';

interface Props {
  onGeometryClick: () => void;
  onLatexClick: () => void;
  disabled?: boolean;
}

export const StampToolButtons: React.FC<Props> = ({ onGeometryClick, onLatexClick, disabled }) => {
  return (
    <div className="flex gap-1 items-center">
      <button
        type="button"
        aria-label="Chèn hình học (G)"
        title="Chèn hình học (G)"
        disabled={disabled}
        onClick={onGeometryClick}
        className="px-2 py-1 text-sm bg-white hover:bg-gray-100 border rounded disabled:opacity-50"
      >
        📐
      </button>
      <button
        type="button"
        aria-label="Chèn công thức LaTeX (L)"
        title="Chèn công thức LaTeX (L)"
        disabled={disabled}
        onClick={onLatexClick}
        className="px-2 py-1 text-sm bg-white hover:bg-gray-100 border rounded disabled:opacity-50"
      >
        ∑
      </button>
    </div>
  );
};
