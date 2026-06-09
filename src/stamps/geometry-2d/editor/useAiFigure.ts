'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { State } from '../../../core/scene';
import type { GenerateGeometryFigure } from '../../shared/types';

export interface UseAiFigureResult {
  prompt: string;
  setPrompt: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  submit: () => Promise<State | null>;
  cancel: () => void;
  tokens: number;
}

export function useAiFigure(
  generator?: GenerateGeometryFigure,
): UseAiFigureResult {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  const submit = useCallback(async (): Promise<State | null> => {
    const problem = prompt.trim();
    if (!problem) {
      setError('Nhập đề bài cần dựng hình.');
      return null;
    }
    if (!generator) {
      setError('Tính năng dựng hình AI chưa được cấu hình.');
      return null;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);
    setTokens(0);

    try {
      const generated = await generator(problem, {
        signal: controller.signal,
        onProgress: (info) => {
          if (requestId === requestIdRef.current) setTokens(info.tokens);
        },
      });
      if (controller.signal.aborted || requestId !== requestIdRef.current) return null;
      if (!generated.ok) {
        setError(generated.message);
        return null;
      }
      return generated.state;
    } catch (caught) {
      if (
        controller.signal.aborted ||
        (caught instanceof DOMException && caught.name === 'AbortError')
      ) {
        return null;
      }
      if (requestId === requestIdRef.current) {
        setError(
          caught instanceof Error && caught.message
            ? caught.message
            : 'Không thể dựng hình bằng AI.',
        );
      }
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
  }, [generator, prompt]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    prompt,
    setPrompt,
    isLoading,
    error,
    submit,
    cancel,
    tokens,
  };
}
