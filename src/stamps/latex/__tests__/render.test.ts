import { renderLatexToSvg } from '../render';

jest.mock('katex', () => ({
  __esModule: true,
  default: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderToString: (src: string, opts: any) => {
      if (src.includes('\\invalid')) {
        const err = new Error('ParseError');
        if (opts.throwOnError !== false) throw err;
      }
      return '<span class="katex">' + src + '</span>';
    },
  },
}));

describe('renderLatexToSvg', () => {
  test('renders valid LaTeX to SVG string with <svg> root', async () => {
    const svg = await renderLatexToSvg('a + b', false);
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('</svg>');
  });

  test('display mode produces non-empty output', async () => {
    const inline = await renderLatexToSvg('\\frac{1}{2}', false);
    const block = await renderLatexToSvg('\\frac{1}{2}', true);
    expect(inline.length).toBeGreaterThan(0);
    expect(block.length).toBeGreaterThan(0);
  });

  test('invalid LaTeX throws with message', async () => {
    await expect(renderLatexToSvg('\\invalid{', false)).rejects.toThrow();
  });
});
