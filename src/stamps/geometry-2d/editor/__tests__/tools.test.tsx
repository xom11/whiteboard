import { TOOLS, GROUP_ORDER, GROUP_LABELS, letterForGroup, groupForLetter } from '../tools';

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

describe('TOOLS — Tier E.1 group expansion', () => {
  test('GROUP_ORDER có 11 entries với triangle tại index 6 + special cuối', () => {
    expect(GROUP_ORDER).toHaveLength(11);
    expect(GROUP_ORDER[6]).toBe('triangle');
    expect(GROUP_ORDER[10]).toBe('special');
  });

  test('GROUP_ORDER giữ thứ tự cũ + chèn triangle sau circle + special cuối', () => {
    expect(GROUP_ORDER).toEqual([
      'move', 'point', 'line', 'construct', 'polygon', 'circle',
      'triangle', 'measure', 'edit', 'transform', 'special',
    ]);
  });

  test('GROUP_LABELS.triangle === "Tam giác"', () => {
    expect(GROUP_LABELS.triangle).toBe('Tam giác');
  });

  test('letterForGroup(triangle) === G', () => {
    expect(letterForGroup('triangle')).toBe('G');
  });

  test('letterForGroup(transform) === J (shifted from I)', () => {
    expect(letterForGroup('transform')).toBe('J');
  });

  test('groupForLetter("G") === triangle', () => {
    expect(groupForLetter('G')).toBe('triangle');
  });
});

describe('TOOLS — Tier E.1 catalog entries', () => {
  test('perpFoot thuộc group point với accepts [point, line]', () => {
    const t = TOOLS.find((x) => x.key === 'perpFoot');
    expect(t).toBeTruthy();
    expect(t!.group).toBe('point');
    expect(t!.needs).toBe(2);
    expect(t!.accepts).toEqual(['point', 'line']);
    expect(t!.label).toBe('Chân đường vuông góc');
  });

  test('group triangle có 4 centers', () => {
    const triangleTools = TOOLS.filter((t) => t.group === 'triangle');
    expect(triangleTools.map((t) => t.key).sort()).toEqual([
      'centroid', 'circumcenter', 'incenter', 'orthocenter',
    ]);
  });

  test('4 centers đều needs 3 + accepts 3 point', () => {
    for (const k of ['centroid', 'circumcenter', 'incenter', 'orthocenter'] as const) {
      const t = TOOLS.find((x) => x.key === k)!;
      expect(t.needs).toBe(3);
      expect(t.accepts).toEqual(['point', 'point', 'point']);
    }
  });

  test('thứ tự group point: point → midpoint → perpFoot → intersect', () => {
    const pointTools = TOOLS.filter((t) => t.group === 'point').map((t) => t.key);
    expect(pointTools).toEqual(['point', 'midpoint', 'perpFoot', 'intersect']);
  });

  test('thứ tự group triangle: centroid → circumcenter → incenter → orthocenter', () => {
    const triangleTools = TOOLS.filter((t) => t.group === 'triangle').map((t) => t.key);
    expect(triangleTools).toEqual([
      'centroid', 'circumcenter', 'incenter', 'orthocenter',
    ]);
  });

  test('labels tiếng Việt đúng', () => {
    const labels: Record<string, string> = {
      perpFoot: 'Chân đường vuông góc',
      centroid: 'Trọng tâm tam giác',
      circumcenter: 'Tâm đường tròn ngoại tiếp',
      incenter: 'Tâm đường tròn nội tiếp',
      orthocenter: 'Trực tâm tam giác',
    };
    for (const [k, v] of Object.entries(labels)) {
      expect(TOOLS.find((t) => t.key === k)!.label).toBe(v);
    }
  });
});
