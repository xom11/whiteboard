/**
 * PDF import module — không phải stamp, vì:
 *   - Không có editor panel (không double-click re-edit).
 *   - Không có customData (output là image element thuần).
 *   - Pdfjs-dist lazy-load chỉ khi user trigger.
 */

export { parsePageRange } from './parseRange';
export {
  configurePdfWorker,
  loadPdfDocument,
  closePdfDocument,
  rasterizePdf,
  type RasterizedPage,
  type RasterizeOptions,
} from './rasterize';
export {
  insertPdfPages,
  type InsertPdfPagesOptions,
  type InsertPdfPagesResult,
} from './insertPdfPages';
export { PageRangeDialog } from './PageRangeDialog';
export { PdfImporterButton } from './PdfImporterButton';
