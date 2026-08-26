'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import './toolbarDragger.css';
import {
  clampFloat,
  resolveDrop,
  type ToolbarPosition,
  type ToolbarSide,
} from './toolbarPosition';

export interface ToolbarDraggerProps {
  /** Tắt khi readOnly hoặc mobile — không mount portal, dọn sạch DOM. */
  enabled: boolean;
  position: ToolbarPosition;
  onChange: (next: ToolbarPosition) => void;
  /** Wrapper ngoài cùng của Whiteboard — nơi đặt `data-*` và CSS var. */
  containerRef: RefObject<HTMLElement | null>;
}

const WRAPPER_CLASS = 'wb-toolbar-drag-mount';
/**
 * Island của thanh công cụ chính (Excalidraw 0.18). Đo bằng Playwright
 * trên DOM thật: `.App-toolbar-container` KHÔNG phải Island, Island nằm
 * sâu hơn một tầng và mang cả hai class `Island` + `App-toolbar`.
 */
const ISLAND_SELECTOR = '.Island.App-toolbar';
/** Phần tử được di chuyển — xem ghi chú đầu `toolbarDragger.css`. */
const SECTION_SELECTOR = '.shapes-section';
/** Khung tham chiếu (containing block khi section thành absolute). */
const FRAME_SELECTOR = '.FixedSideContainer_side_top';

/** Thứ tự khi bấm Enter/Space để đổi vị trí bằng bàn phím. */
const DOCK_CYCLE: readonly ToolbarSide[] = ['top', 'left', 'bottom', 'right'];

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
}

/**
 * Kéo-thả thanh công cụ chính của Excalidraw, hít vào mép khi thả gần.
 *
 * Excalidraw 0.18 không có API nào cho việc này (`UIOptions` chỉ có
 * canvasActions/tools/dockedSidebarBreakpoint; upstream issue #7583 vẫn
 * mở), nên ta portal một tay cầm vào trong Island rồi định vị
 * `.shapes-section` bằng CSS — cùng pattern với `PropsPanelToggle`.
 *
 * Toàn bộ việc ghi vị trí đi qua CSS custom property trên wrapper của
 * MÌNH (`--wb-toolbar-x/y`), không sửa style trên node của Excalidraw:
 * node đó có thể bị React của Excalidraw dựng lại bất cứ lúc nào và sẽ
 * thổi bay inline style.
 */
