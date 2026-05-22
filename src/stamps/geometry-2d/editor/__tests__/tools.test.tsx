import { TOOLS } from '../tools';

describe('TOOLS — circle Tier 2 additions', () => {
  test('có 4 circle tool mới', () => {
    const newKeys = ['semicircle', 'arcCenter', 'arc3', 'sectorCenter'] as const;
    for (const k of newKeys) {
      const t = TOOLS.find((x) => x.key === k);
      expect(t).toBeTruthy();
      expect(t!.group).toBe('circle');
    }
  });

  test('semicircle needs 2 picks, không có accepts (lenient mode)', () => {
    const t = TOOLS.find((x) => x.key === 'semicircle')!;
    expect(t.needs).toBe(2);
    expect(t.accepts).toBeUndefined();
  });

  test('arcCenter / arc3 / sectorCenter needs 3 picks, không có accepts', () => {
    for (const k of ['arcCenter', 'arc3', 'sectorCenter'] as const) {
      const t = TOOLS.find((x) => x.key === k)!;
      expect(t.needs).toBe(3);
      expect(t.accepts).toBeUndefined();
    }
  });

  test('thứ tự circle group: circleCenter → semicircle → arcCenter → arc3 → sectorCenter → circle3 → tangent', () => {
    const circleTools = TOOLS.filter((t) => t.group === 'circle').map((t) => t.key);
    expect(circleTools).toEqual([
      'circleCenter', 'semicircle', 'arcCenter', 'arc3', 'sectorCenter', 'circle3', 'tangent',
    ]);
  });
});
