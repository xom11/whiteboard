import { svgToImageElement } from '../../stamps/shared/svgToImage';

describe('svgToImageElement', () => {
  test('returns SVG dataURL + dimensions parsed from svg attributes', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect/></svg>';
    const result = await svgToImageElement(svg);
    expect(result.dataURL.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(result.mimeType).toBe('image/svg+xml');
    expect(result.width).toBe(200);
    expect(result.height).toBe(120);
    expect(typeof result.fileId).toBe('string');
    expect(result.fileId.length).toBeGreaterThan(8);
  });

  test('falls back to viewBox when width/height absent', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150"><circle/></svg>';
    const result = await svgToImageElement(svg);
    expect(result.width).toBe(300);
    expect(result.height).toBe(150);
  });

  test('identical SVG produces identical fileId (deterministic)', async () => {
    const a = await svgToImageElement('<svg id="x"/>');
    const b = await svgToImageElement('<svg id="x"/>');
    expect(a.fileId).toBe(b.fileId);
  });

  test('different SVG produces different fileId', async () => {
    const a = await svgToImageElement('<svg id="x"/>');
    const b = await svgToImageElement('<svg id="y"/>');
    expect(a.fileId).not.toBe(b.fileId);
  });

  test('handles non-Latin1 chars (Vietnamese, math symbols) in SVG', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="20"><text>Đoạn ∫</text></svg>';
    const result = await svgToImageElement(svg);
    expect(result.dataURL.startsWith('data:image/svg+xml;base64,')).toBe(true);
  });
});
