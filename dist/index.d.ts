import * as react_jsx_runtime from 'react/jsx-runtime';
import { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
export { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
export { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import { S as StampType } from './types-CinstD7T.js';
export { B as BaseStampCustomData } from './types-CinstD7T.js';
import { GeometryCustomData } from './geometry-2d.js';
export { geometryStamp, isGeometryCustomData } from './geometry-2d.js';
import { LatexCustomData } from './latex.js';
export { isLatexCustomData, latexStamp } from './latex.js';
import { Geometry3DCustomData } from './geometry-3d.js';
export { geometry3dStamp, isGeometry3DCustomData } from './geometry-3d.js';
import { Graph2DCustomData } from './graph-2d.js';
export { graph2dStamp, isGraph2DCustomData } from './graph-2d.js';
import { PDFDocumentProxy } from 'pdfjs-dist';
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
    /**
     * Snapshot từ server. Precedence: `initialScene` > localStorage > blank.
     * - `undefined` (default) → đọc từ localStorage qua `storageKey`
     * - `null` → explicit blank, bỏ qua localStorage
     * - object → dùng làm initialData của Excalidraw, bỏ qua localStorage
     *
     * Dùng để load board từ server. Thường đi cùng `storageKey={null}` để
     * tránh localStorage stale override server data.
     */
    initialScene?: ExcalidrawSceneSnapshot | null;
    /**
     * Binary files (raster, base64) từ server. Add vào Excalidraw đúng 1 lần
     * khi api ready. Dùng kèm `initialScene` cho flow load-from-server.
     * Nếu cần inject files động về sau, dùng `onApi` rồi gọi `api.addFiles`.
     */
    initialFiles?: BinaryFiles;
}
declare function Whiteboard({ storageKey, readOnly, onSceneChange, onFilesChange, onApi, langCode, stamps, initialScene, initialFiles, }: WhiteboardProps): react_jsx_runtime.JSX.Element;

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

/**
 * Rasterize PDF → PNG dataURLs cho từng trang.
 *
 * Worker config:
 *   - pdfjs-dist 5.x cần `GlobalWorkerOptions.workerSrc` (URL tới worker .mjs).
 *   - Mặc định trỏ CDN (jsdelivr). Consumer có thể override qua
 *     `configurePdfWorker(src)` trước khi gọi rasterize lần đầu.
 *   - Lý do CDN thay vì bundled worker: tsup không có cách clean để emit
 *     worker chunk ra cùng dist/ với URL ổn định, và consumer (Next.js)
 *     có thể self-host nếu cần offline.
 *
 * Lazy import pdfjs-dist để không phình bundle khi user không dùng PDF.
 */

/**
 * Override workerSrc trước khi rasterize. Gọi từ consumer khi cần self-host
 * worker file (vd offline mode, CSP cấm CDN).
 *
 * Mặc định nếu không gọi: dùng CDN jsdelivr theo version pdfjs-dist đã cài.
 */
declare function configurePdfWorker(workerSrc: string): void;
interface RasterizedPage {
    pageNumber: number;
    dataURL: string;
    width: number;
    height: number;
    mimeType: 'image/png';
}
interface RasterizeOptions {
    /** Scale render. Mặc định 2 (HiDPI sharp). */
    scale?: number;
    /** Danh sách trang 1-based. Mặc định: tất cả. */
    pages?: number[];
    /** Callback progress sau mỗi page. */
    onProgress?: (done: number, total: number) => void;
    /** AbortSignal để cancel giữa chừng. */
    signal?: AbortSignal;
}
/**
 * Load PDF chỉ để lấy `numPages` (vd hiển thị tổng số trang trên dialog).
 * Caller phải tự đóng document bằng `closePdfDocument(doc)` khi xong.
 */
declare function loadPdfDocument(source: File | Blob | ArrayBuffer): Promise<PDFDocumentProxy>;
declare function closePdfDocument(doc: PDFDocumentProxy): Promise<void>;
/**
 * Render danh sách trang ra PNG dataURL.
 *
 * Lưu ý:
 *   - Sử dụng `OffscreenCanvas` nếu có (browser hiện đại) để không touch DOM,
 *     fallback `<canvas>` document.createElement.
 *   - Mỗi page render xong sẽ release canvas (cho GC sớm với PDF nhiều trang).
 */
declare function rasterizePdf(doc: PDFDocumentProxy, options?: RasterizeOptions): Promise<RasterizedPage[]>;

type ExApi = any;
interface InsertRasterizedPagesOptions {
    /** Scale dùng khi rasterize (để chia pixel → scene units). */
    scale: number;
    /** Toạ độ scene gốc cho page đầu tiên. Bỏ qua → giữa viewport. */
    origin?: {
        x: number;
        y: number;
    };
}
interface InsertRasterizedPagesResult {
    insertedElementIds: string[];
    fileIds: string[];
}
/**
 * Chèn array `RasterizedPage` đã có sẵn vào scene. Tách ra để Whiteboard
 * có thể: load doc → hỏi user range → rasterize → insert mà không phải gọi
 * insertPdfPages (load lại từ ArrayBuffer 2 lần).
 */
declare function insertRasterizedPagesIntoScene(api: ExApi, rendered: RasterizedPage[], options: InsertRasterizedPagesOptions): InsertRasterizedPagesResult;
interface InsertPdfPagesOptions {
    /** Trang cần chèn (1-based). Bỏ qua → chèn tất cả. */
    pages?: number[];
    /** Scale rasterize. Mặc định 2. */
    scale?: number;
    /** Toạ độ scene gốc cho page đầu tiên. Bỏ qua → giữa viewport. */
    origin?: {
        x: number;
        y: number;
    };
    /** Progress callback. */
    onProgress?: (done: number, total: number) => void;
    /** AbortSignal. */
    signal?: AbortSignal;
}
interface InsertPdfPagesResult {
    insertedElementIds: string[];
    pages: RasterizedPage[];
}
/**
 * High-level: rasterize PDF + insert thành nhiều image element xếp dọc.
 *
 * Flow:
 *   1. loadPdfDocument(source) → PDFDocumentProxy
 *   2. rasterizePdf(doc, {pages, scale}) → RasterizedPage[]
 *   3. Tạo fileId cho từng page, gọi api.addFiles batch.
 *   4. Tính position: page 1 trung tâm viewport (hoặc origin), các page sau
 *      xếp dưới, cách PAGE_GAP.
 *   5. api.updateScene({ elements: [...cũ, ...mới] })
 *
 * Không serialize PDF bytes — sau insert, các page là image element thuần,
 * không thể re-edit qua double-click (theo design quyết định).
 */
declare function insertPdfPages(api: ExApi, source: File | Blob | ArrayBuffer, options?: InsertPdfPagesOptions): Promise<InsertPdfPagesResult>;

/**
 * Parse chuỗi range trang dạng "1,3,5-10" → array số 1-based đã sort + dedupe.
 *
 * - Tokens cách nhau bằng dấu phẩy hoặc khoảng trắng.
 * - Token có gạch "-" → range inclusive (5-10 = [5,6,7,8,9,10]).
 * - Khoảng trắng quanh số bị bỏ qua.
 * - Empty / chỉ space → [].
 *
 * Throws `Error` với message tiếng Việt khi:
 *   - Token không phải số / không phải range hợp lệ.
 *   - Số <= 0 hoặc > totalPages.
 *   - Range đảo ngược (vd "10-5") — coi là lỗi user thay vì auto-reverse để
 *     tránh nuốt typo.
 */
declare function parsePageRange(input: string, totalPages: number): number[];

export { ALL_STAMPS, DEFAULT_STAMPS, EXPERIMENTAL_STAMPS, type ExcalidrawSceneSnapshot, Geometry3DCustomData, GeometryCustomData, Graph2DCustomData, type InsertPdfPagesOptions, type InsertPdfPagesResult, type InsertRasterizedPagesOptions, type InsertRasterizedPagesResult, LatexCustomData, type RasterizeOptions, type RasterizedPage, STABLE_STAMPS, type StampCustomData, StampType, type SyncableAppState, Whiteboard, type WhiteboardProps, closePdfDocument, configurePdfWorker, findStampForCustomData, insertPdfPages, insertRasterizedPagesIntoScene, isStampElement, loadPdfDocument, parsePageRange, pickSyncableAppState, rasterizePdf, restoreMissingStampFiles };
