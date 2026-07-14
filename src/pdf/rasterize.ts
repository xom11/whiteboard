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
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

let workerSrcOverride: string | null = null;
let pdfjsCache: typeof import('pdfjs-dist') | null = null;

/**
 * Override workerSrc trước khi rasterize. Gọi từ consumer khi cần self-host
 * worker file (vd offline mode, CSP cấm CDN).
 *
 * Mặc định nếu không gọi: dùng CDN jsdelivr theo version pdfjs-dist đã cài.
 */
export function configurePdfWorker(workerSrc: string): void {
  workerSrcOverride = workerSrc;
  if (pdfjsCache) {
    pdfjsCache.GlobalWorkerOptions.workerSrc = workerSrc;
  }
}

async function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (pdfjsCache) return pdfjsCache;
  const mod = await import('pdfjs-dist');
  const workerSrc =
    workerSrcOverride ??
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${mod.version}/build/pdf.worker.min.mjs`;
  mod.GlobalWorkerOptions.workerSrc = workerSrc;
  pdfjsCache = mod;
  return mod;
}

export interface RasterizedPage {
  pageNumber: number;
  dataURL: string;
  width: number;
  height: number;
  mimeType: 'image/jpeg';
}

/**
 * Chất lượng JPEG cho trang PDF full-scale. Trang PDF nền trắng đục (không cần
 * alpha) → JPEG 0.85 nhỏ hơn PNG ~3-6 lần mà chữ vẫn nét ở scale 2. Quan
 * trọng cho consumer lưu snapshot kèm files base64: 4 trang PNG ≈ 1.4MB đã
 * suýt chạm trần lưu trữ phía server (2MB) → save fail âm thầm → mất note.
 */
const PAGE_JPEG_QUALITY = 0.85;

export interface RasterizeOptions {
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
export async function loadPdfDocument(source: File | Blob | ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs();
  const data = source instanceof ArrayBuffer ? source : await source.arrayBuffer();
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  return task.promise;
}

export async function closePdfDocument(doc: PDFDocumentProxy): Promise<void> {
  try {
    await doc.cleanup();
    await doc.destroy();
  } catch {
    /* ignore — best-effort cleanup */
  }
}

/**
 * Render danh sách trang ra JPEG dataURL (nền trắng, quality 0.85).
 *
 * Lưu ý:
 *   - Sử dụng `OffscreenCanvas` nếu có (browser hiện đại) để không touch DOM,
 *     fallback `<canvas>` document.createElement.
 *   - Mỗi page render xong sẽ release canvas (cho GC sớm với PDF nhiều trang).
 */
export async function rasterizePdf(
  doc: PDFDocumentProxy,
  options: RasterizeOptions = {},
): Promise<RasterizedPage[]> {
  const scale = options.scale ?? 2;
  const total = doc.numPages;
  const pages = options.pages ?? Array.from({ length: total }, (_, i) => i + 1);
  const signal = options.signal;

  const result: RasterizedPage[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (signal?.aborted) {
      throw new DOMException('Rasterize PDF bị huỷ.', 'AbortError');
    }
    const pageNum = pages[i];
    const page = await doc.getPage(pageNum);
    try {
      const rendered = await renderPageToJpeg(page, scale);
      result.push({ pageNumber: pageNum, mimeType: 'image/jpeg', ...rendered });
    } finally {
      page.cleanup();
    }
    options.onProgress?.(i + 1, pages.length);
  }
  return result;
}

async function renderPageToJpeg(
  page: PDFPageProxy,
  scale: number,
): Promise<{ dataURL: string; width: number; height: number }> {
  const viewport = page.getViewport({ scale });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không lấy được 2D context của canvas.');
  // JPEG không có alpha — vùng canvas còn transparent sẽ thành ĐEN khi encode.
  // Fill trắng trước cho chắc (không phụ thuộc default background của pdf.js).
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataURL = canvas.toDataURL('image/jpeg', PAGE_JPEG_QUALITY);
  return { dataURL, width, height };
}

/**
 * Render thumbnail nhẹ cho 1 trang — JPEG 0.7 quality + scale nhỏ (mặc định
 * 0.3). Tối ưu cho preview grid: ~10KB/thumb thay vì ~500KB PNG full scale.
 */
export async function renderPageThumbnail(
  page: PDFPageProxy,
  scale = 0.3,
  quality = 0.7,
): Promise<{ dataURL: string; width: number; height: number }> {
  const viewport = page.getViewport({ scale });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không lấy được 2D context của canvas.');
  // Nền trắng vì JPEG không support alpha.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataURL = canvas.toDataURL('image/jpeg', quality);
  return { dataURL, width, height };
}

/**
 * Render thumbnails cho tất cả trang với concurrency. Callback `onEach` được
 * gọi sau mỗi trang xong (theo thứ tự completion, không phải pageNumber) để
 * UI có thể progressive update. Tôn trọng `signal` để cancel sớm.
 */
export async function renderAllThumbnails(
  doc: PDFDocumentProxy,
  onEach: (pageNumber: number, dataURL: string, width: number, height: number) => void,
  options: { scale?: number; quality?: number; concurrency?: number; signal?: AbortSignal } = {},
): Promise<void> {
  const total = doc.numPages;
  const scale = options.scale ?? 0.3;
  const quality = options.quality ?? 0.7;
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const signal = options.signal;
  let next = 1;

  async function worker() {
    while (true) {
      if (signal?.aborted) return;
      const pageNum = next++;
      if (pageNum > total) return;
      const page = await doc.getPage(pageNum);
      try {
        if (signal?.aborted) return;
        const { dataURL, width, height } = await renderPageThumbnail(page, scale, quality);
        if (signal?.aborted) return;
        onEach(pageNum, dataURL, width, height);
      } finally {
        page.cleanup();
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, () => worker()),
  );
}
