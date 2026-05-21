/**
 * @jest-environment jsdom
 */
import { renderJsxgOffscreen } from '../jxgOffscreenRender';

// Mock jsxgraph: stub initBoard to inject an <svg> into the container div so
// renderJsxgOffscreen can clone+serialize it. freeBoard is a no-op spy.
jest.mock('jsxgraph', () => {
  const freeBoard = jest.fn();
  const initBoard = jest.fn((containerId: string) => {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('container missing');
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '100');
    svg.setAttribute('height', '50');
    container.appendChild(svg);
    return { update: jest.fn(), __board: true };
  });
  return {
    __esModule: true,
    default: {
      JSXGraph: { initBoard, freeBoard },
      Options: {},
    },
  };
});

describe('renderJsxgOffscreen', () => {
  afterEach(() => {
    // Ensure no leaked offscreen containers
    document.querySelectorAll('[id^="jxg_offscreen_"]').forEach((el) => el.remove());
  });

  it('returns serialized SVG with xmlns and width/height from dims', async () => {
    const disposeSpy = jest.fn();
    const result = await renderJsxgOffscreen({
      bbox: [-10, 10, 10, -10],
      dims: { width: 400, height: 300 },
      setup: () => ({ dispose: disposeSpy }),
    });
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
    expect(result.svgString).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it('removes offscreen container after render (success path)', async () => {
    await renderJsxgOffscreen({
      bbox: [-10, 10, 10, -10],
      dims: { width: 200, height: 200 },
      setup: () => ({ dispose: () => undefined }),
    });
    expect(document.querySelectorAll('[id^="jxg_offscreen_"]').length).toBe(0);
  });

  it('removes offscreen container even when setup throws', async () => {
    await expect(
      renderJsxgOffscreen({
        bbox: [-10, 10, 10, -10],
        dims: { width: 200, height: 200 },
        setup: () => {
          throw new Error('boom');
        },
      }),
    ).rejects.toThrow('boom');
    expect(document.querySelectorAll('[id^="jxg_offscreen_"]').length).toBe(0);
  });

  it('runs applyOptions before initBoard', async () => {
    const calls: string[] = [];
    await renderJsxgOffscreen({
      bbox: [-10, 10, 10, -10],
      dims: { width: 200, height: 200 },
      applyOptions: () => calls.push('apply'),
      setup: () => {
        calls.push('setup');
        return { dispose: () => undefined };
      },
    });
    expect(calls).toEqual(['apply', 'setup']);
  });

  it('runs postProcessSvg on the cloned SVG before serialization', async () => {
    const result = await renderJsxgOffscreen({
      bbox: [-10, 10, 10, -10],
      dims: { width: 200, height: 200 },
      setup: () => ({ dispose: () => undefined }),
      postProcessSvg: (clone) => {
        clone.setAttribute('data-stamp', 'test');
        clone.setAttribute('width', '999');
      },
    });
    expect(result.svgString).toContain('data-stamp="test"');
    expect(result.svgString).toContain('width="999"');
  });
});
