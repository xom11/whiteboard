'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { STROKE_PALETTE } from '../stamps/shared/excalidrawPalette';

export type ObjKind = 'point' | 'line' | 'circle';
export type PointFace = 'o' | 'circle' | 'cross' | 'plus';

export interface PropertyPatch {
  attrs?: Record<string, unknown>;
  remove?: boolean;
  /** Bật/tắt value-label động (độ dài segment / bán kính circle). */
  valueLabel?: boolean;
}

interface CommonProps {
  anchor: { x: number; y: number };
  onClose: () => void;
  onMutate: (patch: PropertyPatch) => void;
  isDark?: boolean;
  /** Trả về danh sách tên point hiện có (để rename auto-disambiguate). */
  getAllNames?: () => string[];
}

interface PointProps extends CommonProps {
  kind: 'point';
  currentName: string;
  currentColor: string;
  currentDash: number;
  currentWidth: number;
  currentFace: PointFace;
  /** Có đang hiện label tên không. */
  currentShowLabel?: boolean;
}

interface LineOrCircleProps extends CommonProps {
  kind: 'line' | 'circle';
  currentName: string;
  currentColor: string;
  currentDash: number;
  currentWidth: number;
  /** Có đang hiện label tên không. */
  currentShowLabel?: boolean;
  /** Có đang hiện value-label động không. */
  currentShowValue?: boolean;
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

// Unicode subscript digits — dùng để tự đặt tên duy nhất khi user nhập trùng.
// Lưu dưới dạng ký tự subscript thì JSXGraph SVG <text> render đúng "B₂"
// như label một glyph, không cần MathJax/KaTeX.
const SUB_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
const SUB_SET = new Set(SUB_DIGITS);

function toSubscript(n: number): string {
  return String(n).split('').map((d) => SUB_DIGITS[+d] ?? d).join('');
}

function stripTrailingSubscript(s: string): string {
  let i = s.length;
  while (i > 0 && SUB_SET.has(s[i - 1])) i--;
  return s.slice(0, i);
}

function disambiguateName(name: string, existing: Set<string>): string {
  if (!name) return name;
  if (!existing.has(name)) return name;
  const base = stripTrailingSubscript(name) || name;
  for (let n = 2; n < 1000; n++) {
    const candidate = base + toSubscript(n);
    if (!existing.has(candidate)) return candidate;
  }
  return name;
}

type Section = 'color' | 'style' | 'size' | 'name' | null;

// Inline icons (small, monochrome) — match the visual weight of Excalidraw's
// floating action bar in the screenshot. All 16px viewBox 24x24.
const Icons = {
  color: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 11 L11 3 L3 11 L11 19 Z" />
      <path d="M19 11 L21 16 a2 2 0 1 1 -4 0 Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  style: (
    <svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor" /></svg>
  ),
  size: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="9" x2="20" y2="9" strokeWidth="1" /><line x1="4" y1="13" x2="20" y2="13" strokeWidth="2" /><line x1="4" y1="17" x2="20" y2="17" strokeWidth="3.2" /></svg>
  ),
  name: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><text x="2" y="17" fontSize="14" fontFamily="serif" fontWeight="700">A</text><text x="12" y="17" fontSize="11" fontFamily="serif" fontWeight="700">a</text></svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6" /><path d="M19 6 l-1 14 a 2 2 0 0 1 -2 2 H 8 a 2 2 0 0 1 -2 -2 l-1 -14" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
  ),
};

