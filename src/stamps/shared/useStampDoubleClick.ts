import { useCallback, useRef } from 'react';
import { findStampForCustomData } from './registry';
import type { StampType } from './types';

const DOUBLE_CLICK_MS = 400;

interface Opts {
  enabled: boolean;
  stamps: ReadonlyArray<StampType>;
  onOpen: (
    kind: string,
    editingElement: { id: string; customData: unknown },
  ) => void;
}

/**
 * Trả về handler cho Excalidraw `onPointerDown`. Phát hiện double-click vào
 * image element thuộc một stamp đã đăng ký → gọi `onOpen(kind, element)`.
 */
export function useStampDoubleClick({ enabled, stamps, onOpen }: Opts) {
  const lastClickRef = useRef<{ time: number; elementId: string | null }>({
    time: 0,
    elementId: null,
  });

  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_activeTool: any, pointerDownState: any) => {
      if (!enabled) return;
      const hitElement = pointerDownState?.hit?.element;
      if (!hitElement || hitElement.type !== 'image') return;
      const stamp = findStampForCustomData(hitElement.customData, stamps);
      if (!stamp) return;
      const now = Date.now();
      const isDouble =
        lastClickRef.current.elementId === hitElement.id &&
        now - lastClickRef.current.time < DOUBLE_CLICK_MS;
      lastClickRef.current = { time: now, elementId: hitElement.id };
      if (!isDouble) return;
      onOpen(stamp.kind, {
        id: hitElement.id,
        customData: hitElement.customData,
      });
    },
    [enabled, stamps, onOpen],
  );
}
