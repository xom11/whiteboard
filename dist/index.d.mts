import * as react_jsx_runtime from 'react/jsx-runtime';
import { NonDeletedExcalidrawElement, ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
export { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
export { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import { ReactNode, ForwardRefExoticComponent, RefAttributes } from 'react';

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

/**
 * Kết quả trả về từ `restoreFileFromCustomData`. Chứa đủ thông tin để
 * consumer gọi `api.addFiles(...)`.
 */
interface RestoredStampFile {
    fileId: string;
    dataURL: string;
    mimeType: 'image/svg+xml' | 'image/png';
}
/**
 * Tối thiểu mọi custom data của stamp cần có. Các stamp cụ thể (geometry,
 * latex, ...) extend interface này với fields riêng.
 */
interface BaseStampCustomData {
    kind: string;
    version: number;
}
/**
 * Props mà mỗi StampHost nhận từ Whiteboard. Host component tự
 * quản lý state nội bộ (panel ref, undo stack, displayMode...) — main view
 * chỉ điều phối show/hide.
 */
interface StampHostProps {
    api: any;
    /**
     * Element đang re-edit (double-click) hoặc null nếu đang tạo mới.
     * Host tự parse customData để load state ban đầu.
     */
    editingElement: {
        id: string;
        customData: unknown;
    } | null;
    /** Đóng stamp panel (gọi sau khi insert hoặc khi user huỷ). */
    onClose: () => void;
    /** Dark theme flag. */
    isDark: boolean;
}
/**
 * Imperative API mà main view truy cập qua ref:
 *   - tryInsert(): khi user click ra ngoài → auto-commit nếu valid.
 *     Trả về true nếu chèn thành công, false nếu chưa có nội dung.
 *   - hasContent(): có nội dung để chèn không.
 */
interface StampHostHandle {
    tryInsert(): boolean;
    hasContent(): boolean;
}
type StampHostComponent = ForwardRefExoticComponent<StampHostProps & RefAttributes<StampHostHandle>>;
/**
 * Định nghĩa 1 loại stamp. Mỗi stamp khai báo:
 *   - kind: unique string (khớp với customData.kind)
 *   - phím tắt + UI toolbar
 *   - cách nhận biết customData thuộc về stamp này (matchesCustomData)
 *   - cách re-render SVG từ customData (cho restore sau reload)
 *   - Host component: bọc trọn editor + left panel + insert logic
 *
 * Main view dispatch generic: `<stamp.Host ... />` — không cần biết kind.
 */
interface StampType {
    /** Unique kind. VD: 'geometry', 'latex'. Phải khớp với customData.kind. */
    kind: string;
    /** Phím tắt mở/đóng stamp (lowercase, 1 ký tự). VD: 'g', 'l'. */
    shortcutKey: string;
    /** Chữ hiển thị overlay góc dưới nút toolbar (e.g. "G"). */
    toolbarLabel: string;
    /** Tooltip + aria-label của nút toolbar. */
    toolbarTitle: string;
    /** Icon SVG (ReactNode) trong nút toolbar. */
    toolbarIcon: ReactNode;
    /** Test data-testid cho nút toolbar (optional). */
    toolbarTestId?: string;
    /** Type guard: customData có thuộc về stamp này không. */
    matchesCustomData(data: unknown): boolean;
    /**
     * Re-render SVG từ customData. Dùng khi restore math-stamp file sau reload
     * page (Excalidraw không persist binary file payload, chỉ giữ fileId trong
     * element). SVG render với light palette (nét đậm) — Excalidraw tự đảo
     * màu trong dark mode qua CSS filter.
     */
    renderSvgFromCustomData(data: unknown): Promise<string>;
    /**
     * Regenerate file SVG/PNG cho element thuộc stamp này khi reload từ persisted
     * snapshot. Trả về `RestoredStampFile` để consumer gọi `api.addFiles`, hoặc
     * `null` nếu element không cần file (vd stamp chỉ là text overlay).
     *
     * Khi method này có mặt, `restoreMissingStampFiles` sẽ ưu tiên gọi method
     * này thay vì dùng `renderSvgFromCustomData`. Stamp tự chịu trách nhiệm lấy
     * `fileId` từ element và render file.
     */
    restoreFileFromCustomData?: (element: ExcalidrawElement) => Promise<RestoredStampFile | null>;
    /**
     * Host component bọc toàn bộ UI editing (panel + left panel + insert
     * handler). Whiteboard mount Host khi activeStamp khớp kind.
     */
    Host: StampHostComponent;
}

interface GeometryCustomData extends BaseStampCustomData {
    kind: 'geometry';
    version: 1;
    jsonState: string;
    svgWidth: number;
    svgHeight: number;
}
declare function isGeometryCustomData(data: unknown): data is GeometryCustomData;
declare const geometryStamp: StampType;

interface LatexCustomData extends BaseStampCustomData {
    kind: 'latex';
    version: 1;
    src: string;
    displayMode: boolean;
}
declare function isLatexCustomData(data: unknown): data is LatexCustomData;
declare const latexStamp: StampType;

/**
 * Set stamp mặc định dùng trong Whiteboard. Consumer có thể
 * truyền custom array để bật/tắt từng stamp hoặc đăng ký stamp mới.
 *
 * Để thêm 1 stamp mới (vd chart):
 *   1. Tạo `src/stamp/registry/chart.tsx` với StampType object.
 *   2. Add vào DEFAULT_STAMPS ở dưới, HOẶC consumer truyền
 *      `<Whiteboard stamps={[...DEFAULT_STAMPS, chartStamp]} />`.
 */
declare const DEFAULT_STAMPS: ReadonlyArray<StampType>;
/** Tìm stamp tương ứng với customData của element. null nếu không match. */
declare function findStampForCustomData(data: unknown, stamps?: ReadonlyArray<StampType>): StampType | null;
/** isMathStamp version dựa trên registry — replace logic hardcode trong types.ts. */
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
     * Host component (UI editing). Mặc định DEFAULT_STAMPS (geometry + latex).
     * Truyền `[...DEFAULT_STAMPS, customStamp]` để thêm stamp mới.
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

type StampCustomData = GeometryCustomData | LatexCustomData;

/** @deprecated Dùng `isStampElement` thay vì `isMathStamp`. Sẽ xoá ở 0.6.0. */
declare const isMathStamp: typeof isStampElement;
/** @deprecated Dùng `StampCustomData` thay vì `MathStampCustomData`. Sẽ xoá ở 0.6.0. */
type MathStampCustomData = StampCustomData;
/** @deprecated Dùng `restoreMissingStampFiles` thay vì `restoreMissingMathStampFiles`. Sẽ xoá ở 0.6.0. */
declare const restoreMissingMathStampFiles: typeof restoreMissingStampFiles;

export { type BaseStampCustomData, DEFAULT_STAMPS, type ExcalidrawSceneSnapshot, type GeometryCustomData, type LatexCustomData, type MathStampCustomData, type StampCustomData, type StampType, type SyncableAppState, Whiteboard, type WhiteboardProps, findStampForCustomData, geometryStamp, isGeometryCustomData, isLatexCustomData, isMathStamp, isStampElement, latexStamp, pickSyncableAppState, restoreMissingMathStampFiles, restoreMissingStampFiles };
