'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { State } from '../../../core/scene';
import type { GenerateGeometryFigure } from '../../shared/types';
import { useAiFigure } from './useAiFigure';

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

export function AiFigurePrompt({ generator, onGenerated }: Props) {
  const {
    prompt,
    setPrompt,
    isLoading,
    error,
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendClick = useCallback(async () => {
    const generated = await submit();
    if (generated) onGenerated(generated);
  }, [submit, onGenerated]);

  // ── derived ────────────────────────────────────────────
  const promptEmpty = !prompt.trim();
  const sendDisabled = promptEmpty || isLoading;

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
        className={
          'group relative flex flex-col rounded-2xl bg-white shadow-sm transition-all duration-150 ' +
          'ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-emerald-400/70 focus-within:shadow-md'
        }
      >
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
          placeholder="Mô tả đề bài cần dựng."
          className="block w-full resize-none rounded-2xl bg-transparent px-3.5 pt-2.5 pb-1 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-60 field-sizing-content max-h-44"
        />

        {/* Bottom action bar */}
        <div className="flex items-center justify-end gap-2 px-2 pb-2 pt-1">
          <div className="flex items-center gap-2">
            {/* Status text */}
            {isLoading && (
              <span className="font-mono text-[10px] tabular-nums text-slate-500">
                {tokens > 0
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
                aria-label="Dựng bằng AI"
                title="Dựng bằng AI (Ctrl/⌘+Enter)"
                data-testid="geometry-ai-submit"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:scale-105 hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:scale-100"
              >
                <ArrowUpIcon className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-1 px-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
