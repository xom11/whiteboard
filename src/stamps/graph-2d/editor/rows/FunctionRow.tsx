'use client';
import React, { useEffect, useState, type KeyboardEvent } from 'react';
import type { SceneObject } from '../../../../core/scene/types';
import type { Function2DAttrs } from '../../../../core/scene/kinds/function2d';
import type { Store } from '../../../../core/scene/store';
import { compile } from '../../../../core/scene/expressions/parser';

export interface FunctionRowProps {
  obj: SceneObject<Function2DAttrs>;
  store: Store;
  selected: boolean;
  onClick: () => void;
}

export function FunctionRow({ obj, store, selected, onClick }: FunctionRowProps): React.ReactElement {
  const [local, setLocal] = useState(obj.attrs.expression);
  const [error, setError] = useState<string | null>(null);

  // Sync local draft khi store expression thay đổi từ bên ngoài
  useEffect(() => {
    setLocal(obj.attrs.expression);
    setError(null);
  }, [obj.attrs.expression]);

  function commit(value: string) {
    if (value === obj.attrs.expression) {
      setError(null);
      return;
    }
    // Use compile (includes full syntax check via new Function) to validate
    const result = compile(value, {});
    if (typeof result === 'string') {
      // compile returns an error string on failure
      setError(result);
      return;
    }
    setError(null);
    store.dispatch({
      type: 'UPDATE_ATTRS',
      payload: { id: obj.id, patch: { expression: value } },
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(local);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setLocal(obj.attrs.expression);
      setError(null);
      (e.target as HTMLInputElement).blur();
    }
  }

  function handleToggleVisible() {
    store.dispatch({
      type: 'UPDATE_ATTRS',
      payload: { id: obj.id, patch: { visible: !obj.attrs.visible } },
    });
  }

  return (
    <li
      data-testid={`function-row-${obj.id}`}
      aria-selected={selected}
      onClick={onClick}
      className={
        'flex items-center gap-1.5 border-b border-zinc-100 px-2 py-1 text-xs cursor-pointer dark:border-zinc-800 ' +
        (selected ? 'bg-slate-200' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900')
      }
    >
      {/* Color swatch */}
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: obj.attrs.color }}
        aria-hidden="true"
      />
      {/* Label */}
      <span className="shrink-0 font-mono text-[11px] text-slate-700">
        {obj.label}(x)&nbsp;=
      </span>
      {/* Expression input */}
      <input
        type="text"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(local)}
        onClick={(e) => e.stopPropagation()}
        className={[
          'min-w-0 flex-1 rounded border px-1.5 py-0.5 font-mono text-xs outline-none focus:ring-1',
          error
            ? 'border-red-400 focus:ring-red-300'
            : 'border-slate-300 focus:ring-blue-300',
        ].join(' ')}
        data-testid={`function-row-input-${obj.id}`}
        aria-label="Biểu thức"
      />
      {/* Error indicator */}
      {error && (
        <span
          data-testid={`function-row-error-${obj.id}`}
          className="shrink-0 text-[10px] text-red-600"
          title={error}
        >
          ⚠
        </span>
      )}
      {/* Visibility toggle */}
      <button
        type="button"
        aria-label="Ẩn/hiện hàm"
        aria-pressed={!obj.attrs.visible}
        onClick={(e) => { e.stopPropagation(); handleToggleVisible(); }}
        className="shrink-0 rounded px-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {obj.attrs.visible ? '👁' : '🚫'}
      </button>
    </li>
  );
}
