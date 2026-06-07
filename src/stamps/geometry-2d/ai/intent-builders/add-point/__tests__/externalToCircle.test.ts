import { buildExternalToCircle } from '../externalToCircle';
import { newState } from '../../_types';
import type { AddPointIntentT } from '../../../intent';

function intent(name: string, circle: string): AddPointIntentT {
  return { op: 'add-point', name, constraint: { kind: 'externalToCircle', circle } } as unknown as AddPointIntentT;
}

describe('buildExternalToCircle', () => {
  it('circleCR center O free at (cx,cy) radius r → A free at distance > r', () => {
    const s = newState();
    s.points.push({ name: 'O', kind: 'free', x: 1, y: 2 });
    s.pointNames.add('O');
    s.shapes.push({ name: 'k', kind: 'circleCR', center: 'O', radius: 3 });
    s.shapeNames.add('k');

    buildExternalToCircle(s, intent('A', 'k'));

    const a = s.points.find((p) => p.name === 'A');
    expect(a).toBeDefined();
    expect(a!.kind).toBe('free');
    if (a!.kind === 'free') {
      const dist = Math.hypot(a!.x - 1, a!.y - 2);
      expect(dist).toBeGreaterThan(3);
    }
  });

  it('fail-safe: circle không tồn tại → KHÔNG add point', () => {
    const s = newState();
    s.points.push({ name: 'O', kind: 'free', x: 0, y: 0 });
    s.pointNames.add('O');

    buildExternalToCircle(s, intent('A', 'k'));

    expect(s.points.find((p) => p.name === 'A')).toBeUndefined();
  });

  it('circleCP center + surfacePoint free → A free outside (distance > radius)', () => {
    const s = newState();
    // center O at origin, surface point P at (4,0) → radius 4.
    s.points.push({ name: 'O', kind: 'free', x: 0, y: 0 });
    s.pointNames.add('O');
    s.points.push({ name: 'P', kind: 'free', x: 4, y: 0 });
    s.pointNames.add('P');
    s.shapes.push({ name: 'k', kind: 'circleCP', center: 'O', surfacePoint: 'P' });
    s.shapeNames.add('k');

    buildExternalToCircle(s, intent('A', 'k'));

    const a = s.points.find((p) => p.name === 'A');
    expect(a).toBeDefined();
    if (a && a.kind === 'free') {
      const dist = Math.hypot(a.x - 0, a.y - 0);
      expect(dist).toBeGreaterThan(4);
    }
  });

  it('fail-safe: circleCR center không phải free (vd derived) → KHÔNG add point', () => {
    const s = newState();
    // center O là circumcenter (derived) → builder không biết coord → skip.
    s.points.push({ name: 'O', kind: 'circumcenter', vertices: ['X', 'Y', 'Z'] });
    s.pointNames.add('O');
    s.shapes.push({ name: 'k', kind: 'circleCR', center: 'O', radius: 3 });
    s.shapeNames.add('k');

    buildExternalToCircle(s, intent('A', 'k'));

    expect(s.points.find((p) => p.name === 'A')).toBeUndefined();
  });
});
