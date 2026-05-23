import { svgToStampFile, createStampFile } from '../svgToStampFile';

describe('svgToStampFile', () => {
  test('returns SVG dataURL with svg+xml mime, fileId passed through', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect/></svg>';
    const result = svgToStampFile(svg, 'file-abc');
    expect(result.fileId).toBe('file-abc');
    expect(result.mimeType).toBe('image/svg+xml');
    expect(result.dataURL.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(result.width).toBe(200);
    expect(result.height).toBe(120);
  });

  test('falls back to viewBox when width/height attrs missing', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150"><circle/></svg>';
    const result = svgToStampFile(svg, 'file-1');
    expect(result.width).toBe(300);
    expect(result.height).toBe(150);
  });

  test('falls back to defaults when both width/height and viewBox are missing', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>';
    const result = svgToStampFile(svg, 'file-2');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  test('parses fractional width/height (rounds to integer)', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="199.6" height="120.4"/>';
    const result = svgToStampFile(svg, 'file-3');
    expect(result.width).toBe(200);
    expect(result.height).toBe(120);
  });

  test('handles non-Latin1 chars (Vietnamese, math symbols) in SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="20"><text>Đoạn ∫ ∑</text></svg>';
    const result = svgToStampFile(svg, 'file-utf8');
    expect(result.dataURL.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const base64 = result.dataURL.replace('data:image/svg+xml;base64,', '');
    const roundtrip = Buffer.from(base64, 'base64').toString('utf-8');
    expect(roundtrip).toContain('Đoạn');
    expect(roundtrip).toContain('∫');
    expect(roundtrip).toContain('∑');
  });

  test('decoded base64 equals original SVG bytes (no corruption)', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text>x²+y²=r²</text></svg>';
    const result = svgToStampFile(svg, 'file-bytes');
    const base64 = result.dataURL.replace('data:image/svg+xml;base64,', '');
    const roundtrip = Buffer.from(base64, 'base64').toString('utf-8');
    expect(roundtrip).toBe(svg);
  });

  test('uses Buffer fallback when btoa is undefined (Node-only path)', () => {
    const originalBtoa = (globalThis as { btoa?: (s: string) => string }).btoa;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).btoa;
    try {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="20"><text>Đoạn ∫</text></svg>';
      const result = svgToStampFile(svg, 'file-node');
      expect(result.dataURL.startsWith('data:image/svg+xml;base64,')).toBe(true);
      const base64 = result.dataURL.replace('data:image/svg+xml;base64,', '');
      const roundtrip = Buffer.from(base64, 'base64').toString('utf-8');
      expect(roundtrip).toBe(svg);
    } finally {
      if (originalBtoa) (globalThis as { btoa?: (s: string) => string }).btoa = originalBtoa;
    }
  });

  test('mimeType is literal "image/svg+xml" (compile-time guarantee)', () => {
    const result = svgToStampFile('<svg width="10" height="10"/>', 'file-mime');
    const mime: 'image/svg+xml' = result.mimeType;
    expect(mime).toBe('image/svg+xml');
  });
});

describe('createStampFile (async — hash SVG → fileId)', () => {
  test('generates fileId from SVG content', async () => {
    const svg = '<svg width="100" height="50"/>';
    const result = await createStampFile(svg);
    expect(result.fileId.length).toBeGreaterThan(8);
    expect(result.dataURL.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  test('identical SVG → identical fileId (deterministic for dedupe)', async () => {
    const a = await createStampFile('<svg width="10" height="10"/>');
    const b = await createStampFile('<svg width="10" height="10"/>');
    expect(a.fileId).toBe(b.fileId);
  });

  test('different SVG → different fileId', async () => {
    const a = await createStampFile('<svg width="10" height="10"/>');
    const b = await createStampFile('<svg width="20" height="20"/>');
    expect(a.fileId).not.toBe(b.fileId);
  });
});
