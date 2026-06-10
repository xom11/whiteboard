import { autoFitBoardToContent, fittedBboxFromBoard, isDefaultBbox } from '../autoFitBoard';
import { DEFAULT_VIEW_2D } from '../../../core/scene';

// Fake JSXGraph board: objectsList với point (elementClass 1) + circle (3).
function fakeBoard(
  points: [number, number][],
  circles: { cx: number; cy: number; r: number }[] = [],
) {
  const objectsList: unknown[] = [
    ...points.map(([x, y]) => ({ elementClass: 1, X: () => x, Y: () => y })),
    ...circles.map((c) => ({
      elementClass: 3,
      center: { X: () => c.cx, Y: () => c.cy },
      Radius: () => c.r,
    })),
  ];
  return {
    objectsList,
    setBoundingBox: jest.fn(),
    update: jest.fn(),
    fullUpdate: jest.fn(),
  };
}

describe('isDefaultBbox', () => {
  it('true cho DEFAULT_VIEW_2D.bbox', () => {
    expect(isDefaultBbox(DEFAULT_VIEW_2D.bbox)).toBe(true);
  });
  it('false cho bbox đã zoom', () => {
    expect(isDefaultBbox([-3, 3, 3, -3])).toBe(false);
  });
});

describe('fittedBboxFromBoard', () => {
  it('trả bbox bao quanh các điểm (không phải default) cho board có nội dung', () => {
    const board = fakeBoard([[0, 0], [4, 0], [2, 3]]);
    const bbox = fittedBboxFromBoard(board, 1);
    expect(bbox).not.toBeNull();
    const [xmin, ymax, xmax, ymin] = bbox!;
    // Tất cả điểm nằm trong bbox.
    expect(xmin).toBeLessThanOrEqual(0);
    expect(xmax).toBeGreaterThanOrEqual(4);
    expect(ymin).toBeLessThanOrEqual(0);
    expect(ymax).toBeGreaterThanOrEqual(3);
    // Đã thu nhỏ so với default span 20.
    expect(xmax - xmin).toBeLessThan(20);
  });

  it('trả null cho board rỗng', () => {
    expect(fittedBboxFromBoard(fakeBoard([]), 1)).toBeNull();
  });
});

describe('autoFitBoardToContent', () => {
  it('setBoundingBox với bbox fit nội dung', () => {
    const board = fakeBoard([[0, 0], [4, 0], [2, 3]]);
    autoFitBoardToContent(board, 1);
    expect(board.setBoundingBox).toHaveBeenCalledTimes(1);
    const arg = board.setBoundingBox.mock.calls[0][0];
    expect(isDefaultBbox(arg)).toBe(false);
  });

  it('KHÔNG setBoundingBox khi board rỗng', () => {
    const board = fakeBoard([]);
    autoFitBoardToContent(board, 1);
    expect(board.setBoundingBox).not.toHaveBeenCalled();
  });
});
