'use client';

import React, { useCallback } from 'react';
import type { State } from '../../../core/scene';
import type { GenerateGeometryFigure } from '../../shared/types';
import { useAiFigure } from './useAiFigure';

interface Props {
  generator: GenerateGeometryFigure;
  onGenerated: (state: State) => void;
}

export function AiFigurePrompt({ generator, onGenerated }: Props) {
  const {
    prompt,
    setPrompt,
    isLoading,
    error,
    submit,
  } = useAiFigure(generator);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const generated = await submit();
    if (generated) onGenerated(generated);
  }, [onGenerated, submit]);

  return (
    <form
      data-testid="geometry-ai-form"
      onSubmit={(event) => { void handleSubmit(event); }}
      className="border-b border-slate-200 bg-slate-50 px-3 py-2"
    >
      <label htmlFor="geometry-ai-prompt" className="mb-1 block text-xs font-medium text-slate-600">
        Dựng hình bằng AI
      </label>
      <div className="flex items-start gap-2">
        <textarea
          id="geometry-ai-prompt"
          aria-label="Đề bài cho AI"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={isLoading}
          rows={2}
          placeholder="Ví dụ: Cho tam giác ABC, dựng đường cao AH."
          className="min-h-12 flex-1 resize-none rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="rounded bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {isLoading ? 'Đang dựng...' : 'Dựng bằng AI'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </form>
  );
}
