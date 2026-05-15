'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ParamKind = 'rotate' | 'dilate' | 'regularPolygon';

interface Props {
  kind: ParamKind;
  anchor: { x: number; y: number };
  defaultValue: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
  isDark?: boolean;
}

const LABELS: Record<ParamKind, { aria: string; label: string; step: number; min?: number }> = {
  rotate: { aria: 'Góc quay', label: 'Góc (°)', step: 15 },
  dilate: { aria: 'Tỷ số k', label: 'Tỷ số k', step: 0.5 },
  regularPolygon: { aria: 'Số cạnh đa giác đều', label: 'Số cạnh (n ≥ 3)', step: 1, min: 3 },
};

export const TransformParamPopover: React.FC<Props> = ({ kind, anchor, defaultValue, onConfirm, onCancel, isDark }) => {
  const [value, setValue] = useState<number>(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = LABELS[kind];

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const submit = () => {
    let v = Number.isFinite(value) ? value : defaultValue;
    if (kind === 'regularPolygon') {
      v = Math.max(3, Math.round(v));
    }
    onConfirm(v);
  };

  if (typeof document === 'undefined') return null;

  const node = (
    <div
      data-stamp-area="true"
      className={`${isDark ? 'theme--dark ' : ''}fixed z-[2147483600] flex flex-col gap-2 rounded-lg border border-slate-300 bg-white p-3 shadow-2xl ring-1 ring-black/5`}
      style={{ left: anchor.x, top: anchor.y, minWidth: 180 }}
      role="dialog"
      aria-label={meta.aria}
    >
      <label className="text-xs font-medium text-slate-700">{meta.label}</label>
      <input
        ref={inputRef}
        type="number"
        value={value}
        step={meta.step}
        min={meta.min}
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

  return createPortal(node, document.body);
};
