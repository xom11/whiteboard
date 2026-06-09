import { useEffect, useRef } from 'react';
import { serializeBoard } from '../serialize';
import { renderGeometrySvgFromState } from '../render';
import { draftFromViewport, didStateChange } from '../draft';
import type { Store, State } from '../../../core/scene';
import type { GeometryDraftPreview } from '../../shared/draftTypes';

interface UseGeometryDraftEmitArgs {
  store: Store;
  handleRef: React.MutableRefObject<{ getState: () => State; getBbox: () => [number, number, number, number] } | null>;
  api?: any;
  showAxis: boolean;
  showGrid: boolean;
  onGeometryDraft?: (draft: GeometryDraftPreview | null) => void;
  debounceMs?: number;
}

/**
 * Phát snapshot hình geometry đang dựng (debounced) cho consumer broadcast.
 * - Mỗi khi store đổi → debounce → render SVG + tính vị trí chèn → onGeometryDraft(draft).
 * - Store rỗng → onGeometryDraft(null) (clear ghost).
 * - Unmount (đóng editor / chèn xong) → onGeometryDraft(null).
 * Dedupe theo jsonState để không bắn khung trùng. seq tăng dần.
 */
export function useGeometryDraftEmit({
  store,
  handleRef,
  api,
  showAxis,
  showGrid,
  onGeometryDraft,
  debounceMs = 350,
}: UseGeometryDraftEmitArgs): void {
  const seqRef = useRef(0);
  const seenRef = useRef<{ last: string | null }>({ last: null });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef(onGeometryDraft);
  cbRef.current = onGeometryDraft;

  useEffect(() => {
    if (!cbRef.current) return;
    const emit = () => {
      const h = handleRef.current;
      if (!h) return;
      const state = h.getState();
      if (Object.keys(state.objects).length === 0) {
        if (seenRef.current.last !== null) {
          seenRef.current.last = null;
          cbRef.current?.(null);
        }
        return;
      }
      const bbox = h.getBbox();
      const jsonState = serializeBoard(state, { bbox, showAxis, showGrid });
      if (!didStateChange(seenRef.current, jsonState)) return;
      void (async () => {
        try {
          const svg = await renderGeometrySvgFromState(jsonState);
          const appState =
            api?.getAppState?.() ?? { scrollX: 0, scrollY: 0, width: 800, height: 600, zoom: { value: 1 } };
          seqRef.current += 1;
          cbRef.current?.(draftFromViewport(svg, appState, seqRef.current));
        } catch (err) {
          console.warn('[geometry] draft render failed:', err);
        }
      })();
    };
    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(emit, debounceMs);
    };
    const unsub = store.subscribe(schedule);
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      cbRef.current?.(null); // clear ghost khi đóng editor / chèn xong (panel unmount)
    };
  }, [store, handleRef, api, showAxis, showGrid, debounceMs]);
}
