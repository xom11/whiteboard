import { renderGeometryToSvg } from '../renderGeometryToSvg';

describe('renderGeometryToSvg', () => {
  test('returns standalone SVG string with xmlns', () => {
    const container = document.createElement('div');
    container.innerHTML = '<svg width="500" height="400" viewBox="0 0 500 400"><circle r="10"/></svg>';
    document.body.appendChild(container);

    const svg = renderGeometryToSvg(container);
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('viewBox');
    expect(svg).toContain('circle');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');

    document.body.removeChild(container);
  });

  test('throws when container has no SVG child', () => {
    const container = document.createElement('div');
    expect(() => renderGeometryToSvg(container)).toThrow(/no SVG/i);
  });
});
