'use client';
/**
 * MultiPropertiesPopover — popover compact cho multi-select (≥2 đối tượng).
 *
 * Khác với PropertiesPopover (single-select): chỉ phơi ra các action chung
 * cho mọi kind — đổi màu + xóa. Các trường kind-specific (face, dash, name,
 * showValue) bị ẩn vì không có ngữ nghĩa nhất quán trên selection nhiều kind
 * khác nhau.
 *
 * EditorPanel gọi `onColor(c)` cho mỗi id selected; `onDelete()` xóa tất cả.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { STROKE_PALETTE } from '../../shared/excalidrawPalette';
import { useIsMobile } from '../../shared/useIsMobile';

type Section = 'color' | null;

const Icons = {
  color: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 11 L11 3 L3 11 L11 19 Z" />
      <path d="M19 11 L21 16 a2 2 0 1 1 -4 0 Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6 l-1 14 a 2 2 0 0 1 -2 2 H 8 a 2 2 0 0 1 -2 -2 l-1 -14" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
};

export interface MultiPropertiesPopoverProps {
  anchor: { x: number; y: number };
  count: number;
  isDark?: boolean;
  onColor: (color: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const MultiPropertiesPopover: React.FC<MultiPropertiesPopoverProps> = (props) => {
  const { anchor, count, isDark, onColor, onDelete, onClose } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState<Section>(null);
  const { isMobile } = useIsMobile();
  const [clamped, setClamped] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const margin = 8;
    if (isMobile) {
      const rect = rootRef.current?.getBoundingClientRect();
      const w = rect?.width ?? 220;
      const left = Math.max(margin, (window.innerWidth - w) / 2);
      const top = window.innerHeight - (rect?.height ?? 80) - margin - 12;
      setClamped({ left, top: Math.max(margin, top) });
      return;
    }
    const rect = rootRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 220;
    const h = rect?.height ?? 80;
    const left = Math.max(margin, Math.min(anchor.x, window.innerWidth - w - margin));
    const top = Math.max(margin, Math.min(anchor.y, window.innerHeight - h - margin));
    setClamped({ left, top });
  }, [anchor.x, anchor.y, isMobile, section]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown, { capture: true } as EventListenerOptions);
    };
  }, [onClose]);

  const toggleSection = (s: Section) => setSection((cur) => (cur === s ? null : s));
  const doDelete = () => { onDelete(); onClose(); };

  if (typeof document === 'undefined') return null;

  const PillBtn = ({ id, label, icon, active, onClick }: {
    id: string; label: string; icon: React.ReactNode; active?: boolean; onClick: () => void;
  }) => (
    <button
      type="button"
      data-section={id}
      data-pill-btn={id}
      aria-label={label}
      aria-pressed={!!active}
      onClick={onClick}
      className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${
        active ? 'bg-slate-200 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      {icon}
    </button>
  );

  const pos = clamped ?? { left: anchor.x, top: anchor.y };
  const node = (
    <div
      ref={rootRef}
      data-stamp-area="true"
      data-testid="multi-properties-popover"
      className={`${isDark ? 'theme--dark ' : ''}fixed z-[2147483600] flex flex-col gap-1.5`}
      style={{ left: pos.left, top: pos.top }}
      role="dialog"
      aria-label={`Thuộc tính (${count} đối tượng)`}
    >
      <div className="flex items-center gap-1 rounded-full border border-slate-300 bg-white px-1.5 py-1 shadow-lg ring-1 ring-black/5">
        <span className="px-1 text-[11px] font-medium text-slate-500">{count} đã chọn</span>
        <span aria-hidden className="mx-0.5 h-5 w-px bg-slate-200" />
        <PillBtn id="color" label="Đổi màu" icon={Icons.color} active={section === 'color'} onClick={() => toggleSection('color')} />
        <span aria-hidden className="mx-0.5 h-5 w-px bg-slate-200" />
        <PillBtn id="delete" label="Xoá tất cả" icon={Icons.trash} onClick={doDelete} />
      </div>

      {section === 'color' && (
        <div className="w-[220px] rounded-lg border border-slate-300 bg-white p-3 shadow-2xl ring-1 ring-black/5">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Màu (áp cho {count} đối tượng)</span>
            <div className="flex flex-wrap gap-1">
              {STROKE_PALETTE.map((c) => (
                <button
                  key={c}
                  aria-label={`Màu ${c}`}
                  onClick={() => onColor(c)}
                  className="h-6 w-6 rounded border border-slate-200"
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(node, document.body);
};
