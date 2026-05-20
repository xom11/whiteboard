// src/core/scene/kinds/parameter.ts
import { registerKind } from '../registry';
import type { KindDef } from '../types';

export interface ParameterAttrs {
  value: number;
  min: number;
  max: number;
  step: number;
}

const def: KindDef<ParameterAttrs> = {
  type: 'parameter',
  schemaVersion: 1,
  migrate: {},
  validate: (a) => {
    if (!a) throw new Error('parameter: attrs bắt buộc');
    if (typeof a.value !== 'number' || typeof a.min !== 'number' || typeof a.max !== 'number') {
      throw new Error('parameter: value/min/max phải là number');
    }
    if (a.min >= a.max) throw new Error('parameter: min phải < max');
    if (a.value < a.min || a.value > a.max) throw new Error('parameter: value ngoài [min, max]');
    if (typeof a.step !== 'number' || a.step <= 0) throw new Error('parameter: step phải > 0');
  },
  dependsOn: () => [],
  describe: (obj) => `${obj.label} = ${obj.attrs.value}`,
  render: () => null,           // Không render lên board
};

registerKind(def);
