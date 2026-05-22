// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export type PointVsCircle = 'inside' | 'on' | 'outside';

/**
 * Classify a JXG point's position relative to a JXG circle.
 *
 * Uses a relative epsilon (max(1e-9, 1e-6 * r)) for the on-circle check so
 * that user-snapped points (which may carry tiny floating-point error)
 * register as on the circle rather than just inside/outside.
 *
 * Defensive: if either argument is null/undefined, returns 'inside' so the
 * caller will refuse to draw rather than risk a wrong tangent.
 */
export function classifyPointVsCircle(point: JxgObj, circle: JxgObj): PointVsCircle {
  if (!point || !circle || !circle.center) return 'inside';
  const dx = point.X() - circle.center.X();
  const dy = point.Y() - circle.center.Y();
  const d = Math.hypot(dx, dy);
  const r = typeof circle.Radius === 'function' ? circle.Radius() : Number(circle.radius);
  if (!Number.isFinite(d) || !Number.isFinite(r)) return 'inside';
  const eps = Math.max(1e-9, 1e-6 * r);
  if (Math.abs(d - r) <= eps) return 'on';
  return d < r ? 'inside' : 'outside';
}
