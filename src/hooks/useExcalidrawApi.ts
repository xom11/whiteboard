import { type MutableRefObject, useCallback, useRef, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExApi = any;

export interface UseExcalidrawApiOptions {
  onApi?: (api: ExApi) => void;
}

export interface UseExcalidrawApiResult {
  api: ExApi | null;
  apiRef: MutableRefObject<ExApi | null>;
  isDark: boolean;
  isDarkRef: MutableRefObject<boolean>;
  /** Gắn vào Excalidraw prop `excalidrawAPI`. Defer setState qua microtask
   *  để tránh React 19 "update from inside an update function" warning. */
  setApiFromExcalidraw: (api: ExApi) => void;
  /** Gọi từ onChange. Bail-out qua ref + defer setState. */
  syncThemeFromAppState: (appState: { theme?: string } | undefined) => void;
}

export function useExcalidrawApi(
  opts: UseExcalidrawApiOptions = {},
): UseExcalidrawApiResult {
  const { onApi } = opts;
  const [api, setApi] = useState<ExApi | null>(null);
  const apiRef = useRef<ExApi | null>(null);
  const [isDark, setIsDark] = useState(false);
  const isDarkRef = useRef(false);
  const onApiRef = useRef(onApi);
  onApiRef.current = onApi;

  const setApiFromExcalidraw = useCallback((a: ExApi) => {
    if (apiRef.current === a) return;
    apiRef.current = a;
    queueMicrotask(() => {
      setApi(a);
      onApiRef.current?.(a);
    });
  }, []);

  const syncThemeFromAppState = useCallback(
    (appState: { theme?: string } | undefined) => {
      const next = appState?.theme === 'dark';
      if (isDarkRef.current !== next) {
        isDarkRef.current = next;
        queueMicrotask(() => setIsDark(next));
      }
    },
    [],
  );

  return { api, apiRef, isDark, isDarkRef, setApiFromExcalidraw, syncThemeFromAppState };
}
