import { buildPointOpts } from '../point-constraints/shared';
import type { SceneObject } from '../../types';
import type { PointAttrs } from '../point-constraints/_types';

const obj = (attrs: Partial<PointAttrs>): SceneObject<PointAttrs> => ({
  id: 'p1', kind: 'point', label: 'C', visible: true, locked: false, layer: '0',
  schemaVersion: 1, attrs: { constraint: { kind: 'free', x: 0, y: 0 }, ...attrs },
});

describe('buildPointOpts label', () => {
  it('không labelOffset → default [10,10], fixed:false', () => {
    const o = buildPointOpts(obj({})) as { label: unknown };
    expect(o.label).toEqual({ fixed: false, offset: [10, 10] });
  });
  it('có labelOffset → dùng nó', () => {
    const o = buildPointOpts(obj({ labelOffset: [30, -12] })) as { label: unknown };
    expect(o.label).toEqual({ fixed: false, offset: [30, -12] });
  });
});
