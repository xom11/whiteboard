import { useCallback, useRef, useState } from 'react';

export type ToolStateMachine<T extends string> = {
  tool: T;
  pendingIds: string[];
  toolRef: { readonly current: T };
  pendingIdsRef: { readonly current: string[] };
  setTool: (t: T) => void;
  pushPending: (id: string) => void;
  clearPending: () => void;
};

/**
 * Tool + pending ids state machine, generic theo tool union type.
 *
 * - `setTool` clears pending — chuyển tool đang xây thì huỷ build dở.
 * - Ref + state song song để handler stable-closure read được giá trị mới
 *   mà UI vẫn re-render khi giá trị đổi.
 *
 * Shared cho geometry-2d (`GeomTool`) và graph-2d (`GraphTool`); thêm consumer
 * mới chỉ cần pass union literal type.
 */
export function useToolStateMachine<T extends string>(initial: T): ToolStateMachine<T> {
  const [tool, setToolState] = useState<T>(initial);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const toolRef = useRef<T>(initial);
  const pendingIdsRef = useRef<string[]>([]);

  const setTool = useCallback((t: T) => {
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
