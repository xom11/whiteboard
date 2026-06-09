import { svgIntrinsicSize, draftFromViewport, didStateChange } from '../draft';

describe('svgIntrinsicSize', () => {
  it('reads width/height attrs', () => {
    expect(svgIntrinsicSize('<svg width="120" height="80"></svg>')).toEqual({ width: 120, height: 80 });
  });
  it('falls back to viewBox when no width/height', () => {
    expect(svgIntrinsicSize('<svg viewBox="0 0 200 100"></svg>')).toEqual({ width: 200, height: 100 });
  });
  it('defaults to 300x200 when nothing parseable', () => {
    expect(svgIntrinsicSize('<svg></svg>')).toEqual({ width: 300, height: 200 });
  });
});

describe('draftFromViewport', () => {
  it('centers the figure in the viewport (board coords)', () => {
    const appState = { scrollX: 0, scrollY: 0, width: 800, height: 600, zoom: { value: 1 } };
    const d = draftFromViewport('<svg width="100" height="60"></svg>', appState, 7);
    expect(d).toMatchObject({ width: 100, height: 60, x: 350, y: 270, seq: 7 });
    expect(d.svg).toContain('<svg');
  });
  it('accounts for scroll + zoom', () => {
    const appState = { scrollX: 100, scrollY: 50, width: 800, height: 600, zoom: { value: 2 } };
    const d = draftFromViewport('<svg width="100" height="60"></svg>', appState, 1);
    expect(d).toMatchObject({ x: 250, y: 170 });
  });
});

describe('didStateChange', () => {
  it('true on first call', () => {
    const seen = { last: null as string | null };
    expect(didStateChange(seen, 'A')).toBe(true);
  });
  it('false when identical to last', () => {
    const seen = { last: 'A' as string | null };
    expect(didStateChange(seen, 'A')).toBe(false);
  });
  it('true when changed', () => {
    const seen = { last: 'A' as string | null };
    expect(didStateChange(seen, 'B')).toBe(true);
  });
});
