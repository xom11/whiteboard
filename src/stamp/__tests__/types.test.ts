import { isMathStamp, type MathStampCustomData } from '../types';

describe('isMathStamp', () => {
  test('recognizes geometry stamp', () => {
    const el = { customData: { kind: 'geometry', version: 1, jsonState: '{}', svgWidth: 100, svgHeight: 100 } };
    expect(isMathStamp(el)).toBe(true);
  });

  test('recognizes latex stamp', () => {
    const el = { customData: { kind: 'latex', version: 1, src: 'x', displayMode: false } };
    expect(isMathStamp(el)).toBe(true);
  });

  test('rejects element without customData', () => {
    expect(isMathStamp({})).toBe(false);
  });

  test('rejects element with unknown kind', () => {
    expect(isMathStamp({ customData: { kind: 'other', version: 1 } })).toBe(false);
  });

  test('rejects element with mismatched version', () => {
    expect(isMathStamp({ customData: { kind: 'geometry', version: 2 } })).toBe(false);
  });

  test('narrows union type after guard', () => {
    const el: { customData?: unknown } = { customData: { kind: 'latex', version: 1, src: 'a', displayMode: false } };
    if (isMathStamp(el)) {
      const cd: MathStampCustomData = el.customData;
      expect(cd.kind).toBe('latex');
    }
  });
});
