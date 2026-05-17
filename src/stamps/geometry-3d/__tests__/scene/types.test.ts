import type { Constraint, Scene3DObject } from '../../editor/scene/types';

test('Constraint kinds are exhaustively typed', () => {
  const c1: Constraint = { kind: 'free', x: 1, y: 2, z: 3 };
  const c2: Constraint = { kind: 'onGround', x: 0, y: 0 };
  const c3: Constraint = { kind: 'onAxis', axis: 'z', t: 1.5 };
  const c4: Constraint = { kind: 'onPlane', planeId: 'p1', u: 0.5, v: 0.5 };
  const c5: Constraint = { kind: 'onLine', lineId: 'l1', t: 0.3 };
  const c6: Constraint = { kind: 'onPolygon', polygonId: 'pg1', u: 0.1, v: 0.2 };
  const c7: Constraint = { kind: 'onSphere', sphereId: 's1', theta: 0.7, phi: 1.1 };
  expect([c1, c2, c3, c4, c5, c6, c7]).toHaveLength(7);
});

test('Scene3DObject discriminates by kind', () => {
  const obj: Scene3DObject = {
    kind: 'point',
    id: 'p1',
    label: 'A',
    visible: true,
    constraint: { kind: 'onGround', x: 1, y: 2 },
  };
  expect(obj.kind).toBe('point');
});
