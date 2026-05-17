import { renderGraph2dSvgFromState } from '../render';
import { EMPTY_GRAPH, stringifySerializedGraph } from '../serialize';

describe('renderGraph2dSvgFromState', () => {
  it('trả SVG string non-empty cho EMPTY_GRAPH', async () => {
    const svg = await renderGraph2dSvgFromState(stringifySerializedGraph(EMPTY_GRAPH));
    expect(typeof svg).toBe('string');
    expect(svg).toMatch(/^<svg/);
  });

  it('render đồ thị y = x^2 chứa path', async () => {
    const state = stringifySerializedGraph({
      ...EMPTY_GRAPH,
      functions: [
        { id: 'f1', name: 'f', expression: 'x^2', color: '#2563eb', visible: true },
      ],
    });
    const svg = await renderGraph2dSvgFromState(state);
    expect(svg).toContain('path');
  });

  it('skip function visible=false', async () => {
    const state = stringifySerializedGraph({
      ...EMPTY_GRAPH,
      functions: [
        { id: 'f1', name: 'f', expression: 'x^2', color: '#ff0000', visible: false },
      ],
    });
    const svg = await renderGraph2dSvgFromState(state);
    expect(svg).not.toContain('#ff0000');
  });

  it('throw nếu jsonState corrupt', async () => {
    await expect(renderGraph2dSvgFromState('{bad')).rejects.toThrow();
  });
});
