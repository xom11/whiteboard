'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { State } from '../../../core/scene';
import type { GenerateGeometryFigure } from '../../shared/types';

export interface UseAiFigureResult {
  prompt: string;
  setPrompt: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  /**
   * Thông báo partial render (không phải lỗi): rule base đã dựng phần chắc chắn
   * đúng + to-do list cho user tự dựng nốt. Hiện song song với hình đã chèn.
   */
  notice: string | null;
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
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);
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
      // Partial render: hình đã dựng phần chắc chắn đúng + to-do cho user dựng nốt.
      if (generated.partial) setNotice(generated.partial.message);
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
    notice,
    submit,
    cancel,
    tokens,
  };
}
