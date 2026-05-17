import * as react_jsx_runtime from 'react/jsx-runtime';
import { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
export { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
export { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import { S as StampType } from './types-CinstD7T.mjs';
export { B as BaseStampCustomData } from './types-CinstD7T.mjs';
import { GeometryCustomData } from './geometry-2d.mjs';
export { geometryStamp, isGeometryCustomData } from './geometry-2d.mjs';
import { LatexCustomData } from './latex.mjs';
export { isLatexCustomData, latexStamp } from './latex.mjs';
import { Geometry3DCustomData } from './geometry-3d.mjs';
export { geometry3dStamp, isGeometry3DCustomData } from './geometry-3d.mjs';
import { Graph2DCustomData } from './graph-2d.mjs';
export { graph2dStamp, isGraph2DCustomData } from './graph-2d.mjs';
import 'react';

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

/** Stamp ổn định, sẵn sàng production. */
declare const STABLE_STAMPS: ReadonlyArray<StampType>;
/** Stamp experimental — chưa ổn định cho production. Consumer phải opt-in. */
declare const EXPERIMENTAL_STAMPS: ReadonlyArray<StampType>;
/** Tất cả stamp (stable + experimental). Dùng khi consumer muốn full feature. */
declare const ALL_STAMPS: ReadonlyArray<StampType>;
/**
 * Set stamp mặc định cho Whiteboard = ALL_STAMPS (bật tất cả tool).
 * Consumer muốn ẩn experimental: `<Whiteboard stamps={STABLE_STAMPS} />`.
 *
 * Để thêm 1 stamp mới (vd chart):
 *   1. Tạo `src/stamps/chart/index.tsx` export `chartStamp: StampType`.
 *   2. Import + add vào STABLE_STAMPS (production-ready) hoặc
 *      EXPERIMENTAL_STAMPS (chưa ổn định) ở file này.
 *   3. Re-export `chartStamp` từ `src/stamps/index.ts` + `src/index.ts`.
 */
declare const DEFAULT_STAMPS: ReadonlyArray<StampType>;
/** Tìm stamp tương ứng với customData của element. null nếu không match. */
declare function findStampForCustomData(data: unknown, stamps?: ReadonlyArray<StampType>): StampType | null;
/** isMathStamp version dựa trên registry. */
declare function isStampElement<T extends {
    customData?: unknown;
}>(element: T, stamps?: ReadonlyArray<StampType>): boolean;

interface WhiteboardProps {
    /**
     * Storage key cho persist client-side.
     * - Scene -> localStorage['whiteboard:scene:'+storageKey]
     * - Files raster -> IndexedDB 'whiteboard-files' index theo storageKey
     * - Default: 'default'
     * - Truyen `null` de tat persist (consumer drive state qua onApi).
     */
    storageKey?: string | null;
    /** View-only (Excalidraw viewModeEnabled). Default false. */
    readOnly?: boolean;
    /** Local edits -> consumer broadcast. Optional. */
    onSceneChange?: (snapshot: ExcalidrawSceneSnapshot) => void;
    onFilesChange?: (files: BinaryFiles, newFileIds: string[]) => void;
    /** Excalidraw imperative API. Consumer dung inject remote scene khi can. */
    onApi?: (api: any) => void;
    /** Excalidraw UI language. Defaults to 'vi-VN'. See @excalidraw/excalidraw locales. */
    langCode?: string;
    /**
     * Danh sách stamp đăng ký. Mỗi stamp khai báo phím tắt + toolbar button +
     * Host component (UI editing). Mặc định DEFAULT_STAMPS (= ALL_STAMPS,
     * gồm geometry + latex + geometry3d + graph2d).
     * Truyền `[...DEFAULT_STAMPS, customStamp]` để thêm stamp mới hoặc
     * `STABLE_STAMPS` để chỉ bật stamp ổn định.
     */
    stamps?: ReadonlyArray<StampType>;
}
declare function Whiteboard({ storageKey, readOnly, onSceneChange, onFilesChange, onApi, langCode, stamps, }: WhiteboardProps): react_jsx_runtime.JSX.Element;

declare function pickSyncableAppState(s: AppState): SyncableAppState;

interface ElementLike {
    id: string;
    type?: string;
    fileId?: string | null;
    customData?: unknown;
}
/**
 * Find stamp elements whose binary file is missing from Excalidraw, then
 * regenerate via registry dispatch. Idempotent: safe to call on every scene
 * update.
 *
 * Stamps that implement `restoreFileFromCustomData` are handled via the new
 * registry-driven path (stamp receives the full element and returns the file
 * record). Stamps that only implement `renderSvgFromCustomData` use the legacy
 * path (filter type=image + fileId, skip already-present files).
 *
 * @param api Excalidraw imperative API.
 * @param elements Tất cả elements trong scene.
 * @param stamps Registry. Default = DEFAULT_STAMPS.
 */
declare function restoreMissingStampFiles(api: any, elements: readonly ElementLike[], stamps?: ReadonlyArray<StampType>): Promise<void>;

type StampCustomData = GeometryCustomData | LatexCustomData | Geometry3DCustomData | Graph2DCustomData;

export { ALL_STAMPS, DEFAULT_STAMPS, EXPERIMENTAL_STAMPS, type ExcalidrawSceneSnapshot, Geometry3DCustomData, GeometryCustomData, Graph2DCustomData, LatexCustomData, STABLE_STAMPS, type StampCustomData, StampType, type SyncableAppState, Whiteboard, type WhiteboardProps, findStampForCustomData, isStampElement, pickSyncableAppState, restoreMissingStampFiles };
