import { labelOpts, readLabelOffset } from '../_label';

describe('labelOpts', () => {
  it('nhãn luôn draggable (fixed:false)', () => {
    expect(labelOpts()).toEqual({ label: { fixed: false } });
  });
  it('áp default khi không có labelOffset', () => {
    expect(labelOpts(undefined, [10, 10])).toEqual({ label: { fixed: false, offset: [10, 10] } });
  });
  it('labelOffset override default', () => {
    expect(labelOpts([22, -8], [10, 10])).toEqual({ label: { fixed: false, offset: [22, -8] } });
  });
  it('không default, không labelOffset → chỉ fixed:false', () => {
    expect(labelOpts(undefined)).toEqual({ label: { fixed: false } });
  });
});

describe('readLabelOffset', () => {
  const mk = (offset: [number, number], rel: [number, number]) => ({
    evalVisProp: (k: string) => (k === 'offset' ? offset : undefined),
    relativeCoords: { scrCoords: [1, rel[0], rel[1]] },
  });
  it('chưa kéo (rel=0) → bằng offset hiện tại', () => {
    expect(readLabelOffset(mk([10, 10], [0, 0]))).toEqual([10, 10]);
  });
  it('kéo phải+xuống: x cộng rel.x, y trừ rel.y (screen-y xuống)', () => {
    // kéo 5px sang phải, 7px xuống màn hình → offset x:10+5=15, y:10-7=3
    expect(readLabelOffset(mk([10, 10], [5, 7]))).toEqual([15, 3]);
  });
  it('làm tròn', () => {
    expect(readLabelOffset(mk([10, 10], [5.4, 6.6]))).toEqual([15, 3]);
  });
  it('thiếu relativeCoords → null', () => {
    expect(readLabelOffset({ evalVisProp: () => [10, 10] } as never)).toBeNull();
  });
  it('fallback visProp.offset khi không có evalVisProp', () => {
    const lbl = { visProp: { offset: [12, 12] }, relativeCoords: { scrCoords: [1, 0, 0] } };
    expect(readLabelOffset(lbl as never)).toEqual([12, 12]);
  });
});
