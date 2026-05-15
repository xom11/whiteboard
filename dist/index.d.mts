import * as react_jsx_runtime from 'react/jsx-runtime';
import { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
export { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
export { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';

interface SyncableAppState {
    viewBackgroundColor: string;
    zoom: AppState['zoom'];
    scrollX: number;
    scrollY: number;
    gridSize: AppState['gridSize'] | null;
    theme: AppState['theme'];
}
interface ExcalidrawSceneSnapshot {
    elements: readonly NonDeletedExcalidrawElement[];
    appState: SyncableAppState;
}

interface ExcalidrawWhiteboardViewProps {
    role: 'teacher' | 'student';
    roomId: string;
    initialScene: ExcalidrawSceneSnapshot | null;
    remoteScene: ExcalidrawSceneSnapshot | null;
    remoteFiles?: BinaryFiles | null;
    onSceneChange: (snapshot: ExcalidrawSceneSnapshot) => void;
    onFilesChange: (files: BinaryFiles, newFileIds: string[]) => void;
    /** Excalidraw UI language. Defaults to 'vi-VN'. See @excalidraw/excalidraw locales. */
    langCode?: string;
}
declare function ExcalidrawWhiteboardView({ role, initialScene, remoteScene, remoteFiles, onSceneChange, onFilesChange, langCode, }: ExcalidrawWhiteboardViewProps): react_jsx_runtime.JSX.Element;

declare function pickSyncableAppState(s: AppState): SyncableAppState;

export { type ExcalidrawSceneSnapshot, ExcalidrawWhiteboardView, type ExcalidrawWhiteboardViewProps, type SyncableAppState, pickSyncableAppState };
