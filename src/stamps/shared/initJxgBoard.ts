import { safeJsx } from './safeJsx';

/**
 * Toggles cho common JSXGraph options. Per-stamp callsite override mặc định
 * nếu cần preserve behavior cụ thể.
 *
 * Mặc định:
 * - text.display = 'internal' (true)        — bắt buộc cho clone-SVG export.
 * - text.useASCII/MathJax/Katex = false (true) — JSXGraph default rendering,
 *   không load extra text engine.
 * - label.display = 'internal' (true)       — point label vào trong SVG.
 * - elements.highlight = false (FALSE mặc định) — opt-in vì graph-2d cần
 *   JSXGraph's default hover-highlight để phân biệt object đang hover.
 */
export interface JxgInitDefaults {
  textDisplayInternal?: boolean;
  disableTextEngines?: boolean;
  labelDisplayInternal?: boolean;
  disableElementHighlight?: boolean;
}

export interface InitJxgBoardConfig {
  /** Per-MiniBoard toggle cho common defaults. */
  defaults?: JxgInitDefaults;
  /** Options pass thẳng vào `JXG.JSXGraph.initBoard(target, opts)`. */
  boardOptions: Record<string, unknown>;
  /**
   * Hook để tweak options sau khi defaults được apply. Dùng cho per-stamp
   * customization (vd themeLabel color cho 2D, axesPosition cho 3D view3d).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraOptionTweaks?: (opts: any) => void;
  /** Tag cho safeJsx log (vd "MiniBoard.2d"). Default: "JxgBoard". */
  label?: string;
}

export interface InitJxgBoardResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  JXG: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  board: any;
  /** Gọi để free JSXGraph board (safe-wrapped). */
  cleanup: () => void;
}

/**
 * Async dynamic-import JSXGraph + apply common options + initBoard + trả
 * cleanup. Centralize boilerplate shared bởi 3 MiniBoard (2D/3D/graph-2d).
 *
 * Caller vẫn handle cancellation flag, refs, và post-init setup (renderer,
 * view3d, axes, etc.) ngoài helper này.
 *
 * @throws Nếu JSXGraph load hoặc initBoard throw. Caller nên try/catch nếu
 * cần tolerate mock environments.
 */
export async function initJxgBoard(
  target: string | HTMLElement,
  config: InitJxgBoardConfig,
): Promise<InitJxgBoardResult> {
  const label = config.label ?? 'JxgBoard';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const JXG = (await import('jsxgraph')).default as any;
  const {
    textDisplayInternal = true,
    disableTextEngines = true,
    labelDisplayInternal = true,
    disableElementHighlight = false,
  } = config.defaults ?? {};
  safeJsx(`${label}.applyOptions`, () => {
    const opts = JXG.Options;
    if (!opts) return;
    if (textDisplayInternal || disableTextEngines) {
      opts.text = opts.text ?? {};
      if (textDisplayInternal) opts.text.display = 'internal';
      if (disableTextEngines) {
        opts.text.useASCIIMathML = false;
        opts.text.useMathJax = false;
        opts.text.useKatex = false;
      }
    }
    if (labelDisplayInternal) {
      opts.label = opts.label ?? {};
      opts.label.display = 'internal';
    }
    if (disableElementHighlight) {
      opts.elements = opts.elements ?? {};
      opts.elements.highlight = false;
    }
    config.extraOptionTweaks?.(opts);
  });
  const board = JXG.JSXGraph.initBoard(target, config.boardOptions);
  const cleanup = (): void => {
    safeJsx(`${label}.freeBoard`, () => JXG.JSXGraph.freeBoard(board));
  };
  return { JXG, board, cleanup };
}
