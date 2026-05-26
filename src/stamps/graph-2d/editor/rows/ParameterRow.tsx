'use client';
import React from 'react';
import type { SceneObject } from '../../../../core/scene/types';
import type { ParameterAttrs } from '../../../../core/scene/kinds/parameter';
import type { Store } from '../../../../core/scene/store';

export interface ParameterRowProps {
  obj: SceneObject<ParameterAttrs>;
  store: Store;
  selected: boolean;
  onClick: () => void;
}

export function ParameterRow({ obj, store, selected, onClick }: ParameterRowProps): React.ReactElement {
  const { value, min, max, step } = obj.attrs;

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVal = parseFloat(e.target.value);
    if (!Number.isFinite(newVal)) return;
    store.dispatch({
      type: 'UPDATE_ATTRS',
      payload: { id: obj.id, patch: { value: newVal } },
    });
  }

  return (
    <li
      data-testid={`parameter-row-${obj.id}`}
      aria-selected={selected}
      onClick={onClick}
      className={
        'flex items-center gap-1.5 border-b border-zinc-100 px-2 py-1 text-xs cursor-pointer dark:border-zinc-800 ' +
        (selected ? 'bg-slate-200' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900')
      }
    >
      {/* Label */}
      <span className="shrink-0 w-4 font-mono text-[11px] font-semibold text-slate-700">
        {obj.label}
      </span>

      {/* Slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        onClick={(e) => e.stopPropagation()}
        className="min-w-0 flex-1 accent-blue-600"
        data-testid={`parameter-row-slider-${obj.id}`}
        aria-label={`Tham số ${obj.label}`}
      />

      {/* Numeric display */}
      <span
        data-testid={`parameter-row-value-${obj.id}`}
        className="shrink-0 w-8 text-right font-mono text-[11px] text-slate-600"
      >
        {Number.isInteger(value) ? value : parseFloat(value.toFixed(3))}
      </span>
    </li>
  );
}
