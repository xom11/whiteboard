import { GROUP_LABELS, GROUP_ORDER, letterForGroup } from '../tools';

test('group advanced tồn tại, label "Nâng cao", đứng cuối GROUP_ORDER', () => {
  expect(GROUP_LABELS.advanced).toBe('Nâng cao');
  expect(GROUP_ORDER[GROUP_ORDER.length - 1]).toBe('advanced');
});

test('letter chord các group cũ không đổi (point vẫn = B)', () => {
  expect(letterForGroup('point')).toBe('B');
});
