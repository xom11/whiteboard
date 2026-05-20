// src/stamps/geometry-2d/editor/useToolStateMachine.ts
import { useCallback, useRef, useState } from 'react';
import type { GeomTool } from './tools';

export type ToolStateMachine = {
  tool: GeomTool;
  pendingIds: string[];
  toolRef: { readonly current: GeomTool };
  pendingIdsRef: { readonly current: string[] };
  setTool: (t: GeomTool) => void;
  pushPending: (id: string) => void;
  clearPending: () => void;
};

/**
 * Tool + pending ids state machine.
 * - Tool change (setTool) clears pending — chuyển tool đang xây thì huỷ build dở.
 * - Ref + state song song để handler stable-closure read được giá trị mới
 *   mà UI vẫn re-render khi giá trị đổi.
 */
export function useToolStateMachine(initial: GeomTool = 'move'): ToolStateMachine {
  const [tool, setToolState] = useState<GeomTool>(initial);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const toolRef = useRef<GeomTool>(initial);
  const pendingIdsRef = useRef<string[]>([]);

  const setTool = useCallback((t: GeomTool) => {
    toolRef.current = t;
    pendingIdsRef.current = [];
    setToolState(t);
    setPendingIds([]);
  }, []);

  const pushPending = useCallback((id: string) => {
    pendingIdsRef.current = [...pendingIdsRef.current, id];
    setPendingIds(pendingIdsRef.current);
  }, []);

  const clearPending = useCallback(() => {
    pendingIdsRef.current = [];
    setPendingIds([]);
  }, []);

  return { tool, pendingIds, toolRef, pendingIdsRef, setTool, pushPending, clearPending };
}
