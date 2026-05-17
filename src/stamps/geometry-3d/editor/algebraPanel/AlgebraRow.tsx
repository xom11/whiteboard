'use client';
import * as React from 'react';
import type { Scene3DObject } from '../scene/types';
import type { Scene3D } from '../scene/Scene3D';
import { symbolicFor, numericFor } from './symbolic';
import { RowMenu } from './RowMenu';

export interface AlgebraRowProps {
  obj: Scene3DObject;
  scene: Scene3D;
  onDelete: (id: string) => void;
}

export function AlgebraRow(props: AlgebraRowProps): React.ReactElement {
  const { obj, scene, onDelete } = props;
  const symbolic = symbolicFor(obj, scene);
  const numeric = numericFor(obj, scene);
  return (
    <li
      data-testid={`algebra-row-${obj.id}`}
      className="flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5 text-xs dark:border-zinc-800"
    >
      <span
        aria-hidden
        className="inline-block size-3 rounded-full border"
        style={{ backgroundColor: obj.color ?? '#0066cc' }}
      />
      <span className="min-w-[3ch] font-semibold">{obj.label}</span>
      <span className="text-zinc-500">=</span>
      <span className="flex-1 truncate font-mono">{symbolic}</span>
      {numeric ? <span className="truncate text-zinc-500">{numeric}</span> : null}
      <RowMenu
        visible={obj.visible}
        onRename={() => { /* no-op for now; wired in EditorPanel later */ }}
        onChangeColor={() => { /* no-op */ }}
        onToggleVisibility={() => { /* no-op */ }}
        onDelete={() => onDelete(obj.id)}
      />
    </li>
  );
}
