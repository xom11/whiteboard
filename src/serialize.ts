import type { AppState } from '@excalidraw/excalidraw/types';
import type { SyncableAppState } from './types';

export function pickSyncableAppState(s: AppState): SyncableAppState {
  return {
    viewBackgroundColor: s.viewBackgroundColor,
    zoom: s.zoom,
    scrollX: s.scrollX,
    scrollY: s.scrollY,
    gridSize: s.gridSize ?? null,
    theme: s.theme,
  };
}
