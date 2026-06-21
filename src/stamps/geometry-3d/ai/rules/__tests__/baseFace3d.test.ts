import { parseSolidHead3D, baseFaceOf } from '../_shared';

describe('parseSolidHead3D', () => {
  it('pyramid S.ABCD → apex S, base ABCD', () => {
    expect(parseSolidHead3D('Cho hình chóp S.ABCD có đáy là hình vuông.')).toEqual({ apex: 'S', baseLabels: ['A','B','C','D'] });
  });
  it('tetrahedron ABCD → base ABCD, no apex', () => {
    expect(parseSolidHead3D('Cho tứ diện ABCD.')).toEqual({ baseLabels: ['A','B','C','D'] });
  });
  it('prism ABC.A′B′C′ → base ABC', () => {
    const r = parseSolidHead3D('Cho lăng trụ ABC.A′B′C′ đều.');
    expect(r).toEqual({ baseLabels: ['A','B','C'] });
  });
  it('no solid head → null', () => {
    expect(parseSolidHead3D('Tính khoảng cách giữa hai đường thẳng.')).toBeNull();
  });
});

describe('baseFaceOf', () => {
  it('pyramid → mp_ABC from first 3 base labels', () => {
    expect(baseFaceOf('Cho hình chóp S.ABCD có đáy ABCD là hình vuông.')).toEqual({ planeName: 'mp_ABC', p1: 'A', p2: 'B', p3: 'C' });
  });
  it('returns null when no solid head', () => {
    expect(baseFaceOf('Một mặt phẳng bất kì.')).toBeNull();
  });
});
