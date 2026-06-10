'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { State } from '../../../core/scene';
import type { GenerateGeometryFigure } from '../../shared/types';
import { useAiFigure } from './useAiFigure';
import { handleExtractProblem } from '../ai/handleExtractProblem';
import { fileToImagePart, validateFile } from '../ai/vision/preprocess';
import type { ImagePart } from '../ai/vision/types';

interface Props {
  generator: GenerateGeometryFigure;
  onGenerated: (state: State) => void;
}

const ArrowUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...props}
  >
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </svg>
);

const StopIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

// SVG icon giữ inline để khỏi tăng bundle deps; theo tone "math-instrument refined".
const PaperclipIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...props}
  >
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

export function AiFigurePrompt({ generator, onGenerated }: Props) {
  const {
    prompt,
    setPrompt,
    isLoading,
    error,
    notice,
    submit,
    cancel,
    tokens,
  } = useAiFigure(generator);

  // ── timer ──────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isLoading) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isLoading]);

  // ── partial-notice dismiss ─────────────────────────────
  // Thông báo to-do có thể dài → cho phép đóng hẳn (×). Reset mỗi khi có notice
  // MỚI (lần dựng sau) để không nuốt thông báo mới.
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  useEffect(() => {
    setNoticeDismissed(false);
  }, [notice]);

  // ── OCR state ──────────────────────────────────────────
  const [image, setImage] = useState<ImagePart | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const imagePreview = image
    ? `data:${image.mediaType};base64,${image.base64}`
    : null;

  useEffect(() => {
    setOcrError(null);
    setOcrWarning(null);
  }, [image]);

  const handleFile = useCallback(
    async (file: File) => {
      if (isLoading || ocrLoading) return;
      const v = validateFile(file);
      if (!v.ok) {
        setOcrError(v.message);
        return;
      }
      try {
        const part = await fileToImagePart(file);
        setImage(part);
      } catch (e) {
        setOcrError(e instanceof Error ? e.message : 'Không decode được ảnh');
      }
    },
    [isLoading, ocrLoading],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLElement>) => {
      const item = Array.from(e.clipboardData.items).find(
        (it) => it.kind === 'file' && it.type.startsWith('image/'),
      );
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      e.preventDefault();
      void handleFile(file);
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = Array.from(e.dataTransfer.files).find((f) =>
        f.type.startsWith('image/'),
      );
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const runOcr = useCallback(async () => {
    if (!image) return;
    setOcrLoading(true);
    setOcrError(null);
    setOcrWarning(null);
    try {
      // Self-contained: gọi thẳng OCR Tesseract của package (browser-safe, không LLM).
      const r = await handleExtractProblem(image);
      if (r.kind === 'success' || r.kind === 'low-confidence') {
        setPrompt(r.text);
        if (r.kind === 'low-confidence') setOcrWarning(r.warning);
        // Focus textarea sau OCR để user review/edit ngay.
        requestAnimationFrame(() => textareaRef.current?.focus());
      } else {
        setOcrError(r.message);
      }
    } finally {
      setOcrLoading(false);
    }
  }, [image, setPrompt]);

  const handleSendClick = useCallback(async () => {
    // Khi có ảnh + textarea rỗng → ưu tiên OCR trước (single-click flow).
    if (image && !prompt.trim() && !ocrLoading) {
      await runOcr();
      return;
    }
    const generated = await submit();
    if (generated) onGenerated(generated);
  }, [image, prompt, ocrLoading, runOcr, submit, onGenerated]);

  // ── derived ────────────────────────────────────────────
  const promptEmpty = !prompt.trim();
  const willOcr = image != null && promptEmpty;
  const sendDisabled =
    (!image && promptEmpty) || ocrLoading || (isLoading && !willOcr);

  const placeholder = willOcr
    ? 'Bấm gửi để đọc đề từ ảnh — hoặc tự gõ ở đây…'
    : 'Mô tả đề bài cần dựng — hoặc dán/đính ảnh đề (Ctrl+V).';

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-3 py-3">
      {/* Header label */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-slate-600">
          Dựng hình bằng AI
        </span>
      </div>

      {/* Composer */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={
          'group relative flex flex-col rounded-2xl bg-white shadow-sm transition-all duration-150 ' +
          'ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-emerald-400/70 focus-within:shadow-md ' +
          (isDragOver ? 'ring-2 ring-emerald-500 bg-emerald-50/40' : '')
        }
      >
        {/* Image chip */}
        {image && imagePreview && (
          <div className="flex flex-wrap gap-2 px-3 pt-2.5">
            <div className="group/chip relative">
              <img
                src={imagePreview}
                alt="Ảnh đề bài"
                className="max-h-48 max-w-full h-auto w-auto rounded-lg border border-slate-200 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setImage(null)}
                disabled={ocrLoading || isLoading}
                aria-label="Xoá ảnh"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/85 text-[11px] font-medium text-white shadow ring-2 ring-white transition hover:bg-slate-900 disabled:opacity-50"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          id="geometry-ai-prompt"
          aria-label="Đề bài cho AI"
          data-testid="geometry-ai-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !sendDisabled) {
              e.preventDefault();
              void handleSendClick();
            }
          }}
          disabled={isLoading}
          rows={2}
          placeholder={placeholder}
          className="block w-full resize-none rounded-2xl bg-transparent px-3.5 pt-2.5 pb-1 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-60 field-sizing-content max-h-44"
        />

        {/* Bottom action bar */}
        <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
          {/* Attach image */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || ocrLoading}
              aria-label="Đính ảnh đề bài"
              title="Đính ảnh (cũng có thể dán bằng Ctrl+V hoặc kéo thả)"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700 disabled:opacity-40"
            >
              <PaperclipIcon className="h-[18px] w-[18px]" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={handleFileInput}
              disabled={isLoading || ocrLoading}
              aria-label="Chọn ảnh đề bài"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Status text */}
            {(isLoading || ocrLoading) && (
              <span className="font-mono text-[10px] tabular-nums text-slate-500">
                {ocrLoading
                  ? 'đọc ảnh…'
                  : tokens > 0
                    ? `${tokens}tok · ${elapsed}s`
                    : `${elapsed}s`}
              </span>
            )}

            {/* Send / Stop button */}
            {isLoading ? (
              <button
                type="button"
                onClick={cancel}
                aria-label="Huỷ dựng hình AI"
                data-testid="geometry-ai-cancel"
                title={`Đang dựng… ${elapsed}s — bấm để huỷ`}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm transition hover:scale-105 hover:bg-amber-600 active:scale-95"
              >
                <StopIcon className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSendClick()}
                disabled={sendDisabled}
                aria-label={willOcr ? 'Đọc đề từ ảnh' : 'Dựng bằng AI'}
                title={willOcr ? 'Đọc đề từ ảnh (sẽ điền vào ô chat)' : 'Dựng bằng AI (Ctrl/⌘+Enter)'}
                data-testid={willOcr ? 'geometry-ai-ocr' : 'geometry-ai-submit'}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:scale-105 hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:scale-100"
              >
                <ArrowUpIcon className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        </div>

        {/* Drag overlay hint */}
        {isDragOver && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-emerald-50/60 text-xs font-medium text-emerald-700">
            Thả ảnh vào đây
          </div>
        )}
      </div>

      {ocrWarning && (
        <p
          className="mt-1 px-1 text-xs text-amber-700"
          data-testid="geometry-ai-ocr-warning"
        >
          {ocrWarning}
        </p>
      )}

      {ocrError && (
        <p role="alert" className="mt-1 px-1 text-xs text-red-600">
          {ocrError}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-1 px-1 text-xs text-red-600">
          {error}
        </p>
      )}

      {notice && !noticeDismissed && (
        <div
          role="status"
          data-testid="geometry-ai-partial-notice"
          className="relative mt-2 whitespace-pre-wrap rounded-lg border border-amber-200 bg-amber-50 py-2 pl-3 pr-8 text-xs leading-relaxed text-amber-800"
        >
          {notice}
          <button
            type="button"
            onClick={() => setNoticeDismissed(true)}
            aria-label="Đóng thông báo"
            title="Đóng thông báo"
            data-testid="geometry-ai-partial-dismiss"
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-amber-500 transition hover:bg-amber-100 hover:text-amber-800"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
