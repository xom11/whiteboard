import { handleGenerateFigure3d } from '../handleGenerateFigure3d';

describe('handleGenerateFigure3d', () => {
  it('returns a renderable 3D state for a pyramid problem', () => {
    const r = handleGenerateFigure3d({
      problem: 'Cho hình chóp S.ABCD có đáy là hình vuông. Gọi M là trung điểm của SC.',
    });
    expect(r.ok).toBe(true);
    expect(r.state?.meta.domain).toBe('3d');
  });

  it('returns ok:false + Vietnamese message on non-geometry input', () => {
    const r = handleGenerateFigure3d({ problem: 'abc xyz' });
    expect(r.ok).toBe(false);
    expect(typeof r.message).toBe('string');
  });
});
