import type { ExcalidrawElement } from '../types';
import { closePdfDocument, loadPdfDocument, rasterizePdf, type RasterizedPage } from './rasterize';

// Excalidraw imperative API — không có public type chính xác.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExApi = any;

/** Khoảng cách dọc giữa các trang PDF khi xếp dọc, ở scene units. */
const PAGE_GAP = 24;

/** Scale render mặc định (HiDPI sharp). */
const DEFAULT_SCALE = 2;

export interface InsertRasterizedPagesOptions {
  /** Scale dùng khi rasterize (để chia pixel → scene units). */
  scale: number;
  /** Toạ độ scene gốc cho page đầu tiên. Bỏ qua → giữa viewport. */
  origin?: { x: number; y: number };
}

export interface InsertRasterizedPagesResult {
  insertedElementIds: string[];
  fileIds: string[];
}

/**
 * Chèn array `RasterizedPage` đã có sẵn vào scene. Tách ra để Whiteboard
 * có thể: load doc → hỏi user range → rasterize → insert mà không phải gọi
 * insertPdfPages (load lại từ ArrayBuffer 2 lần).
 */
export function insertRasterizedPagesIntoScene(
  api: ExApi,
  rendered: RasterizedPage[],
  options: InsertRasterizedPagesOptions,
): InsertRasterizedPagesResult {
  if (!api) throw new Error('Excalidraw API chưa sẵn sàng.');
  if (rendered.length === 0) return { insertedElementIds: [], fileIds: [] };

  const { scale } = options;
  const filesPayload = rendered.map((p) => ({
    id: generateFileId(),
    dataURL: p.dataURL,
    mimeType: p.mimeType,
    created: Date.now(),
  }));
  api.addFiles(filesPayload);

  const origin = options.origin ?? getViewportCenter(api);
  const sceneSizes = rendered.map((p) => pixelsToSceneSize(p.width, p.height, scale));
  const maxSceneWidth = Math.max(...sceneSizes.map((s) => s.width));
  const baseX = origin.x - maxSceneWidth / 2;
  let cursorY = origin.y - sceneSizes[0].height / 2;

  const newElements = rendered.map((_, i) => {
    const { width, height } = sceneSizes[i];
    const x = baseX + (maxSceneWidth - width) / 2;
    const y = cursorY;
    cursorY = y + height + PAGE_GAP;
    return buildPdfImageElement(filesPayload[i].id, x, y, width, height);
  });

  const existing = api.getSceneElements() as readonly ExcalidrawElement[];
  api.updateScene({
    elements: [...existing, ...newElements],
    appState: { selectedElementIds: {}, croppingElementId: null },
  });

  return {
    insertedElementIds: newElements.map((e) => e.id),
    fileIds: filesPayload.map((f) => f.id),
  };
}

/**
 * Excalidraw lưu width/height theo "scene units". File PDF rasterize ở scale 2
 * → pixel = 2 × scene unit. Chia lại để stamp hiển thị đúng kích thước
 * gốc của trang PDF (giấy A4 ≈ 595×842 scene units ở 72 DPI).
 */
function pixelsToSceneSize(pxWidth: number, pxHeight: number, scale: number) {
  return { width: pxWidth / scale, height: pxHeight / scale };
}

export interface InsertPdfPagesOptions {
  /** Trang cần chèn (1-based). Bỏ qua → chèn tất cả. */
  pages?: number[];
  /** Scale rasterize. Mặc định 2. */
  scale?: number;
  /** Toạ độ scene gốc cho page đầu tiên. Bỏ qua → giữa viewport. */
  origin?: { x: number; y: number };
  /** Progress callback. */
  onProgress?: (done: number, total: number) => void;
  /** AbortSignal. */
  signal?: AbortSignal;
}

export interface InsertPdfPagesResult {
  insertedElementIds: string[];
  pages: RasterizedPage[];
}

/**
 * Tạo image element cho 1 trang đã rasterize. Trả về object đủ field cho
 * Excalidraw `updateScene`. Lấy `fileId` từ caller để có thể batch addFiles
 * trước khi update elements.
 */
function buildPdfImageElement(
  fileId: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return {
    type: 'image' as const,
    id: 'pdf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    x,
    y,
    width,
    height,
    fileId,
    angle: 0,
    strokeColor: 'transparent',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: Math.floor(Math.random() * 1e9),
    versionNonce: 0,
    version: 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    status: 'saved',
    scale: [1, 1],
  };
}

function generateFileId(): string {
  return 'pdf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

function getViewportCenter(api: ExApi): { x: number; y: number } {
  const appState = api?.getAppState?.() ?? {
    scrollX: 0,
    scrollY: 0,
    width: 800,
    height: 600,
    zoom: { value: 1 },
  };
  const zoom = appState.zoom?.value ?? 1;
  return {
    x: appState.scrollX + (appState.width ?? 800) / 2 / zoom,
    y: appState.scrollY + (appState.height ?? 600) / 2 / zoom,
  };
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
export async function insertPdfPages(
  api: ExApi,
  source: File | Blob | ArrayBuffer,
  options: InsertPdfPagesOptions = {},
): Promise<InsertPdfPagesResult> {
  if (!api) throw new Error('Excalidraw API chưa sẵn sàng.');

  const scale = options.scale ?? DEFAULT_SCALE;
  const doc = await loadPdfDocument(source);
  let rendered: RasterizedPage[];
  try {
    rendered = await rasterizePdf(doc, {
      pages: options.pages,
      scale,
      onProgress: options.onProgress,
      signal: options.signal,
    });
  } finally {
    void closePdfDocument(doc);
  }

  const { insertedElementIds } = insertRasterizedPagesIntoScene(api, rendered, {
    scale,
    origin: options.origin,
  });
  return { insertedElementIds, pages: rendered };
}
