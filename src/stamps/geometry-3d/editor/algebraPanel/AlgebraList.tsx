'use client';
import * as React from 'react';
import type { Scene3D } from '../scene/Scene3D';
import type { Scene3DObject } from '../scene/types';
import { AlgebraRow } from './AlgebraRow';

export interface AlgebraListProps {
  scene: Scene3D;
}

export function AlgebraList(props: AlgebraListProps): React.ReactElement {
  const { scene } = props;
  const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    const unsubAdd = scene.on('add', () => forceUpdate());
    const unsubChange = scene.on('change', () => forceUpdate());
    const unsubDelete = scene.on('delete', () => forceUpdate());
    const unsubReset = scene.on('reset', () => forceUpdate());
    return () => { unsubAdd(); unsubChange(); unsubDelete(); unsubReset(); };
  }, [scene]);

  const objects: Scene3DObject[] = scene.list();

  return (
    <ul
      data-testid="algebra-list"
      className="flex max-h-[calc(100vh-200px)] flex-col overflow-y-auto"
    >
      {objects.length === 0 ? (
        <li className="px-3 py-4 text-center text-xs text-zinc-500">Chưa có đối tượng nào</li>
      ) : (
        objects.map((o) => (
          <AlgebraRow key={o.id} obj={o} scene={scene} onDelete={(id) => scene.delete(id)} />
        ))
      )}
    </ul>
  );
}
