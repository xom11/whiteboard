'use client';

import { useEffect, useState, type KeyboardEvent, type FocusEvent } from 'react';

export interface FunctionRowProps {
  id: string;
  name: string;
  expression: string;
  color: string;
  visible: boolean;
  error: string | null;
  onExpressionCommit: (expr: string) => void;
  onToggleVisible: () => void;
  onRemove: () => void;
}

export function FunctionRow(props: FunctionRowProps) {
  const { id, name, expression, color, visible, error } = props;
  const [draft, setDraft] = useState(expression);

  useEffect(() => {
    setDraft(expression);
  }, [expression]);

  const commit = () => {
    if (draft !== expression) props.onExpressionCommit(draft);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setDraft(expression);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleBlur = (_: FocusEvent<HTMLInputElement>) => commit();

  return (
    <div className={`graph-function-row${error ? ' is-error' : ''}`} data-testid={`graph-function-row-${id}`}>
      <span
        className="graph-function-color"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="graph-function-name" data-testid={`graph-function-name-${id}`}>
        {name}(x) =
      </span>
      <input
        aria-label="Biểu thức"
        className="graph-function-input"
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      <button
        type="button"
        aria-label="Ẩn/hiện đồ thị"
        className={`graph-function-eye${visible ? '' : ' is-hidden'}`}
        onClick={props.onToggleVisible}
      >
        {visible ? '👁' : '⊘'}
      </button>
      <button
        type="button"
        aria-label="Xoá đồ thị"
        className="graph-function-remove"
        onClick={props.onRemove}
      >
        ✕
      </button>
      {error ? <div className="graph-function-error">{error}</div> : null}
    </div>
  );
}
