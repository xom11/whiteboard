import {
  GROUP_ORDER,
  GROUP_LABELS,
  TOOLS,
  letterForGroup,
  groupForLetter,
  objKind,
} from '../editor/tools';

describe('tools — chord helpers', () => {
  test('GROUP_ORDER phủ hết key trong GROUP_LABELS', () => {
    const labelKeys = Object.keys(GROUP_LABELS).sort();
    const orderCopy = [...GROUP_ORDER].sort();
    expect(orderCopy).toEqual(labelKeys);
  });

  test('GROUP_ORDER không trùng', () => {
    expect(new Set(GROUP_ORDER).size).toBe(GROUP_ORDER.length);
  });

  test('GROUP_ORDER ≤ 26 (vừa A..Z)', () => {
    expect(GROUP_ORDER.length).toBeLessThanOrEqual(26);
  });

  test('letterForGroup trả về A/B/C theo index', () => {
    expect(letterForGroup(GROUP_ORDER[0])).toBe('A');
    expect(letterForGroup(GROUP_ORDER[1])).toBe('B');
    expect(letterForGroup(GROUP_ORDER[GROUP_ORDER.length - 1])).toBe(
      String.fromCharCode(65 + GROUP_ORDER.length - 1),
    );
  });

  test('groupForLetter ánh xạ ngược (case-insensitive)', () => {
    expect(groupForLetter('A')).toBe(GROUP_ORDER[0]);
    expect(groupForLetter('a')).toBe(GROUP_ORDER[0]);
    expect(groupForLetter('b')).toBe(GROUP_ORDER[1]);
  });

  test('groupForLetter trả null cho ngoài range', () => {
    const oob = String.fromCharCode(65 + GROUP_ORDER.length);
    expect(groupForLetter(oob)).toBeNull();
    expect(groupForLetter('Z')).toBeNull();
    expect(groupForLetter('1')).toBeNull();
  });

  test('Mọi tool có group thuộc GROUP_ORDER', () => {
    for (const t of TOOLS) {
      expect(GROUP_ORDER).toContain(t.group);
    }
  });

  test('objKind: elementClass có ưu tiên cao nhất (numeric constant từ JSXGraph)', () => {
    // OBJECT_CLASS_POINT=1, OBJECT_CLASS_LINE=2, OBJECT_CLASS_CIRCLE=3
    expect(objKind({ elementClass: 1, elType: 'whatever' })).toBe('point');
    expect(objKind({ elementClass: 2, elType: 'whatever' })).toBe('line');
    expect(objKind({ elementClass: 3, elType: 'whatever' })).toBe('circle');
  });

  test('objKind: intersection point được nhận diện qua elementClass', () => {
    // Khi user tạo điểm tại giao 2 đường (handlers.create("intersection", ...)),
    // JSXGraph trả element có elType="intersection" nhưng elementClass=1 (Point).
    expect(objKind({ elementClass: 1, elType: 'intersection' })).toBe('point');
  });

  test('objKind: fallback elType cho mocks không có elementClass', () => {
    expect(objKind({ elType: 'point' })).toBe('point');
    expect(objKind({ elType: 'intersection' })).toBe('point');
    expect(objKind({ elType: 'orthogonalprojection' })).toBe('point');
    expect(objKind({ elType: 'reflection' })).toBe('point');
    expect(objKind({ elType: 'segment' })).toBe('line');
    expect(objKind({ elType: 'perpendicular' })).toBe('line');
    expect(objKind({ elType: 'circle' })).toBe('circle');
    expect(objKind({ elType: 'polygon' })).toBe('other');
  });

  test('objKind: trả "other" cho null/undefined/object trống', () => {
    expect(objKind(null)).toBe('other');
    expect(objKind(undefined)).toBe('other');
    expect(objKind({})).toBe('other');
  });

  test('Không group nào > 9 tool (vừa số 1-9)', () => {
    const counts = new Map<string, number>();
    for (const t of TOOLS) {
      counts.set(t.group, (counts.get(t.group) ?? 0) + 1);
    }
    for (const [g, n] of counts) {
      expect(n).toBeLessThanOrEqual(9);
      // sanity: ít nhất 1
      expect(n).toBeGreaterThanOrEqual(1);
      void g;
    }
  });
});
