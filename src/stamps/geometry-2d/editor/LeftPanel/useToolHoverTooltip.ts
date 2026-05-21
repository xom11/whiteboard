// src/stamps/geometry-2d/editor/LeftPanel/useToolHoverTooltip.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToolDef } from '../MiniBoard';
import { TOOLTIP_DELAY_MS, type HoverState } from './types';

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

  const showHover = useCallback((el: HTMLElement, t: ToolDef) => {
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