export const PropertiesPopover: React.FC<Props> = (props) => {
  const { anchor, onClose, onMutate, isDark, getAllNames } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState<Section>(null);

  const initialName =
    props.kind === 'point' ? props.currentName : (props.kind === 'line' || props.kind === 'circle') ? props.currentName : '';
  const [name, setName] = useState<string>(initialName);
  // Khi popover mở lại trên đối tượng khác, đồng bộ name input.
  useEffect(() => {
    setName(initialName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialName]);

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

  const currentName = (props.kind === 'point' || props.kind === 'line' || props.kind === 'circle') ? props.currentName : '';
  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed === currentName) return;
    // Cho phép xoá tên (empty); chỉ disambiguate khi user nhập 1 cái gì đó.
    let final = trimmed;
    if (trimmed) {
      const others = new Set((getAllNames?.() ?? []).filter((n) => n !== currentName));
      final = disambiguateName(trimmed, others);
    }
    if (final !== name) setName(final);
    onMutate({ attrs: { name: final } });
  };

  const toggleShowLabel = (next: boolean) => onMutate({ attrs: { withLabel: next } });
  const toggleShowValue = (next: boolean) => onMutate({ valueLabel: next });

  const doDelete = () => { onMutate({ remove: true }); onClose(); };

  const toggleSection = (s: Section) => setSection((cur) => (cur === s ? null : s));

  const currentColor = props.currentColor;
  const currentDash = props.currentDash;
  const currentWidth = props.currentWidth;

  if (typeof document === 'undefined') return null;

  // Pill toolbar: row of icon buttons, separator before trash. Click một icon
  // để bung panel chi tiết bên dưới. Trash xoá ngay (không có panel).
  const PillBtn = ({ id, label, icon, active, onClick, indicatorColor }: {
    id: string; label: string; icon: React.ReactNode; active?: boolean;
    onClick: () => void; indicatorColor?: string;
  }) => (
    <button
      type="button"
      data-section={id}
      aria-label={label}
      aria-pressed={!!active}
      onClick={onClick}
      className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${
        active ? 'bg-slate-200 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      {icon}
      {indicatorColor && (
        <span
          aria-hidden
          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full"
          style={{ background: indicatorColor }}
        />
      )}
    </button>
  );

  const colorIndicatorTint = useMemo(() => currentColor, [currentColor]);

  const node = (
    <div
      ref={rootRef}
      data-stamp-area="true"
      className={`${isDark ? 'theme--dark ' : ''}fixed z-[2147483600] flex flex-col gap-1.5`}
      style={{ left: anchor.x, top: anchor.y }}
      role="dialog"
      aria-label="Thuộc tính đối tượng"
    >
      {/* Pill toolbar */}
      <div className="flex items-center gap-1 rounded-full border border-slate-300 bg-white px-1.5 py-1 shadow-lg ring-1 ring-black/5">
        <PillBtn id="color" label="Màu" icon={Icons.color} active={section === 'color'} onClick={() => toggleSection('color')} indicatorColor={colorIndicatorTint} />
        <PillBtn id="style" label="Kiểu" icon={Icons.style} active={section === 'style'} onClick={() => toggleSection('style')} />
        <PillBtn id="size" label="Độ dày" icon={Icons.size} active={section === 'size'} onClick={() => toggleSection('size')} />
        <PillBtn id="name" label="Tên" icon={Icons.name} active={section === 'name'} onClick={() => toggleSection('name')} />
        <span aria-hidden className="mx-0.5 h-5 w-px bg-slate-200" />
        <PillBtn id="delete" label="Xoá" icon={Icons.trash} onClick={doDelete} />
      </div>

      {/* Sub-panel — chỉ hiện khi user chọn 1 icon */}
      {section && (
        <div className="w-[220px] rounded-lg border border-slate-300 bg-white p-3 shadow-2xl ring-1 ring-black/5">
          {section === 'color' && (
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
          )}

          {section === 'style' && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">Kiểu</span>
              {props.kind === 'point' ? (
                <div className="flex gap-1">
                  {FACE_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      aria-label={`Hình ${f.value}`}
                      onClick={() => pickFace(f.value)}
                      className={`h-7 w-7 rounded border text-sm ${(props as PointProps).currentFace === f.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white'}`}
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
            </div>
          )}

          {section === 'size' && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">Độ dày</span>
              <div className="flex gap-1">
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
          )}

          {section === 'name' && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500">Tên</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitName(); } }}
                  autoFocus
                  placeholder={props.kind === 'point' ? 'A, B, …' : props.kind === 'line' ? 'a, b, f, …' : 'O, c, …'}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
                />
                <span className="text-[10px] text-slate-400">Trùng tên sẽ tự thêm chỉ số (B → B₂)</span>
              </div>

              <label className="flex items-center justify-between gap-2 text-[12px] text-slate-700">
                <span>Hiển thị tên</span>
                <input
                  type="checkbox"
                  checked={props.currentShowLabel !== false}
                  onChange={(e) => toggleShowLabel(e.target.checked)}
                  aria-label="Hiển thị tên"
                />
              </label>

              {(props.kind === 'line' || props.kind === 'circle') && (
                <label className="flex items-center justify-between gap-2 text-[12px] text-slate-700">
                  <span>Hiển thị giá trị</span>
                  <input
                    type="checkbox"
                    checked={!!(props as LineOrCircleProps).currentShowValue}
                    onChange={(e) => toggleShowValue(e.target.checked)}
                    aria-label="Hiển thị giá trị"
                  />
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(node, document.body);
};
