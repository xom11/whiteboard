'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { State } from '../../../core/scene';
import type { GenerateGeometryFigure } from '../../shared/types';
import { useAiFigure } from './useAiFigure';

interface Props {
  generator: GenerateGeometryFigure;
  onGenerated: (state: State) => void;
  /**
   * Current editor state. Khi non-empty + no unsupported entity → mode='refine'
   * mặc định. User toggle "Dựng mới" sẽ confirm trước khi thay state.
   */
  currentState?: State | null;
}

const BUILD_EXAMPLES = [
  'Tam giác ABC, dựng trung điểm M của BC',
  'Tam giác ABC vuông tại A, AH là đường cao xuống BC',
  'Hình thoi ABCD, hai đường chéo cắt nhau tại O',
  'Từ điểm M ngoài đường tròn (O), kẻ hai tiếp tuyến',
];

const REFINE_EXAMPLES = [
  'Thêm trung điểm M của BC',
  'Dựng đường cao AH xuống BC',
  'Vẽ đường tròn ngoại tiếp',
  'Thêm tiếp tuyến tại A',
];

export function AiFigurePrompt({ generator, onGenerated, currentState }: Props) {
  const {
    prompt,
    setPrompt,
    isLoading,
    error,
    submit,
    cancel,
    tokens,
    mode,
    setMode,
    entityCount,
    hasUnsupported,
  } = useAiFigure(generator, { currentState });

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isLoading) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isLoading]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const generated = await submit();
      if (generated) onGenerated(generated);
    },
    [onGenerated, submit],
  );

  const handleSwitchToBuild = useCallback(() => {
    if (currentState && currentState.order.length > 0) {
      const ok = window.confirm(
        'Dựng mới sẽ thay toàn bộ hình hiện tại bằng hình mới từ AI. Tiếp tục?',
      );
      if (!ok) return;
    }
    setMode('build');
  }, [currentState, setMode]);

  const primaryLabel = isLoading
    ? tokens > 0
      ? `Đang dựng ${tokens}tok / ${elapsed}s — Huỷ`
      : `Đang dựng... ${elapsed}s — Huỷ`
    : 'Dựng bằng AI';

  const hasContent = currentState != null && currentState.order.length > 0;
  const examples = mode === 'refine' ? REFINE_EXAMPLES : BUILD_EXAMPLES;
  const refineChipLabel =
    entityCount.points + entityCount.shapes > 0
      ? `Thêm vào · ${entityCount.points}đ, ${entityCount.shapes}đoạn`
      : 'Thêm vào';

  return (
    <form
      data-testid="geometry-ai-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="border-b border-slate-200 bg-slate-50 px-3 py-2"
    >
      <label
        htmlFor="geometry-ai-prompt"
        className="mb-1 block text-xs font-medium text-slate-600"
      >
        Dựng hình bằng AI
      </label>

      {hasContent && (
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            data-testid="geometry-ai-mode-refine"
            onClick={() => setMode('refine')}
            disabled={isLoading || hasUnsupported}
            className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
              mode === 'refine'
                ? 'border-emerald-600 bg-emerald-100 text-emerald-800'
                : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400'
            } ${hasUnsupported ? 'cursor-not-allowed opacity-50' : ''}`}
            title={
              hasUnsupported
                ? 'Hình hiện tại có đối tượng ngoài DSL — chỉ dựng mới được'
                : refineChipLabel
            }
          >
            {refineChipLabel}
          </button>
          <button
            type="button"
            data-testid="geometry-ai-mode-build"
            onClick={handleSwitchToBuild}
            disabled={isLoading}
            className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
              mode === 'build'
                ? 'border-emerald-600 bg-emerald-100 text-emerald-800'
                : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400'
            }`}
          >
            Dựng mới
          </button>
          {hasUnsupported && (
            <span
              className="text-[10px] text-amber-700"
              data-testid="geometry-ai-unsupported-warning"
            >
              Hình có đối tượng ngoài DSL
            </span>
          )}
        </div>
      )}

      <div className="flex items-start gap-2">
        <textarea
          id="geometry-ai-prompt"
          aria-label="Đề bài cho AI"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={isLoading}
          rows={2}
          placeholder={
            mode === 'refine'
              ? 'Ví dụ: thêm trung điểm M của BC'
              : 'Ví dụ: Cho tam giác ABC, dựng đường cao AH.'
          }
          className="min-h-12 flex-1 resize-none rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 disabled:opacity-60"
        />
        {isLoading ? (
          <button
            type="button"
            onClick={cancel}
            className="rounded bg-amber-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-amber-700"
          >
            {primaryLabel}
          </button>
        ) : (
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="rounded bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {primaryLabel}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}

      {!isLoading && !prompt.trim() && !error && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-slate-500">Gợi ý:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
