import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';

export type { ExcalidrawElement, NonDeletedExcalidrawElement, AppState, BinaryFiles };

// Subset of AppState that we sync teacher → student. Loại bỏ các trường chỉ có ý nghĩa
// local (cursor, draggingElement, selectedElementIds...) — giảm size + tránh interference.
export interface SyncableAppState {
  viewBackgroundColor: string;
  zoom: AppState['zoom'];
  scrollX: number;
  scrollY: number;
  gridSize: AppState['gridSize'] | null;
  theme: AppState['theme'];
  /**
   * Nét sẽ dùng cho hình kế tiếp. Excalidraw KHÔNG coi đây là dữ liệu scene,
   * nhưng ta lưu vì thanh trượt cho phép chọn ngoài bộ ba thin/bold/extraBold —
   * không nhớ thì GV chọn nét mảnh xong tải lại là về mặc định 2.
   */
  currentItemStrokeWidth: number;
}

export interface ExcalidrawSceneSnapshot {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: SyncableAppState;
}
