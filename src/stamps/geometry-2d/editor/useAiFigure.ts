'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { State } from '../../../core/scene';
import type { GenerateGeometryFigure } from '../../shared/types';
import { serializeState } from '../dsl/serialize';

export type AiFigureMode = 'build' | 'refine';

export interface UseAiFigureResult {
  prompt: string;
  setPrompt: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  submit: () => Promise<State | null>;
  cancel: () => void;
  tokens: number;
  mode: AiFigureMode;
  setMode: (mode: AiFigureMode) => void;
  entityCount: { points: number; shapes: number };
  hasUnsupported: boolean;
}

export interface UseAiFigureOptions {
  currentState?: State | null;
}

export function useAiFigure(
  generator?: GenerateGeometryFigure,
  options: UseAiFigureOptions = {},
): UseAiFigureResult {
  const { currentState } = options;
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const { dsl: currentDsl, unsupported, entityCount, hasContent } = useMemo(() => {
    if (!currentState || currentState.order.length === 0) {
      return {
        dsl: null,
        unsupported: [],
        entityCount: { points: 0, shapes: 0 },
        hasContent: false,
      };
    }
    const { dsl, unsupported } = serializeState(currentState);
    return {
      dsl,
      unsupported,
      entityCount: { points: dsl.points.length, shapes: dsl.shapes.length },
      hasContent: true,
    };
  }, [currentState]);

  const hasUnsupported = unsupported.length > 0;

  const initialMode: AiFigureMode = hasContent && !hasUnsupported ? 'refine' : 'build';
  const [mode, setModeInternal] = useState<AiFigureMode>(initialMode);

  useEffect(() => {
    if (!hasContent && mode === 'refine') setModeInternal('build');
    if (hasUnsupported && mode === 'refine') setModeInternal('build');
  }, [hasContent, hasUnsupported, mode]);

  const setMode = useCallback((next: AiFigureMode) => {
    setModeInternal(next);
  }, []);

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
        ...(mode === 'refine' && currentDsl ? { currentDsl } : {}),
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
  }, [generator, prompt, mode, currentDsl]);

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
    mode,
    setMode,
    entityCount,
    hasUnsupported,
  };
}
