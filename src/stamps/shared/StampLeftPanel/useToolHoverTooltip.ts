// src/stamps/shared/StampLeftPanel/useToolHoverTooltip.ts
//
// Generic hover tooltip hook. Trả về { hover, portalReady, showHover, hideHover }
// để consumer render tooltip qua createPortal. Delay 400ms tránh flash.
//
// Generic theo StampToolDef → 3 stamp dùng chung. Moved từ
// geometry-2d/editor/LeftPanel/useToolHoverTooltip.ts (Phase 1.2).

import { useCallback, useEffect, useRef, useState } from 'react';
import { TOOLTIP_DELAY_MS, type HoverState, type StampToolDef } from './types';

export function useToolHoverTooltip() {
  const [hover, setHover] = useState<HoverState>(null);
  const [portalReady, setPortalReady] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPortalReady(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const showHover = useCallback((el: HTMLElement, t: StampToolDef) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setHover({ label: t.label, hint: t.hint, x: r.right, y: r.top + r.height / 2 });
    }, TOOLTIP_DELAY_MS);
  }, []);

  const hideHover = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHover(null);
  }, []);

  return { hover, portalReady, showHover, hideHover };
}
