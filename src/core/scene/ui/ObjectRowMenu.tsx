'use client';
import * as React from 'react';

export interface ObjectRowMenuProps {
  onRename: () => void;
  onChangeColor: () => void;
  onDelete: () => void;
}

export function ObjectRowMenu(props: ObjectRowMenuProps): React.ReactElement {
  const { onRename, onChangeColor, onDelete } = props;
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-label="Row menu"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="rounded px-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        ⋮
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-zinc-200 bg-white py-1 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem onClick={() => { setOpen(false); onRename(); }}>Đổi tên</MenuItem>
          <MenuItem onClick={() => { setOpen(false); onChangeColor(); }}>Đổi màu</MenuItem>
          <MenuItem onClick={() => { setOpen(false); onDelete(); }} className="text-red-600">
            Xoá
          </MenuItem>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ children, onClick, className }: React.PropsWithChildren<{ onClick: () => void; className?: string }>) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full px-3 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
