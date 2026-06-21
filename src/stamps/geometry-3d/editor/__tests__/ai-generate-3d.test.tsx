import { handleGenerateFigure3d } from '../../ai/handleGenerateFigure3d';

describe('3D editor AI generate', () => {
  it('handleGenerateFigure3d produces a state the editor can LOAD', () => {
    const r = handleGenerateFigure3d({
      problem: 'Cho tứ diện ABCD. Gọi M là trung điểm của AB.',
    });
    expect(r.ok).toBe(true);
    expect(r.state).toBeTruthy();
  });

  it('handleGenerateFigure3d returns ok:false with message for unrecognised input', () => {
    const r = handleGenerateFigure3d({ problem: '' });
    expect(r.ok).toBe(false);
    expect(typeof r.message).toBe('string');
  });
});
