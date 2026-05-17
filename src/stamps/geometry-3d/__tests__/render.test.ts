import { renderGeometry3DSvgFromState } from '../render';

const mockSvg = (() => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.innerHTML = '<g id="restored"/>';
  return svg;
})();

jest.mock('jsxgraph', () => ({
  __esModule: true,
  default: {
    Options: { text: { display: 'html' } },
    JSXGraph: {
      initBoard: jest.fn((div: HTMLDivElement) => {
        // Append the mock SVG so renderer can find it
        div.appendChild(mockSvg.cloneNode(true));
        return {
          renderer: { container: div },
          create: jest.fn((kind: string) => {
            if (kind === 'view3d') {
              return {
                create: jest.fn(() => ({ id: 'mock-obj' })),
                defaultAxes: [],
              };
            }
            return { id: 'mock-obj' };
          }),
        };
      }),
      freeBoard: jest.fn(),
    },
  },
}));

describe('renderGeometry3DSvgFromState', () => {
  it('throws on malformed JSON', async () => {
    await expect(renderGeometry3DSvgFromState('{not json')).rejects.toThrow();
  });

  it('throws on wrong version', async () => {
    await expect(
      renderGeometry3DSvgFromState('{"version":3,"elements":[]}'),
    ).rejects.toThrow(/version/);
  });

  it('returns SVG string with width/height for valid state', async () => {
    const state = {
      version: 1 as const,
      bbox: [-6, 6, 6, -6] as [number, number, number, number],
      view: {
        azimuth: 0.5,
        elevation: 0.3,
        bbox3D: [-3, -3, -3, 3, 3, 3] as [number, number, number, number, number, number],
      },
      showAxes: true,
      showMesh: false,
      elements: [
        {
          type: 'point3d' as const,
          parents: [0, 0, 0],
          attributes: { id: 'p1' },
          id: 'p1',
        },
      ],
    };
    const result = await renderGeometry3DSvgFromState(JSON.stringify(state));
    expect(typeof result.svgString).toBe('string');
    expect(result.svgString).toContain('svg');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });
});
