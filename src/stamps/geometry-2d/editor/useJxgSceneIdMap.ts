import { useEffect, useRef } from 'react';
import type { Store } from '../../../core/scene/store';
import type { JxgRenderer } from '../../../core/scene/render/JxgRenderer';

 
type JxgObj = any;

interface Params {
  store: Store;
  rendererRef: { readonly current: JxgRenderer | null };
}

interface Result {
  /** Reverse map: JSXGraph internal id (string) → scene id. */
  jxgIdToSceneRef: { readonly current: Map<string, string> };
}

/**
 * Maintain a reverse lookup `JSXGraph internal id → scene id`, rebuilt every
 * time store dispatches. Cần thiết vì JSXGraph events nắm element ref nhưng
 * scene logic chỉ biết scene id; map này cho phép translate ngược.
 *
 * Renderer's `elements` map (scene-id → JxgObj) là source of truth — hook
 * subscribe store + rebuild map mỗi event.
 */
export function useJxgSceneIdMap({ store, rendererRef }: Params): Result {
  const jxgIdToSceneRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const rebuild = (): void => {
      const r = rendererRef.current;
      if (!r) return;
       
      const elements: Map<string, JxgObj> | undefined = (r as any).elements;
      const next = new Map<string, string>();
      if (elements) {
        for (const [sid, jxg] of elements) {
           
          const jid = (jxg as any)?.id;
          if (jid) next.set(String(jid), sid);
        }
      }
      jxgIdToSceneRef.current = next;
    };
    rebuild();
    return store.subscribe(() => rebuild());
  }, [store, rendererRef]);
  return { jxgIdToSceneRef };
}
