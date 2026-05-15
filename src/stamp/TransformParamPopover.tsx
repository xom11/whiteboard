'use client';
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  kind: 'rotate' | 'dilate';
  anchor: { x: number; y: number };
  defaultValue: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
  isDark?: boolean;
}

export const TransformParamPopover: React.FC<Props> = ({ kind, anchor, defaultValue, onConfirm, onCancel, isDark }) => {
  const [value, setValue] = useState<number>(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const submit = () => onConfirm(Number.isFinite(value) ? value : defaultValue);

  return (
    <div
      data-stamp-area="true"
      className={`${isDark ? 'theme--dark ' : ''}fixed z-[60] flex flex-col gap-2 rounded-lg border border-slate-300 bg-white p-3 shadow-2xl ring-1 ring-black/5`}
      style={{ left: anchor.x, top: anchor.y, minWidth: 180 }}
      role="dialog"
      aria-label={kind === 'rotate' ? 'Góc quay' : 'Tỷ số k'}
    >
      <label className="text-xs font-medium text-slate-700">
        {kind === 'rotate' ? 'Góc (°)' : 'Tỷ số k'}
      </label>
      <input
        ref={inputRef}
        type="number"
        value={value}
        step={kind === 'rotate' ? 15 : 0.5}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
          else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
        >
          Huỷ
        </button>
        <button
          onClick={submit}
          className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
};
