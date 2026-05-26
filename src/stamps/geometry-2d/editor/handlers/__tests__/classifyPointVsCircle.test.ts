import { classifyPointVsCircle } from '../classifyPointVsCircle';

 
function mkPoint(x: number, y: number): any {
  return { X: () => x, Y: () => y };
}

 
function mkCircle(cx: number, cy: number, r: number): any {
  return {
    center: mkPoint(cx, cy),
    Radius: () => r,
  };
}

describe('classifyPointVsCircle', () => {
  test('point strictly inside → inside', () => {
    expect(classifyPointVsCircle(mkPoint(0, 0), mkCircle(0, 0, 5))).toBe('inside');
    expect(classifyPointVsCircle(mkPoint(2, 1), mkCircle(0, 0, 5))).toBe('inside');
  });

  test('point exactly on circumference → on', () => {
    expect(classifyPointVsCircle(mkPoint(5, 0), mkCircle(0, 0, 5))).toBe('on');
    expect(classifyPointVsCircle(mkPoint(3, 4), mkCircle(0, 0, 5))).toBe('on');
  });

  test('point strictly outside → outside', () => {
    expect(classifyPointVsCircle(mkPoint(10, 0), mkCircle(0, 0, 5))).toBe('outside');
    expect(classifyPointVsCircle(mkPoint(0, 6), mkCircle(0, 0, 5))).toBe('outside');
  });

  test('within relative epsilon of circumference → on', () => {
    // r = 5, eps = max(1e-9, 5e-6). d = 5 + 1e-7 → |d-r| < eps → on
    expect(classifyPointVsCircle(mkPoint(5 + 1e-7, 0), mkCircle(0, 0, 5))).toBe('on');
  });

  test('null inputs → inside (defensive)', () => {
    expect(classifyPointVsCircle(null, mkCircle(0, 0, 5))).toBe('inside');
    expect(classifyPointVsCircle(mkPoint(0, 0), null)).toBe('inside');
  });
});
