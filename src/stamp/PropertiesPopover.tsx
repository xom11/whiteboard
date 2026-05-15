'use client';
import React, { useEffect, useRef, useState } from 'react';
import { STROKE_PALETTE } from './excalidrawPalette';

export type ObjKind = 'point' | 'line' | 'circle';
export type PointFace = 'o' | 'circle' | 'cross' | 'plus';

export interface PropertyPatch {
  attrs?: Record<string, unknown>;
  remove?: boolean;
}

interface CommonProps {
  anchor: { x: number; y: number };
  onClose: () => void;
  onMutate: (patch: PropertyPatch) => void;
  isDark?: boolean;
}

interface PointProps extends CommonProps {
  kind: 'point';
  currentName: string;
  currentColor: string;
  currentDash: number;
  currentWidth: number;
  currentFace: PointFace;
}

interface LineOrCircleProps extends CommonProps {
  kind: 'line' | 'circle';
  currentColor: string;
  currentDash: number;
  currentWidth: number;
}

type Props = PointProps | LineOrCircleProps;

const DASH_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Nét liền' },
  { value: 2, label: 'Nét đứt' },
  { value: 1, label: 'Nét chấm' },
];

const WIDTH_OPTIONS = [1, 2, 3];

const FACE_OPTIONS: Array<{ value: PointFace; symbol: string }> = [
  { value: 'o', symbol: '●' },
  { value: 'circle', symbol: '◯' },
  { value: 'cross', symbol: '✕' },
  { value: 'plus', symbol: '✚' },
];

export const PropertiesPopover: React.FC<Props> = (props) => {
  const { anchor, onClose, onMutate, isDark } = props;
  const rootRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState<string>(props.kind === 'point' ? props.currentName : '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouseDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouseDown, { capture: true } as EventListenerOptions);
    };
  }, [onClose]);

  const pickColor = (c: string) => {
    onMutate({ attrs: { strokeColor: c, fillColor: props.kind === 'circle' ? 'none' : c, color: c } });
  };
  const pickDash = (d: number) => onMutate({ attrs: { dash: d } });
  const pickWidth = (w: number) => onMutate({ attrs: { strokeWidth: w } });
  const pickFace = (f: PointFace) => onMutate({ attrs: { face: f } });
  const commitName = () => {
    if (props.kind !== 'point') return;
    if (name && name !== props.currentName) onMutate({ attrs: { name } });
  };
  const doDelete = () => { onMutate({ remove: true }); onClose(); };

  const currentColor = props.currentColor;
  const currentDash = props.currentDash;
  const currentWidth = props.currentWidth;

  return (
    <div
      ref={rootRef}
      data-stamp-area="true"
      className={`${isDark ? 'theme--dark ' : ''}fixed z-[60] flex w-[220px] flex-col gap-3 rounded-lg border border-slate-300 bg-white p-3 shadow-2xl ring-1 ring-black/5`}
      style={{ left: anchor.x, top: anchor.y }}
      role="dialog"
      aria-label="Thuộc tính đối tượng"
    >
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-slate-500">Màu</span>
        <div className="flex flex-wrap gap-1">
          {STROKE_PALETTE.map((c) => (
            <button
              key={c}
              aria-label={`Màu ${c}`}
              onClick={() => pickColor(c)}
              className={`h-6 w-6 rounded border ${currentColor === c ? 'border-emerald-500 ring-2 ring-emerald-300' : 'border-slate-200'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {props.kind === 'point' && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500">Tên</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitName(); } }}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-slate-500">Kiểu</span>
        {props.kind === 'point' ? (
          <div className="flex gap-1">
            {FACE_OPTIONS.map((f) => (
              <button
                key={f.value}
                aria-label={`Hình ${f.value}`}
                onClick={() => pickFace(f.value)}
                className={`h-7 w-7 rounded border text-sm ${props.currentFace === f.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white'}`}
              >
                {f.symbol}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-1">
            {DASH_OPTIONS.map((d) => (
              <button
                key={d.value}
                aria-label={`Kiểu ${d.label.toLowerCase()}`}
                onClick={() => pickDash(d.value)}
                className={`flex-1 rounded border px-1 py-1 text-[11px] ${currentDash === d.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white'}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-1 flex gap-1">
          {WIDTH_OPTIONS.map((w) => (
            <button
              key={w}
              aria-label={`Độ dày ${w}`}
              onClick={() => pickWidth(w)}
              className={`flex-1 rounded border py-1 ${currentWidth === w ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white'}`}
            >
              <span className="inline-block rounded bg-slate-800" style={{ width: 30, height: w }} />
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={doDelete}
        className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
      >
        Xoá
      </button>
    </div>
  );
};
