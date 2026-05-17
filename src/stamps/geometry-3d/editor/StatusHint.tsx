'use client';
import * as React from 'react';

export interface StatusHintProps {
  hint: string;
  hoverLabel?: string | null;
}

export function StatusHint(props: StatusHintProps): React.ReactElement {
  const { hint, hoverLabel } = props;
  return (
    <div
      data-testid="status-hint"
      className="border-t border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
    >
      <span>📐 {hint || 'Chọn công cụ trong bảng bên trái'}</span>
      {hoverLabel ? (
        <span className="ml-3 text-zinc-500">— đang trên: {hoverLabel}</span>
      ) : null}
    </div>
  );
}
