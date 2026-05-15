import { STROKE_PALETTE } from '../../stamps/shared/excalidrawPalette';

describe('STROKE_PALETTE', () => {
  it('có đúng 8 màu hex hợp lệ', () => {
    expect(STROKE_PALETTE).toHaveLength(8);
    for (const c of STROKE_PALETTE) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
  it('màu đầu là đen của Excalidraw', () => {
    expect(STROKE_PALETTE[0]).toBe('#1e1e1e');
  });
});
