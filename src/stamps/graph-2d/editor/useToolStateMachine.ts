// src/stamps/graph-2d/editor/useToolStateMachine.ts
import { useCallback, useRef, useState } from 'react';
import type { GraphTool } from './tools';

export type ToolStateMachine = {
  tool: GraphTool;
  pendingIds: string[];
  toolRef: { readonly current: GraphTool };
  pendingIdsRef: { readonly current: string[] };
  setTool: (t: GraphTool) => void;
  pushPending: (id: string) => void;
  clearPending: () => void;
};

export function useToolStateMachine(initial: GraphTool = 'move'): ToolStateMachine {
  const [tool, setToolState] = useState<GraphTool>(initial);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const toolRef = useRef<GraphTool>(initial);
  const pendingIdsRef = useRef<string[]>([]);

  const setTool = useCallback((t: GraphTool) => {
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
