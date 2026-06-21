import { tryDeterministicFigure3d } from '../tryDeterministicFigure3d';

describe('tryDeterministicFigure3d', () => {
  it('builds a pyramid + midpoint end-to-end', () => {
    const r = tryDeterministicFigure3d(
      'Cho hình chóp S.ABCD có đáy ABCD là hình vuông. Gọi M là trung điểm của BC.',
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const labels = Object.values(r.state.objects).map((o) => o.label);
      expect(labels).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D', 'S', 'M']));
    }
  });

  it('no-match on a non-geometry sentence', () => {
    const r = tryDeterministicFigure3d('Hôm nay trời đẹp quá.');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('no-match');
    }
  });

  it('tứ diện end-to-end', () => {
    const r = tryDeterministicFigure3d('Cho tứ diện ABCD. Gọi M là trung điểm của AB.');
    expect(r.ok).toBe(true);
  });
});
