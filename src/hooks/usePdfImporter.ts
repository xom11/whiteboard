import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  loadPdfDocument,
  closePdfDocument,
  rasterizePdf,
} from '../pdf/rasterize';
import { insertRasterizedPagesIntoScene } from '../pdf/insertPdfPages';

// Excalidraw imperative API — không có public type chính xác.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExApi = any;

export interface PdfPendingState {
  doc: PDFDocumentProxy;
  fileName: string;
  totalPages: number;
}

export interface UsePdfImporterOptions {
  readOnly: boolean;
  api: ExApi | null;
}

export interface UsePdfImporterResult {
  pdfPending: PdfPendingState | null;
  pdfBusy: boolean;
  handlePdfPick: (file: File) => Promise<void>;
  handlePdfConfirm: (pages: number[]) => Promise<void>;
  handlePdfCancel: () => void;
}

export function usePdfImporter(opts: UsePdfImporterOptions): UsePdfImporterResult {
  const { readOnly, api } = opts;
  const [pdfPending, setPdfPending] = useState<PdfPendingState | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const handlePdfPick = useCallback(
    async (file: File) => {
      if (readOnly || pdfBusy) return;
      setPdfBusy(true);
      try {
        const doc = await loadPdfDocument(file);
        setPdfPending({ doc, fileName: file.name, totalPages: doc.numPages });
      } catch (err) {
        console.warn('[whiteboard] Đọc PDF thất bại:', err);
        window.alert('Không đọc được PDF. File có thể đã hỏng hoặc bị mật khẩu bảo vệ.');
      } finally {
        setPdfBusy(false);
      }
    },
    [readOnly, pdfBusy],
  );

  const handlePdfPickRef = useRef(handlePdfPick);
  useLayoutEffect(() => {
    handlePdfPickRef.current = handlePdfPick;
  });

  const handlePdfConfirm = useCallback(
    async (pages: number[]) => {
      if (!pdfPending || !api) return;
      const { doc } = pdfPending;
      setPdfPending(null);
      setPdfBusy(true);
      const scale = 2;
      try {
        const rendered = await rasterizePdf(doc, { pages, scale });
        await closePdfDocument(doc);
        insertRasterizedPagesIntoScene(api, rendered, { scale });
      } catch (err) {
        console.warn('[whiteboard] Chèn PDF thất bại:', err);
        window.alert('Chèn PDF thất bại. Xem console để biết chi tiết.');
      } finally {
        setPdfBusy(false);
      }
    },
    [pdfPending, api],
  );

  const handlePdfCancel = useCallback(() => {
    if (pdfPending) {
      void closePdfDocument(pdfPending.doc);
    }
    setPdfPending(null);
  }, [pdfPending]);

  // Drop handler: catch application/pdf trước Excalidraw (nó reject PDF).
  useEffect(() => {
    if (readOnly) return;
    const root = document.querySelector<HTMLElement>('.excalidraw');
    if (!root) return;

    const onDragOver = (e: DragEvent) => {
      const items = e.dataTransfer?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type === 'application/pdf') {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
          return;
        }
      }
    };

    const onDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const pdf = Array.from(files).find((f) => f.type === 'application/pdf');
      if (!pdf) return;
      e.preventDefault();
      e.stopPropagation();
      void handlePdfPickRef.current(pdf);
    };

    root.addEventListener('dragover', onDragOver, { capture: true });
    root.addEventListener('drop', onDrop, { capture: true });
    return () => {
      root.removeEventListener('dragover', onDragOver, { capture: true });
      root.removeEventListener('drop', onDrop, { capture: true });
    };
  }, [readOnly, api]);

  return { pdfPending, pdfBusy, handlePdfPick, handlePdfConfirm, handlePdfCancel };
}
