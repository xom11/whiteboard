'use client';
import * as React from 'react';

export interface RowMenuProps {
  onRename: () => void;
  onChangeColor: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  visible: boolean;
}

export function RowMenu(props: RowMenuProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-label="Row menu"
        onClick={() => setOpen((v) => !v)}
        className="rounded px-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        ⋮
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-zinc-200 bg-white py-1 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <MenuItem onClick={() => { setOpen(false); props.onRename(); }}>Đổi tên</MenuItem>
          <MenuItem onClick={() => { setOpen(false); props.onChangeColor(); }}>Đổi màu</MenuItem>
          <MenuItem onClick={() => { setOpen(false); props.onToggleVisibility(); }}>
            {props.visible ? 'Ẩn' : 'Hiện'}
          </MenuItem>
          <MenuItem onClick={() => { setOpen(false); props.onDelete(); }} className="text-red-600">
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