export function ToolbarDragger({
  enabled,
  position,
  onChange,
  containerRef,
}: ToolbarDraggerProps) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const mountRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  // Giữ giá trị mới nhất cho handler ổn định (state đổi nhanh khi kéo).
  const positionRef = useRef(position);
  positionRef.current = position;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // --- Dò Island để portal tay cầm (toolbar remount theo tool đang chọn).
  useEffect(() => {
    const container = containerRef.current;

    const removeWrappers = () => {
      (container ?? document)
        .querySelectorAll('.' + WRAPPER_CLASS)
        .forEach((node) => node.remove());
    };

    if (!enabled || !container) {
      mountRef.current = null;
      setMount(null);
      removeWrappers();
      return;
    }

    let cancelled = false;
    let rafId: number | null = null;

    const apply = (next: HTMLElement | null) => {
      if (cancelled || mountRef.current === next) return;
      mountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setMount(next);
      });
    };

    const findIsland = () => {
      if (cancelled) return;
      const island = container.querySelector<HTMLElement>(ISLAND_SELECTOR);
      if (!island) {
        apply(null);
        return;
      }
      let wrapper = island.querySelector<HTMLDivElement>('.' + WRAPPER_CLASS);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = WRAPPER_CLASS;
        island.appendChild(wrapper);
      }
      apply(wrapper);
    };

    const observer = new MutationObserver(() => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        findIsland();
      });
    });

    findIsland();
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      observer.disconnect();
      removeWrappers();
    };
  }, [enabled, containerRef]);

  // --- Đồng bộ CSS var cho chế độ nổi + hướng mở của popover "More tools".
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (position.mode !== 'float') {
      delete container.dataset.wbToolbarVflip;
      return;
    }
    container.style.setProperty('--wb-toolbar-x', `${position.x}px`);
    container.style.setProperty('--wb-toolbar-y', `${position.y}px`);
    // Nổi ở nửa dưới thì popover phải mở NGƯỢC LÊN, nếu không nó rơi khỏi
    // màn và 4 nút stamp thành không bấm được.
    const frame = container.querySelector<HTMLElement>(FRAME_SELECTOR);
    const frameHeight = frame?.getBoundingClientRect().height ?? 0;
    if (frameHeight > 0 && position.y > frameHeight / 2) {
      container.dataset.wbToolbarVflip = 'up';
    } else {
      delete container.dataset.wbToolbarVflip;
    }
  }, [position, containerRef]);

  // --- Khung đổi kích thước → kẹp lại vị trí nổi cho khỏi lòi ra ngoài.
  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container || typeof ResizeObserver === 'undefined') return;

    const frame = container.querySelector<HTMLElement>(FRAME_SELECTOR);
    if (!frame) return;

    const observer = new ResizeObserver(() => {
      const pos = positionRef.current;
      if (pos.mode !== 'float') return;
      const section = container.querySelector<HTMLElement>(SECTION_SELECTOR);
      if (!section) return;
      const sRect = section.getBoundingClientRect();
      const fRect = frame.getBoundingClientRect();
      if (fRect.width <= 0 || fRect.height <= 0) return;
      const next = clampFloat(pos.x, pos.y, sRect, fRect);
      if (next.x !== pos.x || next.y !== pos.y) {
        onChangeRef.current({ mode: 'float', ...next });
      }
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [enabled, containerRef]);

  // --- Dọn `data-*` khi tắt/unmount.
  useEffect(() => {
    if (enabled) return;
    const container = containerRef.current;
    if (!container) return;
    delete container.dataset.wbToolbarDragging;
  }, [enabled, containerRef]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const container = containerRef.current;
      if (!container || e.button !== 0) return;
      const section = container.querySelector<HTMLElement>(SECTION_SELECTOR);
      const frame = container.querySelector<HTMLElement>(FRAME_SELECTOR);
      if (!section || !frame) return;

      // Excalidraw bắt pointer trên toàn canvas — phải chặn từ capture của
      // chính nút này, nếu không kéo tay cầm sẽ vẽ ra một nét bút.
      e.preventDefault();
      e.stopPropagation();

      const sRect = section.getBoundingClientRect();
      const fRect = frame.getBoundingClientRect();
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: sRect.left - fRect.left,
        originY: sRect.top - fRect.top,
        width: sRect.width,
        height: sRect.height,
        frameWidth: fRect.width,
        frameHeight: fRect.height,
      };

      e.currentTarget.setPointerCapture(e.pointerId);
      container.dataset.wbToolbarDragging = '1';
      // Ghim ngay toạ độ hiện tại để không nhảy một nhịp khi CSS đổi sang
      // chế độ kéo (đang dock thì left/top do CSS quyết, nay do var).
      container.style.setProperty('--wb-toolbar-x', `${dragRef.current.originX}px`);
      container.style.setProperty('--wb-toolbar-y', `${dragRef.current.originY}px`);
    },
    [containerRef],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container || drag.pointerId !== e.pointerId) return;
      const { x, y } = clampFloat(
        drag.originX + (e.clientX - drag.startX),
        drag.originY + (e.clientY - drag.startY),
        drag,
        { width: drag.frameWidth, height: drag.frameHeight },
      );
      container.style.setProperty('--wb-toolbar-x', `${x}px`);
      container.style.setProperty('--wb-toolbar-y', `${y}px`);
    },
    [containerRef],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, commit: boolean) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container || drag.pointerId !== e.pointerId) return;
      dragRef.current = null;
      delete container.dataset.wbToolbarDragging;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (!commit) return;

      const { x, y } = clampFloat(
        drag.originX + (e.clientX - drag.startX),
        drag.originY + (e.clientY - drag.startY),
        drag,
        { width: drag.frameWidth, height: drag.frameHeight },
      );
      onChangeRef.current(
        resolveDrop(
          { x, y, width: drag.width, height: drag.height },
          { width: drag.frameWidth, height: drag.frameHeight },
        ),
      );
    },
    [containerRef],
  );

  // Bàn phím: Enter/Space đảo vòng 4 mép, để tay cầm không thành control
  // chết với người không dùng chuột.
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();
      const pos = positionRef.current;
      const current = pos.mode === 'dock' ? DOCK_CYCLE.indexOf(pos.side) : -1;
      const next = DOCK_CYCLE[(current + 1) % DOCK_CYCLE.length];
      onChangeRef.current({ mode: 'dock', side: next });
    },
    [],
  );

  if (!enabled || !mount) return null;

  return createPortal(
    <button
      type="button"
      className="wb-toolbar-drag-handle"
      data-testid="toolbar-drag-handle"
      aria-label="Kéo để đổi vị trí thanh công cụ"
      title="Kéo để đổi vị trí thanh công cụ (Enter: đảo mép)"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => endDrag(e, true)}
      onPointerCancel={(e) => endDrag(e, false)}
      onKeyDown={handleKeyDown}
    >
      <GripIcon />
    </button>,
    mount,
  );
}

function GripIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
      {[3, 8, 13].map((cy) => (
        <g key={cy} fill="currentColor">
          <circle cx="3" cy={cy} r="1.15" />
          <circle cx="7" cy={cy} r="1.15" />
        </g>
      ))}
    </svg>
  );
}
