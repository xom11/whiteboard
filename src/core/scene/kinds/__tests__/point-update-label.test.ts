import '../point';
import { getKind } from '../../registry';
import type { SceneObject } from '../../types';
import type { PointAttrs } from '../point-constraints/_types';

const mkObj = (labelOffset?: [number, number]): SceneObject<PointAttrs> => ({
  id: 'p1', kind: 'point', label: 'C', visible: true, locked: false, layer: '0',
  schemaVersion: 1, attrs: { constraint: { kind: 'free', x: 1, y: 2 }, labelOffset },
});

it('update hook áp label.offset qua setAttribute', () => {
  const def = getKind('point');
  const calls: Array<{ label?: unknown }> = [];
  const el = {
    setPositionDirectly: () => {},
    setAttribute: (a: { label?: unknown }) => calls.push(a),
  };
  const next = mkObj([25, -9]);
  const prev = mkObj([10, 10]);
  def.update!(next, prev, {} as never, el);
  expect(calls[0].label).toEqual({ fixed: false, offset: [25, -9] });
});
