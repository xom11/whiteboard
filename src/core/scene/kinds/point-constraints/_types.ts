// point-constraints/_types.ts
import type { RenderCtx, SceneObject, State } from '../../types';
import type { Constraint2D } from '../2d-constraint';

export type PointAttrs = {
  constraint: Constraint2D;
  color?: string;
  showLabel?: boolean;
  showValue?: boolean;
  face?: 'o' | 'circle' | 'cross' | 'plus';
  size?: number;
};

type C<K extends Constraint2D['kind']> = Extract<Constraint2D, { kind: K }>;

export interface PointConstraintModule<K extends Constraint2D['kind'] = Constraint2D['kind']> {
  kind: K;
  validate?: (c: C<K>) => void;
  describe: (obj: SceneObject<PointAttrs>, state: State | undefined, c: C<K>) => string;
  render: (obj: SceneObject<PointAttrs>, ctx: RenderCtx, c: C<K>, opts: Record<string, unknown>) => unknown;
}

/** Factory widen typed module → generic cho registry (giống defineModule). */
export function definePointConstraint<K extends Constraint2D['kind']>(
  m: PointConstraintModule<K>,
): PointConstraintModule {
  return m as unknown as PointConstraintModule;
}
